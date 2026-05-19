# 今日鸟签 NFC — Project Guide

## Overview
A daily "bird mood sign" app — dual-platform: WeChat Mini Program + H5 web preview.
Users draw a bird card each day that describes their mental state.

## Tech Stack
- **WeChat Mini Program** — `app.js`/`app.json`/`app.wxss` + `pages/index/` (原生框架)
- **H5 Web** — Vanilla HTML/CSS/JS (ES Modules), no frameworks
- **Node.js** — Build/export scripts (`scripts/*.mjs`)
- **Python 3 + Pillow** — Bird image generation & processing
- **Netlify** — H5 deployment (`netlify.toml`)

## Project Structure
```
.
├── app.js / app.json / app.wxss     # 小程序入口
├── pages/index/                      # 小程序页面
│   ├── index.js                      # 核心数据源 (rawBirds 30只鸟)
│   ├── index.wxml                    # 模板
│   ├── index.wxss                    # 样式 (含程序化鸟形 CSS)
│   └── index.json                    # 页面配置
├── index.html / script.js / styles.css  # H5 根目录版本
├── web/                              # H5 独立版本
│   ├── index.html / app.js / styles.css
│   └── assets/meta/birds.json        # H5 鸟数据 (从小程序导出)
├── assets/                           # 鸟图资源 (多格式/多版本)
│   ├── birds-final/                  # 最终 PNG (720x720)
│   ├── birds-final-webp/             # WebP 压缩版
│   └── birds-final-svg/             # SVG 包装 (Figma)
├── scripts/                          # 构建 & 资源处理脚本
│   ├── export_h5_birds.mjs           # 提取小鸟数据 -> birds.json
│   ├── convert_bird_webp.mjs         # PNG -> WebP (ImageMagick)
│   ├── generate_bird_pngs.py         # Python 生成鸟图
│   ├── split_final_bird_assets.py    # 拆分 contact sheet
│   ├── replace_two_bird_assets.py    # 替换特定鸟图
│   └── rebuild_figma_sync_chunks.py  # 重建 Figma 同步块
├── dist/                             # Netlify 构建输出
├── docs/                             # 设计 & 开发文档
└── package.json                      # npm scripts
```

## Key Conventions
- **数据源**: `pages/index/index.js` 中的 `rawBirds` 数组是 30 只鸟的权威数据源
- **鸟数据结构**: `{ id, rank, name, heat, rarity, look, palette[6], featureClass, line, quote, fish, social, meeting }`
- **CSS 鸟形渲染**: 小程序用 `featureClass` + CSS classes 程序化绘制鸟形；H5 仅用预渲染 PNG/WebP
- **存储**: 小程序用 `wx.getStorageSync`，H5 用 `localStorage`
- **NFC**: URL 参数 `?tag=` 或路径 `/nfc/{tag}` 检测 NFC 标签
- **每日一签**: 按日期 key 持久化，同一设备每天固定一签
- **构建**: `npm run build` -> 转换 WebP、导出 H5 数据、组装 `dist/`

## npm Scripts
| Command | Description |
|---|---|
| `npm run build` | Full build (webp + h5-data + dist) |
| `npm run serve` | Serve root H5 on :4173 |
| `npm run serve:web` | Serve web/ H5 on :4174 |
| `npm run assets:webp` | PNG -> WebP conversion |
| `npm run export:h5-data` | Export birds.json from Mini Program source |
| `npm run assets:generate` | Generate bird PNGs via Python |
| `npm run assets:split-final` | Split contact sheets into individual assets |

## Environment
- Node >= 20
- Python 3 with Pillow (see requirements.txt)
- ImageMagick for WebP conversion
