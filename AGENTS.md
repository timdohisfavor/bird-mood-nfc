@/Users/Admin/Downloads/Codex/2026-05-07/nfc-iphone-m-m-nfc-m/docs/codex-execution-playbook.md

# 今日鸟签 NFC — Project Guide

## Overview
A daily "bird mood sign" app — H5-first web experience.
Users draw a bird card each day that describes their mental state.

## Tech Stack
- **H5 Web** — Vanilla HTML/CSS/JS (ES Modules), no frameworks
- **Node.js** — Build/export scripts (`scripts/*.mjs`)
- **Python 3 + Pillow** — Bird image generation & processing
- **Aliyun Hong Kong ECS + Nginx** — current H5 deployment for `https://nfc.joyibird.cn/`

## Project Structure
```
.
├── index.html / script.js / styles.css  # H5 入口
├── data/birds-source.json            # 鸟类权威数据源
├── assets/                           # 鸟图资源 (多格式/多版本)
│   ├── birds-final/                  # 最终 PNG (720x720)
│   ├── birds-final-webp/             # WebP 压缩版
│   ├── meta/birds.json               # H5 运行数据
│   └── birds-final-svg/             # SVG 包装 (Figma)
├── scripts/                          # 构建 & 资源处理脚本
│   ├── export_h5_birds.mjs           # data/birds-source.json -> assets/meta/birds.json
│   ├── convert_bird_webp.mjs         # PNG -> WebP (ImageMagick)
│   ├── generate_bird_pngs.py         # Python 生成鸟图
│   ├── split_final_bird_assets.py    # 拆分 contact sheet
│   ├── replace_two_bird_assets.py    # 替换特定鸟图
│   └── rebuild_figma_sync_chunks.py  # 重建 Figma 同步块
├── dist/                             # 生产静态构建输出
├── docs/                             # 设计 & 开发文档
└── package.json                      # npm scripts
```

## Key Conventions
- **数据源**: `data/birds-source.json` 是鸟类权威数据源
- **鸟数据结构**: `{ id, rank, name, heat, rarity, look, palette[6], featureClass, line, quote, fish, social, meeting }`
- **图片渲染**: H5 使用预渲染 PNG/WebP，不在前端手绘复杂鸟类图形
- **存储**: H5 用 `localStorage`
- **NFC**: URL 参数 `?tag=` 或路径 `/nfc/{tag}` 检测 NFC 标签
- **每日一签**: 按日期 key 持久化，同一设备每天固定一签
- **构建**: `npm run build` -> 转换 WebP、导出 H5 数据、组装 `dist/`
- **当前线上域名**: `https://nfc.joyibird.cn/`；项目已从 Netlify 迁移到自有域名 + 阿里云香港 ECS，后续默认不要再按 Netlify 发布路径处理。
- **线上静态目录**: 阿里云香港 ECS 的 Nginx 站点目录为 `/var/www/joyibird-nfc`，发布前先本地构建并预览，用户确认后再同步 `dist/`。
- **鸟图资产更新**: 新增或替换鸟图时，必须按现有资产规格交付：720x720、真实透明 alpha、无背景/树枝/场景元素，并同步 PNG、WebP、H5 数据和 `dist/` 构建结果；不能只生成预览图。
- **H5 验证**: 改动 H5 后至少运行 `npm run build` 并自动启用本地预览，打开相关本地页面/哈希路由验证；遇到本地无法加载、502、拒绝连接时，先检查 dev server、端口占用、`http_proxy`/`https_proxy` 和 `no_proxy`，再判断是否是应用代码问题。
- **H5 预览习惯**: 每次完成 H5 相关改动后，默认启动/复用 `npm run serve` 的本地服务，并用内置浏览器打开预览页面给用户确认。
- **派生字段**: H5 展示字段如 `habitat`、图鉴数量、音频路径等应由权威数据源或导出脚本统一生成；前端不要用临时兜底文案静默掩盖缺失数据，缺字段应尽早暴露。

## npm Scripts
| Command | Description |
|---|---|
| `npm run build` | Full build (webp + h5-data + dist) |
| `npm run serve` | Serve root H5 on :4173 |
| `npm run assets:webp` | PNG -> WebP conversion |
| `npm run export:h5-data` | Export assets/meta/birds.json from data/birds-source.json |
| `npm run assets:generate` | Generate bird PNGs via Python |
| `npm run assets:split-final` | Split contact sheets into individual assets |

## Environment
- Node >= 20
- Python 3 with Pillow (see requirements.txt)
- ImageMagick for WebP conversion
