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

## Release Lessons: 2026-06-17 Birds 35-38

- **正式地址保持干净**: 对外和 NFC 只使用 `https://nfc.joyibird.cn`。`?v=...` 仅用于本地/线上缓存验证，不能当成正式地址或写入 NFC。
- **Service Worker 缓存会误导预览**: 如果改了入口 JS/CSS 后页面仍显示旧逻辑，优先怀疑 service worker 缓存。必要时更换版本化文件名，例如 `script-YYYYMMDD-xxx.js`，并同步更新 `index.html`、`sw.js`、`scripts/build_dist.mjs`、`scripts/check_dist_publish.mjs`。
- **换端口验证缓存问题**: 当某个本地端口被旧 service worker 污染时，直接启用新端口做干净验证，不要在旧端口反复判断应用逻辑。
- **详情长图不要依赖 DOM 截图**: `html2canvas` 可能不报错但生成错位废图，catch 兜底不会触发。详情页“保存到相册”应走稳定 canvas 绘制；如果后续改动分享长图，必须实际保存图片检查尺寸、排版、鸟图裁切、档案区和鸟鸣区。
- **首页海报和详情长图分开处理**: 首页海报可以继续使用 DOM 截图，但详情长图要求完整长图结构，不要为了复用而把两条路径混在一起。
- **首页海报保存也要警惕 html2canvas**: 如果用户反馈“调起分享面板慢/无反应”或生成图变成简化样式，通常是 DOM 截图慢或掉入 fallback。优先改成稳定 canvas 海报，并用旧版海报截图对齐尺寸、纹理、鸟图大小、签文卡片和小红书 logo。
- **canvas 复刻要检查完整视觉**: 长图画布不是“信息都在”就算完成。必须对齐旧版格子布局、状态蒙层/pill、底部声波完整度和留白，尤其检查画布高度是否裁掉最后一个视觉元素。
- **vendor 资源要同时支持本地根目录和 dist**: 动态导入资源如 `assets/vendor/html2canvas.esm.js`，本地预览根目录和 `dist/` 都要能返回 200；若加入 service worker 缓存，也要写进 `STATIC_ASSETS`。
- **发布前做资源级验证**: 至少确认 `assets/meta/birds.json` 和 `dist/assets/meta/birds.json` 数量一致；新增鸟的 WebP、PNG、音频在本地和 `dist/` 都存在；线上发布后再用 `curl -I` 查新 JS、新鸟图、新鸟声是否 200。
- **线上发布命令**: 当前发布目标仍是阿里云香港 ECS。先 `npm run build`，再 `rsync -avz --delete dist/ root@47.243.252.80:/var/www/joyibird-nfc/`。服务器密码不要写入文件、命令历史、提交或文档。
- **发布后验证**: 检查 `https://nfc.joyibird.cn/` 的 HTML 是否加载新脚本；检查 `assets/meta/birds.json` 是否为预期鸟数；检查 HTTP 是否 301 到 HTTPS。
- **脏工作区提交边界**: 本项目经常同时有 H5、小程序、后台、宠物资产等多线改动。提交前必须用 `git diff --cached --name-only` 和 `git status --short` 复核，只提交本次任务文件，不要把无关改动混进发布提交。
