// GitHub Translate Plugin - 弹窗逻辑
const toggleEnabled = document.getElementById('toggleEnabled');
const statusText = document.getElementById('statusText');
const btnRetranslate = document.getElementById('btnRetranslate');

// 初始化状态
chrome.storage.local.get(['gt_enabled'], (result) => {
  toggleEnabled.checked = result.gt_enabled !== false;
});

// 获取当前页面翻译状态
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('https://github.com')) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusText.textContent = '未连接到 GitHub 页面';
        return;
      }
      const count = response.translatedCount || 0;
      statusText.textContent = response.enabled
        ? `已翻译 ${count} 个内容块`
        : '翻译已暂停';
    });
  } else {
    statusText.textContent = '请在 GitHub 页面使用';
    btnRetranslate.disabled = true;
  }
});

// 开关事件
toggleEnabled.addEventListener('change', () => {
  const enabled = toggleEnabled.checked;
  chrome.storage.local.set({ gt_enabled: enabled });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', enabled }, (response) => {
        if (chrome.runtime.lastError) return;
        statusText.textContent = enabled ? '翻译已启用' : '翻译已暂停';
      });
    }
  });
});

// 重新翻译按钮
btnRetranslate.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'retranslate' }, (response) => {
        if (chrome.runtime.lastError) return;
        statusText.textContent = '正在重新翻译...';
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (res) => {
            if (res) {
              statusText.textContent = `已翻译 ${res.translatedCount || 0} 个内容块`;
            }
          });
        }, 3000);
      });
    }
  });
});
