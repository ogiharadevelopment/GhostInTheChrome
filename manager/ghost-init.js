// 管理画面でゴーストインターフェースを初期化するスクリプト
(function() {
  console.log('[MANAGER] ゴーストインターフェース初期化スクリプト開始');
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('[MANAGER] chrome.runtimeが利用できません');
    return;
  }

  // CSSを読み込む
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('content/content.css');
  link.onload = function() {
    console.log('[MANAGER] ゴーストインターフェースCSS読み込み完了');
  };
  link.onerror = function() {
    console.error('[MANAGER] ゴーストインターフェースCSS読み込みエラー');
  };
  document.head.appendChild(link);
  
  // スクリプトを読み込む
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/content.js');
  script.onload = function() {
    console.log('[MANAGER] ゴーストインターフェーススクリプト読み込み完了');
    
    // 読み込み完了後、ゴーストインターフェースの存在を確認
    setTimeout(() => {
      checkGhostInterface();
    }, 1000);
  };
  script.onerror = function() {
    console.error('[MANAGER] ゴーストインターフェーススクリプト読み込みエラー');
  };
  document.head.appendChild(script);

  // ゴーストインターフェースの存在を確認する関数
  function checkGhostInterface() {
    const ghostInterface = document.getElementById('ghost-interface');
    const ghostMark = document.getElementById('ghost-mark');
    const ghostInterfaceInstance = window.ghostInterface;
    
    console.log('[MANAGER] ゴーストインターフェース存在確認:');
    console.log('  - ghost-interface要素:', ghostInterface ? '存在' : '不存在');
    console.log('  - ghost-mark要素:', ghostMark ? '存在' : '不存在');
    console.log('  - window.ghostInterface:', ghostInterfaceInstance ? '存在' : '不存在');
    
    if (ghostInterface) {
      console.log('  - ghost-interfaceのスタイル:', window.getComputedStyle(ghostInterface));
      console.log('  - ghost-interfaceの表示状態:', window.getComputedStyle(ghostInterface).display);
      console.log('  - ghost-interfaceのopacity:', window.getComputedStyle(ghostInterface).opacity);
    }
    
    if (ghostMark) {
      console.log('  - ghost-markのスタイル:', window.getComputedStyle(ghostMark));
      console.log('  - ghost-markの表示状態:', window.getComputedStyle(ghostMark).display);
      console.log('  - ghost-markのopacity:', window.getComputedStyle(ghostMark).opacity);
    }
    
    if (!ghostInterface || !ghostMark) {
      console.warn('[MANAGER] ゴーストインターフェースが正しく初期化されていません');
      // 再試行
      if (window.ghostInterface) {
        console.log('[MANAGER] window.ghostInterfaceが存在するため、手動で初期化を試みます');
        try {
          if (typeof window.ghostInterface.createGhostInterface === 'function') {
            window.ghostInterface.createGhostInterface();
          }
          if (typeof window.ghostInterface.createGhostMark === 'function') {
            window.ghostInterface.createGhostMark();
          }
        } catch (e) {
          console.error('[MANAGER] 手動初期化エラー:', e);
        }
      }
    } else {
      console.log('[MANAGER] ゴーストインターフェースは正常に表示されています');
    }
  }
})();

