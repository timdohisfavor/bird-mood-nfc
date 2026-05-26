# 今日鸟签 NFC

这是一个微信小程序原型，同时带有可在浏览器中查看的 H5 预览版。

## 项目入口

- 微信小程序入口：`project.config.json`
- 小程序页面：`pages/index/index.*`
- 根目录 H5 预览：`index.html`
- 独立 H5 预览：`web/index.html`
- 鸟类图片资产：`assets/birds-final/`
- H5 图片资产：`web/assets/birds-final/`

## 本地运行

安装 Node.js 和 Python 后，可以在项目目录运行：

```sh
npm run serve
```

然后打开：

```text
http://localhost:4173
```

独立 H5 版本：

```sh
npm run serve:web
```

然后打开：

```text
http://localhost:4174
```

微信小程序请用微信开发者工具打开本目录。

## Docker 一键启动

项目提供 Docker Compose，本地会同时启动：

- `frontend`：Nginx 静态站点，默认访问端口 `18080`
- `backend`：Node.js API，默认访问端口 `18081`
- `database`：PostgreSQL，默认本机端口 `15432`

直接启动：

```sh
docker compose up --build
```

然后打开：

```text
http://localhost:18080
```

后端健康检查：

```text
http://localhost:18081/api/health
```

Compose 会自动读取项目根目录的 `.env`。如果默认端口已被占用，先复制示例配置并修改端口：

```sh
cp .env.example .env
```

可用配置项：

```env
FRONTEND_PORT=18080
BACKEND_PORT=18081
POSTGRES_PORT=15432

POSTGRES_DB=birdsign
POSTGRES_USER=birdsign
POSTGRES_PASSWORD=birdsign
```

停止服务：

```sh
docker compose down
```

如需同时删除本地数据库数据：

```sh
docker compose down -v
```

## 数据与资产脚本

```sh
npm run export:h5-data
```

从 `pages/index/index.js` 导出 H5 使用的 `web/assets/meta/birds.json`。

```sh
npm run assets:generate
```

重新生成基础鸟类 PNG，需要先安装 Python 依赖：

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

## 说明

`npm run export:copy-workbook` 依赖 Codex 环境里的表格工具包，用于导出鸟签文案工作簿。如果在普通本地 Node 环境运行失败，优先在 Codex 环境中执行。
