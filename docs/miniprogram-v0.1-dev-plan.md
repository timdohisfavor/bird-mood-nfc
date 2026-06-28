# JoyiBird 小程序 V0.1 开发拆单

更新时间：2026-06-05

关联 PRD：[miniprogram-v0.1-prd.md](./miniprogram-v0.1-prd.md)

## 1. 范围冻结

V0.1 目标是跑通可体验内测版，不追求完整商业版。

### 1.1 本期必做

1. 微信登录或内测模拟登录。
2. 兑换码解锁。
3. 用户绑定唯一宠物。
4. 宠物主页。
5. 每日鸟签。
6. AI 文字情绪陪伴。
7. 每日免费对话次数限制。
8. 微信分享宠物主页。
9. 好友点击分享后触发串门关系。
10. 基础运营后台。

### 1.2 本期不做

1. 微信支付。
2. 月度订阅。
3. 语音对话。
4. 长期记忆。
5. 新 NFC 一物一码重写。
6. 复杂鸟窝装修。
7. 陌生玩家发现。
8. 私信。
9. 排行榜。
10. 多宠物系统。

### 1.3 UI 策略

当前原型只作为 V0.1 实现参考。UI 后续可以随时优化。

V0.1 开发优先级：

```text
链路正确 > 权限正确 > 数据可查 > 体验顺滑 > 视觉精修
```

## 2. 轻量技术方案

### 2.1 推荐栈

| 模块 | 方案 |
|---|---|
| 小程序端 | 原生微信小程序 |
| 后端 | Node.js + Fastify 或 Express |
| 数据库 | PostgreSQL 或 MySQL |
| 管理后台 | 简单 Web Admin，优先能用 |
| AI 接入 | 国内文本大模型 API |
| 静态资源 | 复用 H5 鸟图资源，后续可上 CDN |

### 2.2 第一阶段允许模拟

为了周日可内测，以下能力可先模拟：

1. 微信登录可先用 mock user，后续替换 `wx.login`。
2. AI 模型可先接一个固定 provider，后续再做模型路由。
3. 小程序分享可先记录 `share_pet_id` 参数，后续再细化分享卡片。
4. 后台权限可先用单一管理员密码，后续再做账号体系。

## 3. 目录建议

建议在现有 H5 项目旁边新增小程序与后端目录，不影响当前 H5。

```text
.
├── miniprogram/              # 微信小程序
├── server/                   # 后端 API + 管理后台
├── data/                     # 继续保留鸟类权威数据
├── assets/                   # 继续保留鸟图资源
└── docs/
```

## 4. 数据库拆单

### 4.1 users

用户表。

字段：

```text
id
openid
unionid
nickname
avatar_url
created_at
last_login_at
```

V0.1 注意：

1. `openid` 可先 mock。
2. 一个用户默认只能绑定一个宠物。

### 4.2 redeem_codes

兑换码表。

字段：

```text
id
code
status
issued_to_note
order_source
order_note
redeemed_user_id
redeemed_at
created_at
updated_at
```

状态：

```text
created
issued
redeemed
void
```

### 4.3 pets

宠物表。

字段：

```text
id
owner_user_id
bird_id
name
personality
tone
created_at
updated_at
```

### 4.4 daily_signs

每日鸟签表。

字段：

```text
id
user_id
pet_id
date_key
sign_title
sign_text
pet_comment
action_tip
created_at
```

约束：

```text
unique(user_id, date_key)
```

### 4.5 chat_messages

AI 聊天记录。

字段：

```text
id
user_id
pet_id
role
content
token_usage
created_at
```

### 4.6 chat_quotas

每日对话额度。

字段：

```text
id
user_id
date_key
free_limit
used_count
updated_at
```

V0.1 默认：

```text
free_limit = 5
```

### 4.7 pet_relationships

宠物关系。

字段：

```text
id
pet_a_id
pet_b_id
relationship_type
visit_count
created_at
updated_at
```

### 4.8 pet_visits

串门事件。

字段：

