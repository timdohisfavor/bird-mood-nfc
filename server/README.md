# JoyiBird Server V0.1

Node.js server，承载小程序 API 和朴素运营后台，状态使用 PostgreSQL 持久化。

## 启动

```bash
docker compose up -d database
npm run server
```

最小数据库配置可直接使用项目根目录 `.env.example` 里的默认值：

```text
DATABASE_URL=postgres://birdsign:birdsign@127.0.0.1:15432/birdsign
JOYIBIRD_DB_SCHEMA=public
```

如需接真实 LLM，在项目根目录创建 `.env.local`：

```bash
cat > .env.local <<'EOF'
JOYIBIRD_LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
EOF
```

也可以临时在当前 shell 里接 key：

```bash
export JOYIBIRD_LLM_PROVIDER=deepseek
export DEEPSEEK_API_KEY='你的_deepseek_api_key'
export DEEPSEEK_BASE_URL='https://api.deepseek.com'
export DEEPSEEK_MODEL='deepseek-v4-flash'
npm run server
```

如果用其他兼容 OpenAI 的服务，再换回 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL` 即可。不要把 `.env.local` 提交到 git。

后台地址：

```text
http://127.0.0.1:8099/admin
```

## 覆盖范围

- 内测模拟登录。
- 兑换码解锁和用户唯一宠物绑定。
- 宠物主页数据、昵称修改、公开分享宠物数据。
- 同日固定今日鸟签。
- AI 文字陪伴；未配置 key 时使用 mock 回复，配置 key 后走 OpenAI-compatible Chat Completions。
- 微信分享触发串门关系和串门事件。
- 后台总览、兑换码单个/批量创建、标记发放、作废。
- 后台用户/宠物查询、人工解锁、宠物改名。
- 后台 AI 用量查看、额度调整、暂停/恢复用户 AI。
- 后台串门记录和操作日志。

## 验证

```bash
npm run smoke:v01
```

`smoke:v01` 会为本次测试创建独立 PostgreSQL schema 并重置种子兑换码，避免污染本地开发数据。
