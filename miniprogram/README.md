# JoyiBird 小程序 V0.1

原生微信小程序骨架，对应 `docs/miniprogram-v0.1-prd.md` 和 `docs/miniprogram-v0.1-dev-plan.md`。

## 页面

- `pages/login`：内测模拟登录入口。
- `pages/locked`：未解锁状态和购买/兑换引导。
- `pages/redeem`：兑换码解锁。
- `pages/awakening`：宠物生成结果和昵称修改。
- `pages/home`：宠物主页、今日鸟签、AI 聊天、分享入口、串门提醒。
- `pages/sign`：今日固定鸟签。
- `pages/chat`：每日 5 次免费文字陪伴对话。
- `pages/visit`：好友分享串门结果。

## 本地 API

默认请求 `http://127.0.0.1:8099`，配置在 `app.js`。

先在项目根目录启动后端：

```bash
npm run server
```

再用微信开发者工具打开 `miniprogram/` 目录。