```text
id
from_pet_id
to_pet_id
source
created_at
```

V0.1 `source` 固定为：

```text
wechat_share
```

### 4.9 admin_audit_logs

后台操作日志。

字段：

```text
id
operator
action
target_type
target_id
before_json
after_json
created_at
```

## 5. API 拆单

### 5.1 小程序 API

#### POST /api/auth/wechat-login

用途：登录或创建用户。

V0.1 可先支持 mock code。

返回：

```json
{
  "token": "session-token",
  "user": {},
  "hasPet": true
}
```

#### GET /api/me

用途：获取当前用户和解锁状态。

返回：

```json
{
  "user": {},
  "pet": {},
  "locked": false
}
```

#### POST /api/redeem

用途：兑换码解锁。

请求：

```json
{
  "code": "1001"
}
```

返回：

```json
{
  "pet": {},
  "redeemed": true
}
```

错误：

```text
CODE_NOT_FOUND
CODE_USED
CODE_VOID
USER_ALREADY_HAS_PET
```

#### GET /api/pet/me

用途：获取自己的宠物主页数据。

#### PATCH /api/pet/me

用途：修改宠物昵称。

#### GET /api/sign/today

用途：获取今日鸟签。同一天固定。

#### GET /api/chat/quota

用途：获取今日剩余对话次数。

#### GET /api/chat/messages

用途：获取最近聊天记录。

#### POST /api/chat/messages

用途：发送消息并获得 AI 回复。

约束：

1. 用户必须有宠物。
2. 今日次数未用完。
3. 输入最多 300 字。
4. 回复最多 200 字。

#### POST /api/share/visit

用途：好友点击分享后记录串门。

请求：

```json
{
  "hostPetId": "pet-id"
}
```

规则：

1. 访问者未解锁：只返回引导，不建立关系。
2. 访问者已解锁：建立或更新关系。
3. 不支持陌生人搜索，只处理分享参数。

### 5.2 管理后台 API

#### GET /admin/api/summary

后台总览 KPI。

#### POST /admin/api/redeem-codes

创建兑换码。

#### GET /admin/api/redeem-codes

查询兑换码。

#### PATCH /admin/api/redeem-codes/:id

标记发放或作废。

#### GET /admin/api/users

搜索用户。

#### GET /admin/api/pets

搜索宠物。

#### GET /admin/api/ai-usage

查看 AI 用量。

#### GET /admin/api/visits

查看串门记录。

#### GET /admin/api/audit-logs

查看操作日志。

#### POST /admin/api/manual-unlock

人工解锁。

## 6. 小程序页面拆单

### 6.1 登录页

功能：

1. 微信登录。
2. 登录后判断是否有宠物。
3. 有宠物进入宠物主页。
4. 无宠物进入锁定页。

### 6.2 锁定页

功能：

1. 展示未解锁提示。
2. 引导输入兑换码。
3. 提示购买渠道：小红书「JOYI博物工作室」。

### 6.3 兑换码页

功能：

1. 输入 4 位数字兑换码，例如 `1001`。
2. 提交兑换。
3. 展示错误态。
4. 成功后进入宠物唤醒页。

### 6.4 宠物唤醒页

功能：

1. 展示宠物生成结果。
2. 显示鸟种、性格、昵称。
3. 支持修改昵称。
4. 点击进入宠物主页。

### 6.5 宠物主页

功能：

1. 展示宠物图片。
2. 展示宠物昵称、鸟种、性格。
3. 入口：今日鸟签。
4. 入口：和小鸟说话。
5. 入口：分享给好友。
6. 展示最近串门提示。

### 6.6 今日鸟签页

功能：

1. 展示今日固定鸟签。
2. 展示宠物口吻解释。
3. 展示今日适合做的事。
4. 展示今日提醒。

### 6.7 AI 聊天页

功能：

1. 展示今日剩余次数。
2. 展示最近聊天。
3. 输入文字。
4. 调用 AI。
5. 次数用完后禁用发送。

