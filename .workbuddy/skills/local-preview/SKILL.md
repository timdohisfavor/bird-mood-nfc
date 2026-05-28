---
name: local-preview
description: nfc-iphone-m-m-nfc-m 项目本地预览启动流程。触发：启动预览、打开H5、预览页面、本地测试。
agent_created: true
---

# 本地预览 — 标准操作流程

## 黄金规则

**永远不要用 `file://` 协议双击打开 HTML。** 必须用 HTTP 服务。

## 启动预览

```bash
cd /Users/Admin/Downloads/Codex/2026-05-07/nfc-iphone-m-m-nfc-m
npm run serve:dist
# → http://127.0.0.1:4180/
```

如果 4180 端口被占：
```bash
lsof -ti :4180 | xargs kill -9
npm run serve:dist
```

## 预览后第一次检查（必须做）

```
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4180/
# 必须返回 200
```

## 修改代码后的验证流程

1. **改代码前**：先 `npm run serve:dist` 启动预览，刷新浏览器看当前状态
2. **改 CSS**：修改 `styles.css` → `npm run build:fast` → 刷新浏览器
3. **改 JS/HTML**：修改源文件 → `npm run build:fast` → 刷新浏览器  
4. **每次构建后必须验证**：`npm run check:dist`
5. **关键节点必须 commit**：`git add -A && git commit -m "描述"`

构建快路径：
```bash
npm run build:fast
# 等价于: node scripts/export_h5_birds.mjs && node scripts/build_dist.mjs && node scripts/check_dist_publish.mjs
```

## 常见报错及修复

| 现象 | 原因 | 修复 |
|------|------|------|
| 页面白屏、CSS不加载 | `base href="/"` 在 file:// 下失效 | 用 HTTP 服务打开，不要双击 HTML |
| `fetch` 报错 | file:// 不支持 fetch | `script.js` 中 `loadBirds()` 优先用 `embeddedBirds` |
| `Cannot read properties of null` | DOM 元素未渲染就访问 | 检查 HTML 元素 ID 是否匹配，确认 `cacheElements()` 选择器正确 |
| `SyntaxError` | 编辑 JS 时括号不匹配 | 每次改完 JS 必须运行语法检查：`node -e "new Function(require('fs').readFileSync('dist/script.js','utf8'))"` |
| `dist/` 构建后样式不对 | 只改了 `dist/` 没改源文件 | 源文件是根目录的 `index.html` / `styles.css` / `script.js`，dist 由 build 脚本自动从源文件复制生成 |
| 端口 4180 被占用 | 上次服务未正常关闭 | `lsof -ti :4180 \| xargs kill -9` |

## 项目源文件映射

| dist/ 文件 | 源文件（修改这里） | 复制方式 |
|-----------|-------------------|---------|
| `dist/index.html` | `index.html` | 直接复制 |
| `dist/styles.css` | `styles.css` | 直接复制 |
| `dist/script.js` | `script.js` | 直接复制 |
| `dist/web/assets/meta/birds.json` | `web/assets/meta/birds.json` | `export_h5_birds.mjs` 导出 |
| `dist/web/assets/meta/birds-data.js` | `web/assets/meta/birds-data.js` | 直接复制 |
| `dist/assets/birds-final/` | `assets/birds-final/` | 直接复制 |
| `dist/assets/birds-final-webp/` | `assets/birds-final-webp/` | 直接复制 |
| `dist/assets/bird-calls/` | `assets/bird-calls/` | 直接复制 |
| `dist/assets/backgrounds/` | `assets/backgrounds/` | 直接复制 |
