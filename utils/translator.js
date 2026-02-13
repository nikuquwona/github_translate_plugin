// Google Translate API 封装
const Translator = (() => {
  const CACHE_KEY = 'gt_translate_cache';
  const MAX_CACHE_SIZE = 500;
  const THROTTLE_MS = 1000;

  let lastRequestTime = 0;
  let cache = {};

  // 从 localStorage 加载缓存
  function loadCache() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        cache = JSON.parse(stored);
      }
    } catch (e) {
      cache = {};
    }
  }

  // 保存缓存到 localStorage
  function saveCache() {
    try {
      // 限制缓存大小
      const keys = Object.keys(cache);
      if (keys.length > MAX_CACHE_SIZE) {
        const toRemove = keys.slice(0, keys.length - MAX_CACHE_SIZE);
        toRemove.forEach(k => delete cache[k]);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      // 忽略存储错误
    }
  }

  // 请求节流
  async function throttle() {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < THROTTLE_MS) {
      await new Promise(resolve => setTimeout(resolve, THROTTLE_MS - elapsed));
    }
    lastRequestTime = Date.now();
  }

  // 调用 Google Translate API
  async function translate(text) {
    if (!text || !text.trim()) return '';

    const trimmed = text.trim();

    // 检查缓存
    if (cache[trimmed]) {
      return cache[trimmed];
    }

    await throttle();

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(trimmed)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Translation failed: ${res.status}`);
    }

    const data = await res.json();
    const translated = data[0].map(item => item[0]).join('');

    // 存入缓存
    cache[trimmed] = translated;
    saveCache();

    return translated;
  }

  // 批量翻译 - 合并多段文本为一次请求
  async function translateBatch(texts) {
    if (!texts || texts.length === 0) return [];

    const results = new Array(texts.length);
    const uncachedIndices = [];
    const uncachedTexts = [];

    // 先检查缓存
    texts.forEach((text, i) => {
      const trimmed = (text || '').trim();
      if (!trimmed) {
        results[i] = '';
      } else if (cache[trimmed]) {
        results[i] = cache[trimmed];
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(trimmed);
      }
    });

    if (uncachedTexts.length === 0) return results;

    // 使用分隔符合并文本，减少 API 调用
    const SEPARATOR = '\n\n---GT_SEP---\n\n';
    const combined = uncachedTexts.join(SEPARATOR);

    await throttle();

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(combined)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Translation failed: ${res.status}`);
    }

    const data = await res.json();
    const translatedCombined = data[0].map(item => item[0]).join('');

    // 按分隔符拆分翻译结果
    const translatedParts = translatedCombined.split(/---GT_SEP---/i);

    uncachedIndices.forEach((originalIndex, i) => {
      const translated = (translatedParts[i] || '').trim();
      const originalText = uncachedTexts[i];
      results[originalIndex] = translated;
      cache[originalText] = translated;
    });

    saveCache();
    return results;
  }

  loadCache();

  return { translate, translateBatch };
})();
