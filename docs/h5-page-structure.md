# 今日鸟签 H5 — 页面结构文档

## 概览

H5 前端采用单页架构（Vanilla HTML/CSS/JS），共 **3 个主页面 + 1 个弹窗**，通过 `goScreen()` 切换路由，底部导航栏在"今日"和"鸟窝"之间切换。

```
main#app
├── section#home-screen     ← 首页（今日页）
├── section#nest-screen     ← 鸟窝（图鉴页）
├── section#poster-screen   ← 海报页
├── aside#bird-detail-modal ← 详情弹窗（大卡片）
├── nav.tabbar              ← 底部导航栏
└── div#toast               ← 全局提示条
```

---

## 1. 首页 / 今日页 `#home-screen`

每日抽签的主入口，用户翻开一张"鸟签"查看今日状态。

### 1.1 入口标语 `.home-head`

| 元素 | 选择器 | 内容 |
|---|---|---|
| 标语 | `#entry-label` / `.eyebrow` | "NFC碰一碰抽签" |
| 主标题 | `.home-head h1` | "今日鸟签" |
| 副标题 | `.subcopy` | "每天翻开一张鸟签，查看你的好运指南" |

### 1.2 抽签卡片区 `.draw-stage`

核心操作区域，包含签卡翻转动画和状态信息。

| 元素 | 选择器 | 内容 |
|---|---|---|
| 状态栏 | `.stage-topline` | "今日" + 状态胶囊（待翻开 / 已收录） |
| 倒计时 | `#daily-countdown` | "明日再来" 倒计时（每日一签限制时显示） |
| **签卡** | `#draw-card` / `.bird-sign` | 可翻转的签卡，分正反面 |

**签卡内部结构** `#draw-card`：

```
button.bird-sign
├── span.ambient-ring      ← 环境光动效
├── span.sign-back         ← 【反面】未翻开状态
│   ├── span.seal-mark     ← 封印印章图标
│   ├── span.seal-title    ← "鸟签待翻开"
│   └── span.seal-copy     ← "轻点一下，让小鸟从栖息地里出现吧"
└── span.sign-front        ← 【正面】已翻开状态
    ├── span.state-label   ← "今日鸟签"
    ├── span.bird-frame    ← 鸟图容器
    │   └── img#active-bird-image
    ├── strong#active-bird-name  ← 鸟名
    ├── span#active-bird-look    ← 外观描述（如"褐背、黑喉、小圆身"）
    └── span#active-bird-quote   ← 当日签名
```

### 1.3 主按钮区 `.primary-actions`

| 元素 | 选择器 | 内容 |
|---|---|---|
| 抽签按钮 | `#draw-button` / `.primary` | "翻开今日鸟签" |
| 分享按钮 | `#share-poster-button` / `.poster-entry` | "🖼️ 生成分享图"（翻开后出现） |

### 1.4 底部说明卡 `.home-note`

| 元素 | 选择器 | 内容 |
|---|---|---|
| 收录统计 | `#unlock-count` | "0 / 34" |
| 说明文案 | `.home-note p` | "每天固定一签，翻开过的鸟会在这台设备上收录。" |
| 小红书入口 | `.brand-pill` | "去JOYI小红书许愿" + logo + 箭头，跳转小红书主页 |
| 预览工具 | `.preview-tools` | 仅本地测试用，正式发布不显示 |

**预览工具** `.preview-tools`（测试用）：

| 元素 | 选择器 | 说明 |
|---|---|---|
| 重置按钮 | `#reset-preview-button` | 重置所有预览状态 |
| 一键揭开 | `#unlock-all-button` | 揭开所有鸟的剪影 |
| NFC 模拟器 | `#nfc-simulator` | 输入 tag ID 模拟 NFC 碰一碰 |

---

## 2. 鸟窝 / 图鉴页 `#nest-screen`

所有鸟的网格图鉴，支持筛选、查看收录进度。

### 2.1 顶部导航 `.page-head`

