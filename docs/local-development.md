# 本地开发环境清单

## 建议安装的应用

- Homebrew：macOS 包管理器
- Node.js：建议 20 或更新版本
- Python 3：运行图片资产脚本
- 微信开发者工具：打开和调试小程序
- Visual Studio Code 或 Cursor：编辑代码

## 建议通过 Homebrew 安装的工具

```sh
brew install node python jq imagemagick librsvg ffmpeg
```

这些工具分别用于：

- `node`：运行 H5 数据导出脚本
- `python`：运行图片处理脚本
- `jq`：检查和处理 JSON
- `imagemagick`：处理图片
- `librsvg`：将 SVG 转成 PNG
- `ffmpeg`：后续如需处理音频或视频资源

## 项目依赖

Node 侧目前没有公开 npm 依赖，`package.json` 主要提供统一脚本入口。

Python 侧需要：

```sh
python3 -m pip install -r requirements.txt
```

## 当前注意点

- `node_modules` 当前是 Codex 运行时的软链接，不适合作为项目依赖来源。
- `outputs/` 是导出结果目录，默认不纳入版本管理。
- `project.private.config.json` 是本机微信开发者工具私有配置，不建议提交到共享仓库。

