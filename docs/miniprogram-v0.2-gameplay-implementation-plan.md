# JOYIBIRD 小程序 V0.2 玩法实现拆单

更新时间：2026-06-08

关联 PRD：[miniprogram-v0.2-core-gameplay-prd.md](./miniprogram-v0.2-core-gameplay-prd.md)

关联宠物设计：[miniprogram-pet-design-v0.2.md](./miniprogram-pet-design-v0.2.md)

## 1. 实现原则

V0.2 优先把“可爱感”和“每日回访理由”做出来，不追求复杂系统。

优先级：

```text
宠物像一只鸟 > 小鸟有状态 > 每日有惊喜 > 聊天记得你 > 小纸条闭环 > 串门回访
```

技术策略：

1. 继续基于当前 `miniprogram/` + `server/` V0.1 骨架迭代。
2. 当前 server 仍以内存 mock 为主，但字段和接口按未来 CloudBase/数据库迁移设计。
3. 前端先做状态可见，再做高保真视觉。
4. AI 不可用时必须有模板兜底。
5. V0.2 不能继续依赖“真实鸟图资料卡”作为主视觉，需要按宠物资产系统预留状态图。

## 2. Slice 0：宠物资产方向确认

### 2.1 目标

先确认 V0.2 的小鸟形象方向，避免后续首页高保真仍然围绕真实鸟类图鉴展开。

### 2.2 产出

根据 [miniprogram-pet-design-v0.2.md](./miniprogram-pet-design-v0.2.md) 生成或制作首版 6 只小鸟概念图：

1. 北长尾山雀：云朵小团子。
2. 普通翠鸟：小小冒险家。
3. 伯劳：外冷内软的小守卫。
4. 红尾水鸲：蓝色小火苗。
5. 红头长尾山雀：元气小麻薯。
6. 红胁秀眼：青柠软糖。

每只先至少有：

```text
idle
happy
talking
sleepy
waiting
reward
```

V0.2 实现时可以先用单张 `idle` 图 + 文案状态过渡，但文件结构必须按多状态预留。

### 2.3 验收

1. 小鸟看起来像可拥有的宠物，而不是鸟类资料图。
2. 6 只小鸟有明确色彩和性格差异。
3. 首页能替换为宠物资产，不再强依赖真实鸟图。

## 3. Slice 1：小鸟状态首页

### 3.1 后端

修改 `server/server.mjs`：

1. `createPet()` 新增字段：

```text
mood
mood_text
bond_score
bond_level
feather_count
last_interaction_at
today_event
today_event_text
```

2. 新增工具函数：

```text
getBondLevel(score)
getDailyMood(user, pet)
buildMoodText(pet, mood)
rollDailyEvent(user, pet)
publicCareState(user, pet)
```

3. `GET /api/pet/me` 返回：

```text
pet
todayCare
todayNote
recentVisits
```

### 3.2 小程序

修改：

```text
miniprogram/pages/home/index.wxml
miniprogram/pages/home/index.wxss
miniprogram/pages/home/index.js
```

首页新增：

1. 今日心情。
2. 小鸟一句话和“小鸟今天发生了什么”。
3. 羽毛数。
4. 熟悉度。
5. 今日完成状态。
6. 今日随机事件提示。

### 3.3 验收

1. 首页第一屏更像“小鸟主屏”，不是普通资料卡。
2. 能显示 mood、mood_text、today_event_text、bond_level、feather_count。
3. `npm run smoke:v01` 通过。

## 4. Slice 2：鸟签打开仪式

### 4.1 后端

新增内存状态：

```text
dailyCareRecords
```

新增接口：

```text
POST /api/sign/today/open
GET  /api/care/today
```

打开鸟签后：

1. 标记 `sign_opened = true`。
2. 若当天首次打开，`feather_count +1`。
3. 生成 `bird_reaction`。
4. 可能更新 mood。
5. 若今日事件是 `小鸟叼来东西`，首页展示收藏物。