### 6.8 好友串门页

功能：

1. 通过分享参数进入。
2. 展示文案“小鸟邀请你来玩”。
3. 展示发起分享者的宠物鸟图。
4. 访问者有宠物：建立关系。
5. 访问者无宠物：展示购买/兑换引导。

## 7. 管理后台页面拆单

### 7.1 总览

展示：

1. 今日登录用户。
2. 今日兑换成功。
3. 今日 AI 对话。
4. 今日串门。
5. 异常待处理。

### 7.2 兑换码管理

功能：

1. 生成兑换码。
2. 标记已发放。
3. 作废兑换码。
4. 查看兑换记录。

### 7.3 用户/宠物查询

功能：

1. 按 user_id / openid / 昵称 / 兑换码搜索。
2. 查看用户解锁状态。
3. 查看宠物信息。
4. 人工解锁或异常处理。

### 7.4 AI 用量

功能：

1. 查看每日额度。
2. 查看已用次数。
3. 调整额度。
4. 暂停异常用户对话。

### 7.5 串门记录

功能：

1. 查看分享来源串门。
2. 查看是否建立关系。
3. 不提供私信入口。

### 7.6 操作日志

功能：

1. 查看后台操作。
2. 追踪人工解锁、作废、额度调整。

## 8. AI 实现拆单

### 8.1 V0.1 Prompt 方向

角色：

```text
你是用户通过 JoyiBird 唤醒的小鸟宠物。
你主要做情绪陪伴，不是客服、百科机器人或心理医生。
你的回复要短、温柔、有小鸟角色感。
不要提供医疗、法律、金融等高风险建议。
不要假装知道用户现实环境。
```

### 8.2 输入输出限制

```text
用户输入最多 300 字
AI 回复最多 200 字
每日免费 5 轮
只带最近 6-10 条上下文
```

### 8.3 V0.1 先不做

1. 长期记忆。
2. 语音。
3. 多模型路由。
4. 订阅权益。

## 9. 周日交付计划

当前目标：2026-06-07 周日跑通 V0.1 内测。

### 2026-06-05 周五

1. 冻结 PRD 与开发拆单。
2. 建立小程序和 server 目录。
3. 建立数据库结构或本地 mock store。
4. 完成登录/用户态基础。
5. 完成兑换码接口雏形。

### 2026-06-06 周六

1. 完成兑换码解锁。
2. 完成宠物生成。
3. 完成宠物主页。
4. 完成今日鸟签。
5. 完成后台兑换码管理。
6. 完成 AI 聊天基础接入。

### 2026-06-07 周日

1. 完成 AI 次数限制。
2. 完成好友分享串门基础链路。
3. 完成后台用户/宠物查询。
4. 端到端测试。
5. 修主要 bug。
6. 给小范围朋友和老用户试用。

## 10. 验收清单

1. 新用户登录后进入锁定页。
2. 输入有效兑换码后创建宠物。
3. 同一个兑换码不能重复兑换。
4. 已解锁用户再次进入宠物主页。
5. 今日鸟签同一天固定。
6. AI 可以回复。
7. AI 每日次数用完后禁用发送。
8. 分享宠物主页后，好友能进入串门页。
9. 好友有宠物时建立关系。
10. 好友无宠物时只展示引导。
11. 后台能生成、查看、作废兑换码。
12. 后台能查询用户和宠物。

## 11. 后续 UI 优化空间

V0.1 上线后可随时迭代：

1. 登录页视觉。
2. 宠物唤醒动画。
3. 宠物主页信息层级。
4. 今日鸟签卡片视觉。
5. AI 聊天语气和气泡样式。
6. 分享卡片。
7. 后台表格密度和二级页面。

建议等真实用户体验后再细化 UI，优先根据以下反馈调整：

1. 用户是否理解如何解锁。
2. 用户是否觉得宠物“属于自己”。
3. 用户是否愿意每天看鸟签。
4. 用户是否愿意和宠物聊天。
5. 用户是否愿意分享给微信好友。
