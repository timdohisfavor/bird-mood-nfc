# 今日鸟签 NFC H5

这是一个以 H5 为主的「今日鸟签」页面。Netlify 线上版本由根目录 H5 构建发布。

## 项目入口

- H5 页面：`index.html`
- H5 样式：`styles.css`
- H5 逻辑：`script.js`
- 鸟类原始数据：`data/birds-source.json`
- H5 运行数据：`assets/meta/birds.json`
- 鸟类图片资产：`assets/birds-final/`、`assets/birds-final-webp/`
- 鸟鸣音频资产：`assets/bird-calls/`

## 本地运行

安装 Node.js 和 Python 后，可以在项目目录运行：

```sh
npm run serve
```

然后打开：

```text
http://localhost:4173
```

## 构建与发布

Netlify 使用：

```sh
npm run build
```

构建输出目录：

```text
dist/
```

`npm run build` 会执行：

1. 转换鸟图 WebP
2. 从 `data/birds-source.json` 导出 `assets/meta/birds.json`
3. 生成 `assets/meta/birds-data.js`
4. 复制根目录 H5 和必要资产到 `dist/`
5. 检查 `dist/` 是否含有不应发布的源码/配置文件

快速构建可用：

```sh
npm run build:fast
```

## 数据与资产脚本

导出 H5 鸟数据：

```sh
npm run export:h5-data
```

重新生成基础鸟类 PNG，需要先安装 Python 依赖：

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
npm run assets:generate
```

## Docker 一键启动

项目提供 Docker Compose，本地会同时启动：

- `frontend`：Nginx 静态站点，默认访问端口 `18080`
- `backend`：Node.js API，默认访问端口 `18081`
- `database`：PostgreSQL，默认本机端口 `15432`

启动：

```sh
docker compose up --build
```

访问：

```text
http://localhost:18080
```

后端健康检查：

```text
http://localhost:18081/api/health
```

停止服务：

```sh
docker compose down
```

如需同时删除本地数据库数据：

```sh
docker compose down -v
```

## 说明

当前项目已清理为 H5-first 结构。微信小程序代码和旧 `web/` H5 页面已移除，后续维护以根目录 H5 为准。

`npm run export:copy-workbook` 依赖 Codex 环境里的表格工具包，用于导出鸟签文案工作簿。如果在普通本地 Node 环境运行失败，优先在 Codex 环境中执行。