### 4.2 小程序

修改：

```text
miniprogram/pages/sign/index.js
miniprogram/pages/sign/index.wxml
miniprogram/pages/sign/index.wxss
```

新增状态：

1. 未打开。
2. 正在打开。
3. 已打开。

### 4.3 验收

1. 同一天重复打开不重复加羽毛。
2. 首页能显示今日鸟签已完成。

## 5. Slice 3：聊天影响小鸟 + 跨天记忆

### 5.1 后端

修改：

```text
POST /api/chat/messages
```

成功回复后：

1. 更新 `last_interaction_at`。
2. 当日首次聊天 `bond_score +1`。
3. 更新 `bond_level`。
4. 标记 `chat_done = true`。
5. 根据用户输入和回复更新 mood。
6. 异步生成一条 `bird_memories` 摘要。

新增状态：

```text
birdMemories
```

记忆规则：

1. 每天最多生成 1 条。
2. 最多保留最近 7 天。
3. 每条不超过 30 字。
4. 只在开场白或自然上下文中使用，不强制硬提。

### 5.2 小程序

修改：

```text
miniprogram/pages/chat/index.js
miniprogram/pages/chat/index.wxml
miniprogram/pages/chat/index.wxss
```

新增：

1. 根据 mood 显示主动开场白。
2. 根据 bond_level 调整主动性。
3. 若有自然的昨日记忆，开场白轻轻提起。
4. 发送后保留“正在想”和逐字回复。
5. 首次聊天完成提示“它更安心了一点”。

### 5.3 验收

1. 聊天后回首页，小鸟状态有变化。
2. 对话次数限制继续生效。
3. DeepSeek 报错时前端有明确失败提示，不误加分。
4. 次日聊天页能自然引用一次历史记忆，且不显得像系统提示。

## 6. Slice 4：今日小纸条

### 6.1 后端

新增状态：

```text
birdNotes
```

完成条件：

```text
sign_opened && chat_done && !todayNote
```

生成方式：

1. 模板优先。
2. DeepSeek 只做轻润色。
3. 失败时直接使用模板原文。

模板要求：

1. 至少 20 条。
2. 覆盖 mood、weekday、care_done 等组合。
3. 输出不超过 40 字。

### 6.2 小程序

首页新增小纸条区块：

```text
今天它想留给你
“……”
```

### 6.3 验收

1. 同一天只生成一张。
2. 首页刷新后仍固定。
3. AI 不可用时模板可用，且文案质量不明显掉档。

## 7. Slice 5：串门惊喜 + 回访闭环

### 7.1 后端

修改：

```text
POST /api/share/visit
GET  /api/pet/me
```

新增：

1. `visit_message`。
2. 最近一次串门提示。
3. `return_visit_available`。
4. `return_visit_message`。

### 7.2 小程序

修改：

```text
miniprogram/pages/visit/index.*
miniprogram/pages/home/index.*
```

### 7.3 验收

1. 好友点击分享后能生成串门消息。
2. 主人首页显示温柔提示。
3. 主人能点击“让我的小鸟也去看看它”。
4. 每对朋友每天最多互访一次。

## 8. 第一轮建议只做的内容

下一轮开发建议做 Slice 0 + Slice 1。

原因：

1. 新版 PRD 已经把宠物从真实鸟图转向游戏宠物资产。
2. 不先确认宠物资产方向，首页高保真会继续偏资料卡。
3. 首页是用户每天最先看到的地方。
4. 小鸟状态 + 随机事件能最快提升可爱感。
5. Slice 1 不依赖复杂 AI 和新表。
6. 完成后再调 UI 高保真更有依据。

第一轮开发验收文案示例：

```text
它今天有点困困。
脑袋埋在羽毛里，但听见你来了，还是抬头看了一眼。

熟悉度：会等你
羽毛：8
今日：还没看小鸟签
今天发生了什么：它叼回来一片亮亮的叶子。
```