| 元素 | 选择器 | 内容 |
|---|---|---|
| 返回按钮 | `#back-home` / `.icon-button` | 左箭头，返回首页 |
| 副标题 | `.page-head .eyebrow` | "已入窝的鸟团团" |
| 主标题 | `.page-head h1` | "小鸟自留地" |

### 2.2 收录统计栏 `.guide-summary`

| 元素 | 选择器 | 内容 |
|---|---|---|
| 收录数 | `#guide-count` | 已收录鸟的数量 |
| 说明文案 | `.guide-summary p` | "可收录的鸟团团会定期更新" |
| 小红书入口 | `.brand-pill` | "去JOYI小红书许愿" |
| 进度条 | `.progress-track` / `#guide-progress` | 收录进度可视化 |

### 2.3 筛选栏 `#guide-filters`

| 按钮 | 筛选逻辑 |
|---|---|
| 全部 | 显示所有鸟 |
| 已收录 | 仅显示已解锁的鸟 |
| 未收录 | 仅显示未解锁的鸟 |

### 2.4 鸟卡片网格 `#bird-grid`

34 张鸟卡片的 CSS Grid 网格布局。

**单张鸟卡片** `.bird-tile`：

```
article.bird-tile.unlocked/.locked
├── div.tile-topline        ← 顶部信息行
│   ├── span.tile-index     ← 序号（No.1）
│   ├── strong              ← 鸟名（如"麻雀"）
│   └── button.call-button  ← 🔊 播放鸟鸣按钮（含 SVG 环形进度）
├── div.tile-habitat        ← 栖息地（如"城市村落"）
├── figure.tile-art         ← 鸟图
│   └── img
└── div.tile-silhouette     ← 未收录时的剪影遮罩
```

---

## 3. 海报页 `#poster-screen`

生成分享长图的页面，可保存到相册。

### 3.1 顶部导航 `.poster-head`

| 元素 | 选择器 | 内容 |
|---|---|---|
| 返回按钮 | `#poster-back-home` | 左箭头，返回首页 |
| 副标题 | `.poster-head .eyebrow` | "分享海报" |
| 主标题 | `.poster-head h1` | "把今天发给朋友" |

### 3.2 海报卡片 `.poster-card`

可生成长图的完整海报结构：

```
article.poster-card
├── p.poster-brand          ← "BIRD MOOD CLUB"（品牌名，::before 有 JOYI BIRD 底文）
├── p#poster-date           ← 日期
├── div.poster-art          ← 鸟图
│   └── img#poster-bird-image
├── p.state-label           ← "今日鸟签"
├── h2#poster-bird-name     ← 鸟名
├── p#poster-bird-look      ← 外观描述
├── p#poster-bird-quote     ← 签名
└── div.poster-foot         ← 底部信息
    ├── span                ← "NFC 鸟签"
    └── span                ← "截图分享今日状态"
```

### 3.3 保存按钮

| 元素 | 选择器 | 内容 |
|---|---|---|
| 保存到相册 | `#save-poster` / `.poster-save` | 下载图标 + "保存到相册" |

---

## 4. 详情弹窗 `#bird-detail-modal`

点击鸟窝中的小鸟卡片后弹出的底部抽屉式面板，展示鸟的完整信息。

### 4.1 弹窗结构

```
aside.bird-detail-modal
├── div#bird-detail-backdrop  ← 半透明遮罩层（点击可关闭）
└── div.detail-sheet          ← 底部弹出的内容面板
    ├── button#detail-close   ← ✕ 关闭按钮
    ├── div.detail-art        ← 鸟大图
    │   └── img#detail-bird-image
    ├── p#detail-bird-rank    ← 编号（如 "No.1"）
    ├── h2#detail-bird-name   ← 鸟名
    ├── p#detail-bird-look    ← 外观描述
    ├── p#detail-bird-quote   ← 签名
    ├── p#detail-bird-habitat ← 栖息地（如"城市村落"）
    ├── p#detail-bird-line    ← 补充特征
    ├── div.detail-stats      ← 三维评分
    │   ├── .detail-stat      ← 宜鱼 ★★★
    │   ├── .detail-stat      ← 社交 ★★★
    │   └── .detail-stat      ← 遇见 ★★★
    ├── div#pulse-viz-wrap    ← 彩虹频谱可视化区
    │   └── canvas#pulse-canvas
    ├── div.detail-call-row   ← 播放控制行
    │   ├── button#detail-call-button  ← ▶ 播放按钮
    │   └── span#pulse-label           ← "轻触聆听鸟鸣"
    └── button#detail-shot-button      ← "保存到相册"
```

