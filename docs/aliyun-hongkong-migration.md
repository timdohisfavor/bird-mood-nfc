# 阿里云香港迁移手册（前端 + 后端）

> 目标：把「今日鸟签」从 Netlify 迁到阿里云香港节点，解决中国大陆访问慢的问题。
> 香港节点 **免 ICP 备案**，比海外 Netlify 快，但不如国内节点（国内节点必须备案）。
> 适用范围：前端 + 后端（恢复码/云端进度）全部迁移，功能完整保留。

---

## 0. 迁移前先想清楚的три件事

1. **域名**：建议用一个你自己的域名（如 `niao.example.com`）。香港免备案，但如果将来想用国内节点提速，得回头备案。
2. **成本预估（香港，按量约数）**：ECS 共享型 2核2G ≈ 60-120 元/月；OSS 存储几乎可忽略（项目才几 MB）；CDN 流量约 0.5-1 元/GB。小流量站点整体每月几十元到一百多。
3. **HTTPS 证书**：阿里云免费 DV 证书即可（每个一年，可续）。

---

## 1. 架构对照

| 部分 | 原（Netlify） | 迁移后（阿里云香港） |
|---|---|---|
| 静态前端 | Netlify 托管 | 方案A：ECS 上 Nginx / 方案B：OSS + CDN |
| `/api/progress` | Netlify Functions | 香港 ECS 上的 `backend/server.mjs` |
| 数据库 | 外部 Postgres | ECS 上 Docker Postgres / 阿里云 RDS |

**最省心的做法**：前端和后端都放在**同一台香港 ECS** 上，用项目已有的 `docker-compose.yml` 一键起。这样前后端同域，不用处理跨域(CORS)，`/api/progress` 路径也不用改。本手册主推这个方案。

<!-- PLACEHOLDER_MAIN -->

---

## 2. 推荐方案：单台香港 ECS + Docker Compose

### 2.1 买机器
1. 阿里云控制台 → ECS → 创建实例 → **地域选「中国香港」**。
2. 规格：共享型 2核2G 起步够用；镜像选 **Ubuntu 22.04** 或 **Alibaba Cloud Linux**。
3. 公网：分配公网 IP，带宽按量付费或固定 3-5 Mbps。
4. 安全组：放行 **22(SSH)、80(HTTP)、443(HTTPS)**。数据库 5432 **不要**对公网开放。

### 2.2 装 Docker
SSH 登录后：
```bash
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # 重新登录生效
docker compose version          # 确认 compose 可用
```

### 2.3 上传代码并启动
把项目传到服务器（用 git clone 你的仓库，或 scp 整个目录）：
```bash
git clone https://github.com/timdohisfavor/bird-mood-nfc.git
cd bird-mood-nfc

# 配置环境变量：复制示例并改掉数据库密码
cp .env.example .env
nano .env        # 把 POSTGRES_PASSWORD 改成强密码

# 一键起：前端(nginx) + 后端(node) + 数据库(postgres)
docker compose up --build -d
```
启动后：
- 前端：`http://<公网IP>:18080`
- 后端健康检查：`http://<公网IP>:18081/api/health`

> 说明：`docker-compose.yml` 里前端 nginx 会把 `/api/*` 反代到 backend，所以**前端页面里 `/api/progress` 的相对路径不用改**，恢复码/云端进度自动可用。

### 2.4 配域名 + HTTPS（建议加一层 Nginx 或直接用 80/443）
最简单：把 compose 里 frontend 的端口从 `18080:80` 改成 `80:80`，再用阿里云免费证书 + Nginx 443。或在 ECS 上单独装一个 Nginx 做反向代理 + Let's Encrypt：
```bash
# 用 certbot 自动签发 + 续期（域名先解析到本机公网IP）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d niao.yourdomain.com
```

### 2.5 DNS 切换
1. 在你的域名服务商处，把 `niao.yourdomain.com` 的 **A 记录**指向香港 ECS 公网 IP。
2. 等 DNS 生效（几分钟到几十分钟），用国内网络访问验证速度。
3. 确认无误后，再去 Netlify 把旧站下线（或保留作备份）。

<!-- PLACEHOLDER_2 -->

---

## 3. 备选方案：OSS+CDN（前端） + ECS（后端）

如果想让前端走 CDN（多节点、更快、抗量），后端单独放 ECS：

**前端 → OSS + CDN**
1. 本地 `npm run build` 生成 `dist/`。
2. 阿里云 OSS 建 Bucket（香港地域），开启「静态网站托管」，把 `dist/` 全部上传。
3. 接 CDN：加速域名指向该 OSS Bucket；缓存规则里给 `assets/*` 设长缓存，给 `index.html` 设不缓存（保证更新即时生效）。
4. CDN 绑你的域名 + HTTPS 证书。

**后端 → 同第 2 节的 ECS**，只跑 backend + database 两个服务。

**关键：解决跨域(CORS)**
前端在 CDN 域名、后端在 ECS 域名，浏览器会拦跨域请求。两个办法二选一：
- **办法A（推荐）**：在 CDN 上加一条回源规则，把 `/api/*` 回源到后端 ECS，让浏览器看起来是同域。前端代码无需改。
- **办法B**：给后端加 CORS 响应头。需要改 `backend/server.mjs`，在 `sendJson` 里加：
  ```
  "access-control-allow-origin": "https://niao.yourdomain.com"
  ```
  并处理 OPTIONS 预检请求。改动较多，不如办法A省事。

---

## 4. 数据迁移（如果旧 Netlify 上已有用户进度）

旧站的 Postgres 数据（`visitor_progress` 表）要导到新库，否则老用户的恢复码会失效：
```bash
# 从旧库导出
pg_dump "$OLD_DATABASE_URL" -t visitor_progress --data-only > progress.sql
# 导入新库（香港 ECS 上的 postgres）
psql "$NEW_DATABASE_URL" < progress.sql
```
如果旧站没接数据库（之前一直显示"云端未链接"），那就没有云端数据要迁，跳过本节。

---

## 5. 迁移后验收清单

- [ ] 国内网络打开域名，首屏 < 2 秒
- [ ] 森林背景正常显示（已修复：WebP + 绿色兜底 + preload）
- [ ] 恢复码状态栏显示「云端记录」而非「云端未链接」
- [ ] 抽签 → 刷新页面 → 进度还在（localStorage + 云端双保险）
- [ ] 换一台设备用恢复码能找回进度
- [ ] 鸟鸣音频能播放、分享海报能生成
- [ ] HTTPS 证书有效（地址栏小锁）

---

## 6. 我能帮你做 vs 你需要自己做

**我能做（代码层面）**：
- 已修：背景 WebP 化 + 兜底色 + preload、云端超时与重试
- 可改：后端 CORS 头（若走 OSS+CDN 方案 B）、Nginx 配置模板、compose 端口调整

**你需要自己做（账号/控制台层面，我无权限）**：
- 阿里云买 ECS/OSS/CDN、实名、付费
- 域名解析、证书申请
- SSH 上服务器执行命令

> 任何一步卡住，把报错或截图发我，我帮你定位。



