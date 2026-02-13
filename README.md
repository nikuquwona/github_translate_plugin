# GitHub Translate Plugin

自动翻译 GitHub Issue、Pull Request、Discussion 中的英文内容为中文的 Chrome 浏览器扩展。

翻译内容以引用样式追加在原文下方，不覆盖原文。

## 功能

- 自动检测并翻译英文内容（Issue/PR 标题、描述、评论）
- 翻译追加显示在原文下方，不影响原始内容
- 支持 GitHub SPA 页面导航，动态加载内容自动翻译
- Popup 弹窗控制：启用/禁用翻译、重新翻译当前页面
- 请求节流 + 本地缓存 + 批量翻译，减少 API 调用
- 适配 GitHub 深色模式

## 安装

1. 下载或克隆本仓库
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本项目目录
5. 访问任意 GitHub Issue/PR 页面，英文内容将自动翻译

## 使用

- 扩展默认启用，打开 GitHub 页面后自动翻译英文内容
- 点击工具栏扩展图标可打开设置弹窗：
  - 开关控制启用/禁用翻译
  - 「重新翻译当前页面」按钮可手动触发翻译
- 翻译结果会缓存在本地，相同内容不会重复请求

## 技术实现

- Chrome Extension Manifest V3
- Google Translate 免费 API（`translate.googleapis.com`）
- MutationObserver 监听 DOM 变化
- `turbo:load` / `pjax:end` 事件监听 GitHub SPA 导航
