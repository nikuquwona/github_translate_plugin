// GitHub Translate Plugin - Service Worker

// 监听页面导航事件，通知 content script 重新翻译
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://github.com')) {
    chrome.storage.local.get(['gt_enabled'], (result) => {
      if (result.gt_enabled !== false) {
        chrome.tabs.sendMessage(tabId, { action: 'retranslate' }).catch(() => {
          // content script 可能尚未加载，忽略错误
        });
      }
    });
  }
});