### 4.2 各模块说明

| 模块 | 选择器 | 说明 |
|---|---|---|
| 鸟图区 | `.detail-art` | 大图展示，需注意鸟类全身展示（含脚） |
| 鸟信息区 | `.detail-rank` + `h2` + `.detail-look` + `.detail-quote` | 编号、鸟名、外观、签名 |
| 栖息地 + 特征 | `.detail-habitat` + `.detail-line` | 从数据 `bird.habitat` 读取 |
| 三维评分 | `.detail-stats` | 宜鱼 / 社交 / 遇见，星级展示 |
| 频谱可视化 | `.pulse-viz-wrap` / `#pulse-canvas` | 彩虹脉冲环 Canvas，空闲时呼吸灯，播放时动态频谱 |
| 播放控制行 | `.detail-call-row` | 播放按钮 + "轻触聆听鸟鸣" 文字 |
| 保存按钮 | `.detail-shot` | 保存当前鸟签为图片 |
| 底文水印 | `.detail-sheet::before` | "JOYI BIRD" 半透明底文 |

---

## 5. 全局元素

### 5.1 底部导航栏 `.tabbar`

| 按钮 | `data-screen` | 说明 |
|---|---|---|
| 今日 | `home` | 切换到首页 |
| 鸟窝 | `nest` | 切换到图鉴页 |

### 5.2 动态背景 `.habitat-bg`

森林晨光场景，包含多层视差元素：

```
div.habitat-bg
├── div.sky          ← 天空渐变
├── div.sun          ← 太阳光晕
├── div.mist.mist-one  ← 薄雾层 1
├── div.mist.mist-two  ← 薄雾层 2
├── div.ridge.ridge-back  ← 远山脊线
├── div.ridge.ridge-front ← 近山脊线
├── div.water        ← 水面
├── div.forest.forest-left  ← 左侧树林
├── div.forest.forest-right ← 右侧树林
├── div.reeds.reeds-left    ← 左侧芦苇
└── div.reeds.reeds-right   ← 右侧芦苇
```

### 5.3 提示条 `#toast`

轻量消息提示，自动消失，用于操作反馈（如"已保存到相册"、"鸟鸣待补充"等）。

---

## 路由与导航

| 路由 | Hash | 对应页面 |
|---|---|---|
| 首页 | `#` 或 `#home` | `#home-screen` |
| 鸟窝 | `#nest` | `#nest-screen` |
| 海报 | `#poster` | `#poster-screen` |
| NFC 碰一碰 | `?tag=xxx` 或 `/nfc/xxx` | 自动跳转首页并抽签 |

---

## 数据流

```
birds.json（34 只鸟数据）
    ↓
state.birds（内存数据）
    ↓
渲染到各页面 DOM
    ↓
localStorage 持久化（每日一签 / 收录状态）
```

**关键状态变量**（`script.js` 中的 `state` 对象）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `state.birds` | Array | 全部 34 只鸟数据 |
| `state.todayBird` | Object | 今日抽到的鸟 |
| `state.revealed` | Boolean | 今日签是否已翻开 |
| `state.unlockedBirdIds` | Set | 已收录的鸟 ID 集合 |
| `state.playingCallId` | String | 当前正在播放鸟鸣的鸟 ID |
| `state.detailBird` | Object | 详情弹窗中展示的鸟 |
| `state.guideFilter` | String | 图鉴页当前筛选（all / unlocked / locked / call） |
