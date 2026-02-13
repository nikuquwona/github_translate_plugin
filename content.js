// GitHub Translate Plugin - 内容脚本
(() => {
  const SELECTORS = [
    '.js-issue-title',
    '.gh-header-title .js-issue-title',
    '.comment-body',
    '.timeline-comment .comment-body',
    '.markdown-title',
    '.js-comment-body',
  ];

  const TRANSLATED_ATTR = 'data-gt-translated';
  let enabled = true;
  let translating = false;

  // 检测文本是否需要翻译（不含中文则视为需要翻译）
  function needsTranslation(text) {
    if (!text || !text.trim()) return false;
    // 如果超过 30% 是中文字符，认为不需要翻译
    const chineseChars = text.match(/[\u4e00-\u9fff]/g);
    const chineseRatio = chineseChars ? chineseChars.length / text.length : 0;
    if (chineseRatio > 0.3) return false;
    // 至少包含一些英文字母
    return /[a-zA-Z]/.test(text);
  }

  // 创建翻译结果 DOM 元素
  function createTranslatedElement(translatedText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gt-translated';
    wrapper.innerHTML = `
      <div class="gt-translated-content">${escapeHtml(translatedText)}</div>
      <div class="gt-translated-footer">
        <span class="gt-translated-badge">🌐 翻译由 Google 提供</span>
      </div>
    `;
    return wrapper;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  // 扫描并翻译目标元素
  async function scanAndTranslate(root = document) {
    if (!enabled || translating) return;

    const elements = [];
    SELECTORS.forEach(selector => {
      const nodes = root.querySelectorAll(selector);
      nodes.forEach(node => {
        if (!node.hasAttribute(TRANSLATED_ATTR) && needsTranslation(node.textContent)) {
          elements.push(node);
        }
      });
    });

    if (elements.length === 0) return;

    // 标记为正在翻译，防止重复处理
    elements.forEach(el => el.setAttribute(TRANSLATED_ATTR, 'pending'));

    // 提取文本
    const texts = elements.map(el => el.textContent.trim());

    try {
      translating = true;

      // 分批翻译，每批最多 5 个
      const BATCH_SIZE = 5;
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        if (!enabled) break;

        const batchTexts = texts.slice(i, i + BATCH_SIZE);
        const batchElements = elements.slice(i, i + BATCH_SIZE);

        const translated = await Translator.translateBatch(batchTexts);

        translated.forEach((text, j) => {
          const el = batchElements[j];
          if (text && el && el.getAttribute(TRANSLATED_ATTR) === 'pending') {
            el.setAttribute(TRANSLATED_ATTR, 'done');
            const translatedEl = createTranslatedElement(text);
            el.parentNode.insertBefore(translatedEl, el.nextSibling);
          }
        });
      }
    } catch (err) {
      console.error('[GitHub Translate]', err);
      // 重置失败的元素，以便重试
      elements.forEach(el => {
        if (el.getAttribute(TRANSLATED_ATTR) === 'pending') {
          el.removeAttribute(TRANSLATED_ATTR);
        }
      });
    } finally {
      translating = false;
    }
  }

  // 移除所有翻译
  function removeTranslations() {
    document.querySelectorAll('.gt-translated').forEach(el => el.remove());
    document.querySelectorAll(`[${TRANSLATED_ATTR}]`).forEach(el => {
      el.removeAttribute(TRANSLATED_ATTR);
    });
  }

  // 重新翻译当前页面
  function retranslate() {
    removeTranslations();
    scanAndTranslate();
  }

  // 初始化 MutationObserver 监听动态内容
  function initObserver() {
    const observer = new MutationObserver(mutations => {
      if (!enabled) return;

      let hasNewContent = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && !node.classList?.contains('gt-translated')) {
            hasNewContent = true;
            break;
          }
        }
        if (hasNewContent) break;
      }

      if (hasNewContent) {
        // 延迟执行，等待 DOM 稳定
        clearTimeout(initObserver._timer);
        initObserver._timer = setTimeout(() => scanAndTranslate(), 500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle') {
      enabled = message.enabled;
      if (enabled) {
        scanAndTranslate();
      } else {
        removeTranslations();
      }
      sendResponse({ success: true });
    } else if (message.action === 'retranslate') {
      retranslate();
      sendResponse({ success: true });
    } else if (message.action === 'getStatus') {
      const count = document.querySelectorAll('.gt-translated').length;
      sendResponse({ enabled, translatedCount: count });
    }
    return true;
  });

  // 从 storage 读取启用状态
  chrome.storage.local.get(['gt_enabled'], (result) => {
    enabled = result.gt_enabled !== false; // 默认启用
    if (enabled) {
      scanAndTranslate();
    }
  });

  // 监听 GitHub turbo 导航
  document.addEventListener('turbo:load', () => {
    if (enabled) {
      setTimeout(() => scanAndTranslate(), 300);
    }
  });

  // 监听 pjax（旧版 GitHub 导航）
  document.addEventListener('pjax:end', () => {
    if (enabled) {
      setTimeout(() => scanAndTranslate(), 300);
    }
  });

  // 初始化 DOM 观察器
  initObserver();
})();
