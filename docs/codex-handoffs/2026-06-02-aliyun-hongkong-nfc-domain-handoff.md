# Handoff: `nfc.joyibird.cn` 阿里云香港部署

## 背景

用户原先的 NFC H5 入口是 Netlify 域名：

```text
https://bird-mood-nfc.netlify.app/
```

由于中国大陆访问 Netlify 首跳慢，已改走自有域名 + 阿里云香港 ECS：

```text
https://nfc.joyibird.cn/
```

目标是让 NFC 芯片以后只写自有域名。后续无论切香港服务器、国内备案服务器、OSS/CDN，都只改 DNS，不再重写 NFC。

## 当前状态

- 域名 `joyibird.cn` 已购买完成。
- 阿里云云解析 DNS 已添加 `nfc` A 记录。
- DNS 防护已开启，页面显示防护中。
- `http://nfc.joyibird.cn/` 已可打开今日鸟签 H5。
- 用户反馈 HTTPS 也已无问题。
- 阿里云香港 ECS 正常运行。

## 服务器信息

```text
云厂商：阿里云 ECS
地域：中国香港
实例名：launch-advisor-20260601
实例 ID：i-j6chc6uw2hy3sqdbiy0i
公网 IP：47.243.252.80
内网 IP：172.17.136.203
系统：Ubuntu 22.04 64位
规格：ecs.e-c1m1.large，2 vCPU / 2 GiB
系统盘：ESSD Entry 40 GiB
公网线路：BGP（多线），非精品
带宽计费：按使用流量
公网带宽：100 Mbps 峰值
到期时间：2026年7月1日 23:59:59
自动续费：1个月
```

普通 BGP 多线是用户为了控制成本主动选择的方案。潜在风险是部分大陆网络访问可能波动、偶发丢包或高峰期变慢，但不是不可用。后续如果首屏体验不够好，再考虑升级精品线路或切到备案后的国内节点。

## DNS 配置

阿里云云解析 DNS：

```text
域名：joyibird.cn
主机记录：nfc
记录类型：A
记录值：47.243.252.80
TTL：10分钟
解析请求来源：默认
```

验证时 `ping nfc.joyibird.cn` 已解析到 `47.243.252.80`，延迟约 40-45ms，但普通 BGP 下偶尔出现 ICMP timeout。

## 本地项目

```text
/Users/Admin/Downloads/Codex/2026-05-07/nfc-iphone-m-m-nfc-m
```

已执行过：

```bash
npm run build
```

构建结果：

```text
Converted 34 bird images to WebP.
PNG: 8.81 MB
WebP: 0.77 MB
Saved: 8.03 MB (91%)
Exported 34 birds to assets/meta/birds.json
Built dist/ with 34 birds.
dist/ publish check passed (84 files).
```

## 部署目录

服务器上的 H5 静态目录：

```text
/var/www/joyibird-nfc
```

本地上传命令：

```bash
cd /Users/Admin/Downloads/Codex/2026-05-07/nfc-iphone-m-m-nfc-m
rsync -avz --delete dist/ root@47.243.252.80:/var/www/joyibird-nfc/
```

## Nginx 状态

Nginx 已安装并运行。默认欢迎页已替换为 H5。

配置文件：

```text
/etc/nginx/sites-available/joyibird-nfc
/etc/nginx/sites-enabled/joyibird-nfc
```

当前 HTTP 配置核心内容：

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/joyibird-nfc;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|webp|svg|ico|json)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }
}
```

已执行过：

```bash
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/joyibird-nfc /etc/nginx/sites-enabled/joyibird-nfc
nginx -t
systemctl reload nginx
```

## HTTPS

用户反馈“都没问题”，应优先确认：

```text
https://nfc.joyibird.cn/
```

如果后续发现 HTTPS 未配置或证书异常，在服务器执行：

```bash
ssh root@47.243.252.80
apt install certbot python3-certbot-nginx -y
certbot --nginx -d nfc.joyibird.cn
```

Certbot 过程中：

- 填邮箱。
- 同意条款。
- 如果询问是否把 HTTP 自动跳转 HTTPS，选择跳转。

证书续期检查：

```bash
certbot renew --dry-run
```

## NFC 写入

最终要写入 NFC 芯片的地址：

```text
https://nfc.joyibird.cn/
```

不要写：

```text
http://nfc.joyibird.cn/
http://47.243.252.80/
https://bird-mood-nfc.netlify.app/
```

批量写 NFC 的建议：

- 不能真正同时写 180 个 NFC 芯片。
- 用 NFC Tools 或 NXP TagWriter 的“连续写入 / 多标签写入”模式，一张一张快速写。
- 先写 3-5 个测试。
- 确认 iPhone、Android、微信内置浏览器都能打开。
- 实验阶段不建议锁定标签，方便后续重写。

## 用户数据影响

当前 H5 主要使用浏览器 `localStorage`。

只要用户始终访问同一个 origin：

```text
https://nfc.joyibird.cn/
```

从香港服务器切到国内备案服务器时，图鉴和每日抽签本地数据通常不会重置。原因是浏览器按协议 + 域名 + 端口隔离本地存储，而不是按服务器 IP。

会导致数据不自动保留的情况：

- 从旧 Netlify 域名切到 `nfc.joyibird.cn`。
- 从 HTTP 切 HTTPS，部分浏览器本地存储可能不共享。
- 用户换手机、换浏览器、清理网站数据。
- 代码改动导致 `localStorage` key 或鸟 `id` 变更。

## 后续切国内备案节点

用户计划短期用个人主体进行实验。后续可以同步走个人备案。备案通过后，迁移路径：

```text
当前：nfc.joyibird.cn -> 香港 ECS 47.243.252.80
未来：nfc.joyibird.cn -> 国内 ECS / OSS + CDN
```

切换只需修改 DNS：

- 国内 ECS：把 `nfc` A 记录改成国内服务器 IP。
- OSS/CDN：把 `nfc` 改为 CNAME 到 CDN 分配域名。

切换前建议：

- 提前把 DNS TTL 调低。
- 国内环境先用临时入口测通。
- 国内 HTTPS 证书配置完成后再改 DNS。
- 香港服务器保留 1-3 天，避免 DNS 缓存未刷新用户访问失败。

## 已知可忽略项

阿里云 ECS 控制台显示部分云监控插件安装失败，例如内存、云盘、网络流量监控。这不影响网站访问，可以暂时忽略。

## 接手建议

接手 agent 优先做这些检查：

1. 打开 `https://nfc.joyibird.cn/`，确认 H5 正常。
2. 检查 HTTP 是否自动跳 HTTPS。
3. 如要更新 H5，先本地 `npm run build`，再 `rsync` 上传。
4. 更新后用手机网络和微信内置浏览器做首屏验证。
5. 不要把 NFC 写成 IP 或 Netlify 域名。
