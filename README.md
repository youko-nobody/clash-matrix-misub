# Clash Matrix Studio

基于 [MiSub](https://github.com/imzyb/MiSub) 改造的 Clash / Mihomo 订阅管理与配置生成面板。项目运行在 Cloudflare Pages + Pages Functions 上，使用 KV / D1 保存数据。

这个仓库只包含程序代码，不包含真实节点、机场订阅、账号、密码、Token 或私人规则。

[无命令部署教程](docs/NO_COMMAND_DEPLOYMENT_ZH.md) · [完整小白部署教程](docs/DEPLOYMENT_ZH.md) · [迁移说明](CLASH_MATRIX_MIGRATION.md) · [第三方声明](THIRD_PARTY_NOTICES.md)

## v5.8.0 更新

### 本次修复的 Bug

- 修复部分机场订阅里的传统 Shadowsocks 节点无法识别、不会出现在导出配置里的问题。
- 原因是旧版本在解析阶段使用了静态 SS 加密算法白名单，导致 `aes-256-cfb`、`rc4-md5`、`chacha20` 等旧式但仍可解析的 SS 节点被提前丢弃。
- 现在改为：只要 SS 链接能解析，就先保留下来；最终是否能连接交给 Clash / Mihomo / Stash / FlClash 等客户端内核判断。
- 原始订阅文本和整份 Base64 编码订阅都已覆盖测试。
- SS2022 的必要校验和自动修复逻辑仍然保留。

### 首页与体验优化

- 重做默认公开首页，首屏更清爽，订阅组入口更明确。
- 首页加入 v5.8.0 更新说明，直接展示本次 SS 解析修复和核心功能。
- 公开订阅组卡片改为更紧凑的操作布局：一键导入、节点预览、复制链接、二维码更容易找到。
- GitHub 按钮、页脚链接和版本检查仓库已统一指向本项目仓库。

## 功能概览

- 管理机场订阅、手动节点和订阅组 Profile。
- 合并多个订阅源和手动节点，生成一个对外订阅链接。
- 输出 Clash / Mihomo、Sing-Box、Surge、Loon、Quantumult X、Shadowrocket、V2rayN / V2rayNG、Base64 等格式。
- 支持 Shadowsocks / SS2022、VMess、VLESS、Trojan、Hysteria2 / HY2、TUIC、Snell、WireGuard、AnyTLS、HTTP、SOCKS5 等协议。
- 支持 SS SIP002、整份 Base64 订阅、URL 编码 Base64、VLESS IPv6、VLESS Reality、Shadowrocket 风格 VLESS 链接解析。
- 支持 Fetch Proxy 和自定义 User-Agent，用于处理部分机场屏蔽 Cloudflare 拉取订阅的问题。
- 支持节点预览、二维码、公开订阅页、访问日志、备份恢复、可选 D1 存储。

## Matrix 定制能力

- 默认规则等级为 `matrix`，更贴近 Clash Matrix Studio 的分流习惯。
- 内置策略组包含 `PROXY`、自动测速、`TG`、`AI`、`YOUTUBE`、`TIKTOK`、`APPLE`、`BANK`、`FINANCE`、`FAKE-LOCATION`、`BLOCK`、`FINAL` 等。
- BiliBili 默认直连，TikTok 独立策略组。
- 支持可视化自定义规则：可以在后台新建策略组，写入域名 / IP 规则，不必手写完整 YAML 模板。
- 延迟测试链接默认使用 `http://www.google.com/blank.html`。
- 规则源直接使用 `raw.githubusercontent.com`，不再默认添加 `https://mirror.ghproxy.com/` 前缀。
- 默认保留轻量广告、HTTPDNS、DNS 劫持和隐私修复规则。
- 默认不输出 `privacy-protection-tools/anti-AD` 和 `REIJI007/AdBlock_Rule_For_Clash` 两个超大规则集，降低 Stash 等客户端导入后退出代理的概率。
- Clash / Mihomo 输出默认包含更稳的基础项，例如 `allow-lan: false`、`ipv6: false`、`unified-delay: true`、`tcp-concurrent: true`。

## 部署到 Cloudflare Pages

不想使用命令行的用户，建议直接看：[无命令部署教程](docs/NO_COMMAND_DEPLOYMENT_ZH.md)。

Cloudflare Pages 构建参数：

```text
Framework preset: Vue
Build command: npm run build
Build output directory: dist
```

必须绑定 KV，绑定名固定为：

```text
MISUB_KV
```

可选绑定 D1，绑定名固定为：

```text
MISUB_DB
```

推荐环境变量：

| 变量名 | 说明 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理后台密码。未设置时默认是 `admin`，公开部署务必修改。 |
| `COOKIE_SECRET` | 登录 Cookie 签名密钥，建议设置长随机字符串。 |
| `CRON_SECRET` | 外部定时刷新接口密钥。 |
| `MISUB_PUBLIC_URL` | 项目公开访问地址，用于生成回调链接。 |
| `MISUB_CALLBACK_URL` | 订阅转换回调地址，优先级高于 `MISUB_PUBLIC_URL`。 |

## 使用方法

1. 访问部署后的 Pages 域名。
2. 使用 `ADMIN_PASSWORD` 登录管理后台。
3. 在“我的订阅”添加机场订阅链接，或在“手动节点”粘贴单条 / 多行节点。
4. 在“订阅组 Profile”里选择需要组合的订阅源和手动节点。
5. 规则等级选择 `Matrix 分流`，或保持默认全局设置。
6. 复制生成的订阅链接，导入 Clash Verge、Mihomo Party、Stash、FlClash 等客户端。
7. 如果某些客户端对 Reality、WebSocket TLS 或 IPv6 解析更严格，可以先用节点预览检查最终 YAML，再按客户端兼容性微调参数。

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

测试：

```bash
npm run test:run
```

## 开源与安全提醒

本项目基于 MiSub 改造。MiSub 使用 MIT License，本仓库保留上游 LICENSE 和必要署名。更多规则集与第三方项目说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

请不要把下面内容提交到 GitHub：

- 机场订阅链接
- 真实节点
- 管理员密码
- Cookie 密钥
- token
- 私人定制规则
- 本地专用 YAML 配置

推荐做法：GitHub 只放代码；Cloudflare 后台放环境变量；项目后台放订阅、节点和私人规则。

当前版本：`v5.8.0`
