chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getHistory') {
    const maxResults = request.maxResults || 300;
    console.log('履歴取得要求:', maxResults, '件');
    
    chrome.history.search(
      {
      text: '',
        maxResults,
        startTime: Date.now() - 3 * 24 * 60 * 60 * 1000
      },
      (historyItems) => {
      console.log('履歴取得完了:', historyItems.length, '件');
      sendResponse(historyItems);
      }
    );

    return true;
  }
  
  if (request.action === 'getBookmarks') {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const allBookmarks = [];
      
      function traverseBookmarks(nodes) {
        nodes.forEach((node) => {
          if (node.url) {
            // タイトルが空文字列や空白のみの場合も考慮
            const originalTitle = node.title;
            const title = (node.title && node.title.trim()) ? node.title.trim() : node.url;
            
            // 最初の10個のブックマークのデータをログ出力
            if (allBookmarks.length < 10) {
              console.log('[BG][BOOKMARKS] ブックマーク取得:', {
                index: allBookmarks.length,
                originalTitle: originalTitle,
                originalTitleType: typeof originalTitle,
                originalTitleLength: originalTitle ? originalTitle.length : 0,
                finalTitle: title,
                url: node.url
              });
            }
            
            allBookmarks.push({
              id: node.id,
              title: title,
              url: node.url,
              dateAdded: node.dateAdded
            });
          } else if (node.children) {
            traverseBookmarks(node.children);
          }
        });
      }
      
      traverseBookmarks(bookmarkTreeNodes);
      console.log('[BG][BOOKMARKS] 全ブックマーク取得完了:', allBookmarks.length, '件');
      sendResponse(allBookmarks);
    });

    return true;
  }

  if (request.action === 'getRecentlyClosed') {
    const requested = request.maxResults || 20;
    const maxResults = Math.min(requested, 25);
    console.log('[BG][SESSIONS] getRecentlyClosed start', { requested, maxResults });

    chrome.sessions.getRecentlyClosed({ maxResults }, (sessions) => {
      if (chrome.runtime.lastError) {
        console.error('[BG][SESSIONS] getRecentlyClosed error', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      const items = [];

      try {
        (sessions || []).forEach((entry) => {
          const lastModified = entry.lastModified || Date.now();

          if (entry.tab && entry.tab.url) {
            const tab = entry.tab;
            if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
              items.push({
                url: tab.url,
                title: tab.title || tab.url,
                closedAt: lastModified
              });
            }
          } else if (entry.window && Array.isArray(entry.window.tabs)) {
            entry.window.tabs.forEach((tab) => {
              if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
                items.push({
                  url: tab.url,
                  title: tab.title || tab.url,
                  closedAt: lastModified
                });
              }
            });
          }
        });
      } catch (error) {
        console.error('[BG][SESSIONS] processing error', error);
      sendResponse({ success: false, error: error.message });
        return;
  }

      console.log('[BG][SESSIONS] getRecentlyClosed success', { count: items.length });
      sendResponse({ success: true, items });
    });

    return true;
  }

  if (request.action === 'updateGhostMode') {
    const newMode = request.mode;
    console.log('ゴーストモード変更要求:', newMode);
    
    chrome.storage.sync.set({ ghostMode: newMode }, () => {
      console.log('ゴーストモードを保存:', newMode);
      
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          try {
            chrome.tabs.sendMessage(
              tab.id,
              {
              action: 'ghostModeChanged',
              mode: newMode
              },
              () => {
              if (chrome.runtime.lastError) {
                console.log('タブにメッセージ送信エラー:', chrome.runtime.lastError.message);
                }
              }
            );
          } catch (error) {
            console.log('タブメッセージ送信エラー:', error);
          }
        });
      });
      
      sendResponse({ success: true, mode: newMode });
    });

    return true;
  }

  if (request.action === 'getGhostMode') {
    chrome.storage.sync.get(['ghostMode'], (result) => {
      const mode = result.ghostMode || 0;
      sendResponse({ mode });
    });

    return true;
  }

  if (request.action === 'getCurrentWindowTabs') {
    const queryOptions = sender.tab?.windowId ? { windowId: sender.tab.windowId } : { currentWindow: true };
    chrome.tabs.query(queryOptions, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('タブ取得エラー:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      const sanitized = tabs.map((tab) => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned,
        mutedInfo: tab.mutedInfo,
        windowId: tab.windowId,
        active: tab.active
      }));

      sendResponse({ success: true, tabs: sanitized });
    });

    return true;
  }

  if (request.action === 'restoreCollectionTabs') {
    const collection = request.collection;
    const closeTabIds = Array.isArray(request.closeTabIds) ? request.closeTabIds.filter(Boolean) : [];
    const requestedWindowId = typeof request.windowId === 'number' ? request.windowId : null;
    const newWindow = request.newWindow === true;

    if (!collection || !Array.isArray(collection.tabs)) {
      sendResponse({ success: false, error: 'Invalid collection data' });
      return true;
    }

    const urls = collection.tabs
      .map((tab) => tab.url)
      .filter((url) => url && !url.startsWith('chrome://'));

    if (urls.length === 0) {
      sendResponse({ success: false, error: 'No valid URLs to restore' });
      return true;
    }

    const openCollectionInWindow = (windowId) => {
      const createTabsSequentially = (index) => {
        if (index >= urls.length) {
          sendResponse({ success: true });
          return;
        }

        chrome.tabs.create(
          {
            windowId,
            url: urls[index],
            active: index === 0
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error('タブ作成エラー:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            createTabsSequentially(index + 1);
          }
        );
      };

      createTabsSequentially(0);
    };

    const startRestore = () => {
      if (newWindow) {
        // 新しいウィンドウで開く
        chrome.windows.create({ url: urls[0], focused: true }, (window) => {
          if (chrome.runtime.lastError || !window) {
            console.error('ウィンドウ作成エラー:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Failed to create window' });
            return;
          }

          if (urls.length === 1) {
            sendResponse({ success: true });
            return;
          }

          const remainingUrls = urls.slice(1);
          const createRemaining = (index) => {
            if (index >= remainingUrls.length) {
              sendResponse({ success: true });
              return;
            }

            chrome.tabs.create(
              {
                windowId: window.id,
                url: remainingUrls[index],
                active: false
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error('タブ作成エラー:', chrome.runtime.lastError);
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  return;
                }
                createRemaining(index + 1);
              }
            );
          };

          createRemaining(0);
        });
      } else {
        // 既存のウィンドウに開く
        const targetWindowId = requestedWindowId ?? sender.tab?.windowId ?? null;
        if (typeof targetWindowId === 'number') {
          openCollectionInWindow(targetWindowId);
        } else {
          chrome.windows.create({ url: urls[0], focused: true }, (window) => {
            if (chrome.runtime.lastError || !window) {
              console.error('ウィンドウ作成エラー:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Failed to create window' });
              return;
            }

            if (urls.length === 1) {
              sendResponse({ success: true });
              return;
            }

            const remainingUrls = urls.slice(1);
            const createRemaining = (index) => {
              if (index >= remainingUrls.length) {
                sendResponse({ success: true });
                return;
              }

              chrome.tabs.create(
                {
                  windowId: window.id,
                  url: remainingUrls[index],
                  active: false
                },
                () => {
                  if (chrome.runtime.lastError) {
                    console.error('タブ作成エラー:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                  }
                  createRemaining(index + 1);
                }
              );
            };

            createRemaining(0);
          });
        }
      }
    };

    if (closeTabIds.length > 0) {
      chrome.tabs.remove(closeTabIds, () => {
        if (chrome.runtime.lastError) {
          console.error('タブクローズエラー:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        startRestore();
      });
    } else {
      startRestore();
    }

    return true;
  }

  if (request.action === 'openManagerTab') {
    const managerUrl = chrome.runtime.getURL('manager/manager.html');
    const targetWindowId = typeof request.windowId === 'number' ? request.windowId : null;
    console.log('[BG] openManagerTab 開始, windowId:', targetWindowId);
    
    // 既存の管理画面タブをチェック
    chrome.tabs.query({ url: managerUrl }, (existingTabs) => {
      if (chrome.runtime.lastError) {
        console.error('[BG] openManagerTab 既存タブ検索エラー:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      // 指定されたウィンドウに既存の管理画面タブがあるかチェック
      let existingTab = null;
      if (targetWindowId !== null) {
        existingTab = existingTabs.find(tab => tab.windowId === targetWindowId);
      } else {
        // ウィンドウ指定がない場合は、最初に見つかったタブを使用
        existingTab = existingTabs.length > 0 ? existingTabs[0] : null;
      }

      if (existingTab) {
        console.log('[BG] openManagerTab 既存の管理画面タブを使用:', existingTab.id, 'windowId:', existingTab.windowId);
        // 既存のタブを先頭に移動し、ピン留めにする
        chrome.tabs.move(existingTab.id, { index: 0 }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[BG] openManagerTab タブ移動エラー（無視）:', chrome.runtime.lastError);
          }
          // タブをピン留めにしてアクティブにする
          chrome.tabs.update(existingTab.id, { pinned: true, active: true }, () => {
            if (chrome.runtime.lastError) {
              console.warn('[BG] openManagerTab タブ更新エラー（無視）:', chrome.runtime.lastError);
            }
            sendResponse({ success: true, tabId: existingTab.id, windowId: existingTab.windowId, existing: true });
          });
        });
        return;
      }

      // 新しいタブを作成
      const createOptions = { url: managerUrl, pinned: true };
      if (targetWindowId !== null) {
        createOptions.windowId = targetWindowId;
      }

      chrome.tabs.create(createOptions, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('[BG] openManagerTab エラー:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[BG] openManagerTab 成功:', tab.id, 'windowId:', tab.windowId);
          sendResponse({ success: true, tabId: tab.id, windowId: tab.windowId, existing: false });
        }
      });
    });
    return true;
  }

  if (request.action === 'openManagerAndCloseTabs') {
    const tabIdsToClose = Array.isArray(request.tabIdsToClose) ? request.tabIdsToClose.filter(Boolean) : [];
    const managerUrl = chrome.runtime.getURL('manager/manager.html');
    console.log('[BG] openManagerAndCloseTabs 開始, 閉じるタブ数:', tabIdsToClose.length);
    
    // まず閉じるタブのウィンドウIDを取得
    let targetWindowId = null;
    if (tabIdsToClose.length > 0) {
      chrome.tabs.get(tabIdsToClose[0], (tab) => {
        if (!chrome.runtime.lastError && tab) {
          targetWindowId = tab.windowId;
          console.log('[BG] openManagerAndCloseTabs ターゲットウィンドウID:', targetWindowId);
        } else {
          console.warn('[BG] openManagerAndCloseTabs ウィンドウID取得失敗:', chrome.runtime.lastError);
        }
        proceedWithManagerTab();
      });
    } else {
      proceedWithManagerTab();
    }

    function proceedWithManagerTab() {
      // 既存の管理画面タブをチェック
      chrome.tabs.query({ url: managerUrl }, (existingTabs) => {
        if (chrome.runtime.lastError) {
          console.error('[BG] openManagerAndCloseTabs 既存タブ検索エラー:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        console.log('[BG] openManagerAndCloseTabs 既存の管理画面タブ数:', existingTabs.length);

        // 指定されたウィンドウに既存の管理画面タブがあるかチェック
        let existingTab = null;
        if (targetWindowId !== null) {
          existingTab = existingTabs.find(tab => tab.windowId === targetWindowId);
        } else {
          // ウィンドウ指定がない場合は、最初に見つかったタブを使用
          existingTab = existingTabs.length > 0 ? existingTabs[0] : null;
        }

        if (existingTab) {
          console.log('[BG] openManagerAndCloseTabs 既存の管理画面タブを使用:', existingTab.id, 'windowId:', existingTab.windowId);
          // 既存のタブを先頭に移動し、ピン留めにする
          chrome.tabs.move(existingTab.id, { index: 0 }, () => {
            if (chrome.runtime.lastError) {
              console.warn('[BG] openManagerAndCloseTabs タブ移動エラー（無視）:', chrome.runtime.lastError);
            }
            // タブをピン留めにしてアクティブにする
            chrome.tabs.update(existingTab.id, { pinned: true, active: true }, () => {
              if (chrome.runtime.lastError) {
                console.warn('[BG] openManagerAndCloseTabs タブ更新エラー（無視）:', chrome.runtime.lastError);
              }
              
              // 管理画面タブを除外してから閉じる
              const tabsToCloseFiltered = tabIdsToClose.filter(id => id !== existingTab.id);
              console.log('[BG] openManagerAndCloseTabs 実際に閉じるタブ数:', tabsToCloseFiltered.length);
              
              if (tabsToCloseFiltered.length > 0) {
                // 右から閉じるため、インデックスが大きい順にソートしてから閉じる
                chrome.tabs.query({ windowId: existingTab.windowId }, (allTabs) => {
                  if (chrome.runtime.lastError) {
                    console.error('[BG] openManagerAndCloseTabs タブ取得エラー:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                  }

                  // 閉じるタブをインデックス順にソート（大きい順 = 右から）
                  // 管理画面以外のタブは、ピン留めでも閉じる
                  const managerUrl = chrome.runtime.getURL('manager/manager.html');
                  const tabsToCloseWithIndex = allTabs
                    .filter(tab => {
                      // 管理画面タブは除外
                      if (tab.url === managerUrl) return false;
                      // 閉じるリストに含まれているタブ
                      return tabsToCloseFiltered.includes(tab.id);
                    })
                    .sort((a, b) => (b.index || 0) - (a.index || 0));
                  
                  const sortedTabIdsToClose = tabsToCloseWithIndex.map(tab => tab.id);
                  console.log('[BG] openManagerAndCloseTabs 右から閉じる順序:', sortedTabIdsToClose.map((id, i) => {
                    const tab = tabsToCloseWithIndex[i];
                    return `id:${id}, index:${tab.index}`;
                  }));

                  // 右から順に閉じる（1つずつ閉じることで確実に処理）
                  let closeIndex = 0;
                  const closeNextTab = () => {
                    if (closeIndex >= sortedTabIdsToClose.length) {
                      console.log('[BG] openManagerAndCloseTabs 完了: タブを閉じて既存の管理画面を使用');
                      sendResponse({ success: true, managerTabId: existingTab.id, existing: true });
                      return;
                    }

                    const tabIdToClose = sortedTabIdsToClose[closeIndex];
                    chrome.tabs.remove(tabIdToClose, () => {
                      if (chrome.runtime.lastError) {
                        console.error('[BG] openManagerAndCloseTabs タブクローズエラー:', chrome.runtime.lastError, 'tabId:', tabIdToClose);
                        // エラーでも続行
                      } else {
                        console.log('[BG] openManagerAndCloseTabs タブを閉じました:', tabIdToClose);
                      }
                      closeIndex++;
                      setTimeout(closeNextTab, 50); // 50ms間隔で次のタブを閉じる
                    });
                  };

                  closeNextTab();
                });
              } else {
                console.log('[BG] openManagerAndCloseTabs 完了: 既存の管理画面を使用（閉じるタブなし）');
                sendResponse({ success: true, managerTabId: existingTab.id, existing: true });
              }
            });
          });
          return;
        }

        // 新しいタブを作成（先に管理画面を開く）
        const createOptions = { url: managerUrl, pinned: true, index: 0 }; // インデックス0に配置
        if (targetWindowId !== null) {
          createOptions.windowId = targetWindowId;
        }

        console.log('[BG] openManagerAndCloseTabs 管理画面を新規作成, windowId:', targetWindowId, 'index: 0');

        chrome.tabs.create(createOptions, (managerTab) => {
          if (chrome.runtime.lastError) {
            console.error('[BG] openManagerAndCloseTabs 管理画面開封エラー:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }

          console.log('[BG] openManagerAndCloseTabs 管理画面を開きました:', managerTab.id, 'windowId:', managerTab.windowId, 'index:', managerTab.index);

          // 管理画面タブを除外してから閉じる
          const tabsToCloseFiltered = tabIdsToClose.filter(id => id !== managerTab.id);
          console.log('[BG] openManagerAndCloseTabs 実際に閉じるタブ数:', tabsToCloseFiltered.length);

          if (tabsToCloseFiltered.length > 0) {
            // 右から閉じるため、インデックスが大きい順にソートしてから閉じる
            chrome.tabs.query({ windowId: managerTab.windowId }, (allTabs) => {
              if (chrome.runtime.lastError) {
                console.error('[BG] openManagerAndCloseTabs タブ取得エラー:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
              }

              // 閉じるタブをインデックス順にソート（大きい順 = 右から）
              // 管理画面以外のタブは、ピン留めでも閉じる
              const managerUrl = chrome.runtime.getURL('manager/manager.html');
              const tabsToCloseWithIndex = allTabs
                .filter(tab => {
                  // 管理画面タブは除外
                  if (tab.url === managerUrl) return false;
                  // 閉じるリストに含まれているタブ
                  return tabsToCloseFiltered.includes(tab.id);
                })
                .sort((a, b) => (b.index || 0) - (a.index || 0));
              
              const sortedTabIdsToClose = tabsToCloseWithIndex.map(tab => tab.id);
              console.log('[BG] openManagerAndCloseTabs 右から閉じる順序:', sortedTabIdsToClose.map((id, i) => {
                const tab = tabsToCloseWithIndex[i];
                return `id:${id}, index:${tab.index}`;
              }));

              // 少し待ってからタブを閉じる（管理画面の読み込みを待つ）
              setTimeout(() => {
                // 右から順に閉じる（1つずつ閉じることで確実に処理）
                let closeIndex = 0;
                const closeNextTab = () => {
                  if (closeIndex >= sortedTabIdsToClose.length) {
                    console.log('[BG] openManagerAndCloseTabs 完了: タブを閉じて管理画面を開きました');
                    sendResponse({ success: true, managerTabId: managerTab.id, existing: false });
                    return;
                  }

                  const tabIdToClose = sortedTabIdsToClose[closeIndex];
                  chrome.tabs.remove(tabIdToClose, () => {
                    if (chrome.runtime.lastError) {
                      console.error('[BG] openManagerAndCloseTabs タブクローズエラー:', chrome.runtime.lastError, 'tabId:', tabIdToClose);
                      // エラーでも続行
                    } else {
                      console.log('[BG] openManagerAndCloseTabs タブを閉じました:', tabIdToClose);
                    }
                    closeIndex++;
                    setTimeout(closeNextTab, 50); // 50ms間隔で次のタブを閉じる
                  });
                };

                closeNextTab();
              }, 100);
            });
          } else {
            console.log('[BG] openManagerAndCloseTabs 完了: 閉じるタブなし、管理画面のみ開きました');
            sendResponse({ success: true, managerTabId: managerTab.id, existing: false });
          }
        });
      });
    }
    return true;
  }

  if (request.action === 'createNewWindowWithManager') {
    const managerUrl = request.url || chrome.runtime.getURL('manager/manager.html');
    console.log('[BG] createNewWindowWithManager 開始');
    
    // 既存の管理画面タブをチェック
    chrome.tabs.query({ url: managerUrl }, (existingTabs) => {
      if (chrome.runtime.lastError) {
        console.error('[BG] createNewWindowWithManager 既存タブ検索エラー:', chrome.runtime.lastError);
        // エラーでも続行
      }

      // 新しいウィンドウを作成（最初のタブとして管理画面を開く）
      chrome.windows.create({ url: managerUrl, focused: true }, (window) => {
        if (chrome.runtime.lastError || !window) {
          console.error('[BG] createNewWindowWithManager ウィンドウ作成エラー:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Failed to create window' });
          return;
        }

        console.log('[BG] createNewWindowWithManager 新しいウィンドウを作成:', window.id);

        // ウィンドウ内の最初のタブ（管理画面）をピン留め
        chrome.tabs.query({ windowId: window.id, index: 0 }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { pinned: true }, () => {
              if (chrome.runtime.lastError) {
                console.error('[BG] createNewWindowWithManager ピン留めエラー:', chrome.runtime.lastError);
              } else {
                console.log('[BG] createNewWindowWithManager 管理画面をピン留めしました');
              }
              sendResponse({ success: true, windowId: window.id, tabId: tabs[0].id });
            });
          } else {
            sendResponse({ success: true, windowId: window.id });
          }
        });
      });
    });
    return true;
  }

  if (request.action === 'checkManagerTabExists') {
    const managerUrl = chrome.runtime.getURL('manager/manager.html');
    chrome.tabs.query({ url: managerUrl }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('[BG] checkManagerTabExists エラー:', chrome.runtime.lastError);
        sendResponse({ exists: false });
      } else {
        const exists = tabs.length > 0;
        console.log('[BG] checkManagerTabExists 結果:', exists, 'タブ数:', tabs.length);
        sendResponse({ exists: exists, tabIds: tabs.map(t => t.id) });
      }
    });
    return true;
  }

  if (request.action === 'closeTabs') {
    const tabIds = Array.isArray(request.tabIds) ? request.tabIds.filter(Boolean) : [];
    console.log('[BG] closeTabs 開始, タブ数:', tabIds.length);
    if (tabIds.length === 0) {
      sendResponse({ success: true });
      return true;
    }
    chrome.tabs.remove(tabIds, () => {
      if (chrome.runtime.lastError) {
        console.error('[BG] closeTabs エラー:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[BG] closeTabs 完了');
        sendResponse({ success: true });
      }
    });
    return true;
  }
}); 

chrome.action.onClicked.addListener(() => {
  const managerUrl = chrome.runtime.getURL('manager/manager.html');
  chrome.tabs.create({ url: managerUrl });
}); 