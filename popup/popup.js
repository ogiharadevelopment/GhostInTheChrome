// 多言語化対応のためのメッセージ取得関数
function getMessage(messageKey) {
  return chrome.i18n.getMessage(messageKey) || messageKey;
}

// 拡張機能の状態を管理するクラス
class ExtensionManager {
  constructor() {
    this.isEnabled = false;
    this.autoOpenOnHover = false;
    this.init();
  }

  async init() {
    await this.loadState();
    await this.loadTheme();
    await this.loadAutoOpenOnHover();
    this.updateUI();
    this.setupEventListeners();
    this.setupI18n();
  }

  applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  async loadTheme() {
    try {
      const result = await chrome.storage.sync.get(['darkMode']);
      const isDark = result.darkMode === true;
      this.applyTheme(isDark);
      this.updateDarkModeToggle(isDark);
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  }

  updateDarkModeToggle(isDark) {
    const toggle = document.getElementById('darkModeToggle');
    const toggleText = document.getElementById('darkModeText');
    if (toggle) {
      toggle.checked = isDark;
    }
    if (toggleText) {
      toggleText.textContent = isDark ? getMessage('popupDarkModeOn') || 'ON' : getMessage('popupDarkModeOff') || 'OFF';
    }
  }

  async toggleDarkMode() {
    try {
      const result = await chrome.storage.sync.get(['darkMode']);
      const currentDarkMode = result.darkMode === true;
      const newDarkMode = !currentDarkMode;
      
      await chrome.storage.sync.set({ darkMode: newDarkMode });
      this.applyTheme(newDarkMode);
      this.updateDarkModeToggle(newDarkMode);
    } catch (error) {
      console.error('Failed to toggle dark mode:', error);
    }
  }

  async loadAutoOpenOnHover() {
    try {
      const result = await chrome.storage.sync.get(['autoOpenOnHover']);
      this.autoOpenOnHover = result.autoOpenOnHover === true;
      this.updateAutoOpenOnHoverToggle(this.autoOpenOnHover);
    } catch (error) {
      console.error('Failed to load autoOpenOnHover:', error);
    }
  }

  updateAutoOpenOnHoverToggle(isEnabled) {
    const toggle = document.getElementById('autoOpenOnHoverToggle');
    const toggleText = document.getElementById('autoOpenOnHoverText');
    if (toggle) {
      toggle.checked = isEnabled;
    }
    if (toggleText) {
      toggleText.textContent = isEnabled ? getMessage('popupAutoOpenOnHoverOn') || 'ON' : getMessage('popupAutoOpenOnHoverOff') || 'OFF';
    }
  }

  async toggleAutoOpenOnHover() {
    try {
      this.autoOpenOnHover = !this.autoOpenOnHover;
      await chrome.storage.sync.set({ autoOpenOnHover: this.autoOpenOnHover });
      this.updateAutoOpenOnHoverToggle(this.autoOpenOnHover);
    } catch (error) {
      console.error('Failed to toggle autoOpenOnHover:', error);
    }
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

    // ダークモードトグル
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', () => {
        this.toggleDarkMode();
      });
    }

    // マウスオーバー自動表示トグル
    const autoOpenOnHoverToggle = document.getElementById('autoOpenOnHoverToggle');
    if (autoOpenOnHoverToggle) {
      autoOpenOnHoverToggle.addEventListener('change', () => {
        this.toggleAutoOpenOnHover();
      });
    }
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