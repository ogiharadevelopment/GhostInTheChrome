// 多言語化対応のためのメッセージ取得関数
function getMessage(messageKey) {
  return chrome.i18n.getMessage(messageKey) || messageKey;
}

// 拡張機能の状態を管理するクラス
class ExtensionManager {
  constructor() {
    this.isEnabled = false;
    this.init();
  }

  async init() {
    await this.loadState();
    this.updateUI();
    this.setupEventListeners();
    this.setupI18n();
  }

  async loadState() {
    try {
      const result = await chrome.storage.local.get(['extensionEnabled']);
      this.isEnabled = result.extensionEnabled !== false; // デフォルトは有効
    } catch (error) {
      console.error('Failed to load extension state:', error);
      this.isEnabled = true; // エラー時は有効にする
    }
  }

  async saveState() {
    try {
      await chrome.storage.local.set({ extensionEnabled: this.isEnabled });
    } catch (error) {
      console.error('Failed to save extension state:', error);
    }
  }

  async toggleExtension() {
    this.isEnabled = !this.isEnabled;
    await this.saveState();
    this.updateUI();
    
    // コンテンツスクリプトに状態変更を通知
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleExtension',
          enabled: this.isEnabled
        });
      }
    } catch (error) {
      console.log('Could not send message to content script:', error);
    }
  }

  updateUI() {
    const statusText = document.getElementById('statusText');
    const toggleButton = document.getElementById('toggleExtension');
    const toggleButtonText = toggleButton.querySelector('span');

    if (this.isEnabled) {
      statusText.textContent = getMessage('popupStatusEnabled');
      statusText.className = 'status-value enabled';
      toggleButtonText.textContent = getMessage('popupDisable');
      toggleButton.className = 'toggle-btn';
    } else {
      statusText.textContent = getMessage('popupStatusDisabled');
      statusText.className = 'status-value disabled';
      toggleButtonText.textContent = getMessage('popupEnable');
      toggleButton.className = 'toggle-btn disabled';
    }
  }

  setupEventListeners() {
    // 拡張機能のオンオフボタン
    document.getElementById('toggleExtension').addEventListener('click', () => {
      this.toggleExtension();
    });

    // 設定ページを開くボタン
    document.getElementById('openOptions').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  setupI18n() {
    // 多言語化対応のテキストを設定
    const elements = document.querySelectorAll('[data-message]');
    elements.forEach(element => {
      const messageKey = element.getAttribute('data-message');
      if (messageKey) {
        element.textContent = getMessage(messageKey);
      }
    });
  }
}

// ページ読み込み時に拡張機能マネージャーを初期化
document.addEventListener('DOMContentLoaded', () => {
  new ExtensionManager();
}); 