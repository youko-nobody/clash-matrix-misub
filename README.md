# Clash Matrix Studio

> 基于 [imzyb/MiSub](https://github.com/imzyb/MiSub) 改造的 Clash / Mihomo 订阅管理与配置生成面板。

Clash Matrix Studio 继承 MiSub 的 Cloudflare Pages、Vue 管理台、Pages Functions、KV/D1 存储、订阅组/Profile、备份恢复和诊断能力，并加入 Clash Matrix Studio V5.x 里沉淀下来的规则分流、节点解析和配置生成逻辑。

[无命令部署教程](docs/NO_COMMAND_DEPLOYMENT_ZH.md) | [完整小白部署教程](docs/DEPLOYMENT_ZH.md) | [迁移说明](CLASH_MATRIX_MIGRATION.md) | [第三方声明](THIRD_PARTY_NOTICES.md)

## 项目能做什么

- 管理机场订阅、手动节点和订阅组/Profile。
- 把多个订阅源和手动节点合并成一个客户端订阅链接。
- 输出 Clash / Mihomo、Sing-Box、Surge、Loon、Quantumult X、Shadowrocket、Base64 等格式。
- 内置 Matrix 分流规则，适合 Stash、FlClash、Clash Verge、Mihomo Party 等客户端。
- 支持可视化自定义规则，可以在后台新建策略组、写入域名/IP 规则。
- 支持 Fetch Proxy，用于解决部分机场屏蔽 Cloudflare 拉取订阅的问题。
- 支持节点预览、节点数量统计、订阅流量信息、备份恢复、公开订阅页和访问日志。

## 核心优势

- 完整借用 MiSub 的成熟管理台布局，订阅源、手动节点、Profile、公开页面、备份恢复、日志和诊断能力都在。
- 默认使用 `matrix` 内置规则等级，输出更贴近 Clash Matrix Studio 的分流习惯。
- 内置策略组包含 `PROXY`、`♻️ 自动测速`、`TG`、`AI`、`YOUTUBE`、`TIKTOK`、`APPLE`、`BANK`、`FINANCE`、`FAKE-LOCATION`、`BLOCK`、`FINAL` 等。
- 延迟测试链接默认使用 `http://www.google.com/blank.html`。
- BiliBili 规则默认直连，TikTok 有独立策略组。
- 保留轻量广告、HTTPDNS、DNS 劫持和隐私修复规则。
- 默认不输出 `privacy-protection-tools/anti-AD` 和 `REIJI007/AdBlock_Rule_For_Clash` 两个超大规则集，降低 Stash 等客户端导入后退出代理的概率。
- 规则源直接使用 `raw.githubusercontent.com`，不再默认添加 `https://mirror.ghproxy.com/` 前缀。
- 修复并增强节点解析：SS SIP002、URL 编码 Base64、VLESS IPv6、VLESS Reality、Shadowrocket 风格 VLESS 链接等。
- 默认对 Clash / Mihomo 输出加入更稳的基础项，例如 `allow-lan: false`、`ipv6: false`、`unified-delay: true`、`tcp-concurrent: true`。

## 单独加上的功能

- Matrix 可视化自定义规则：在后台新建策略组、写入域名/IP 规则，无需手写完整模板。
- TikTok 独立策略组，BiliBili 默认直连。
- Stash 一键导入强制使用 Clash YAML 链接。
- Fetch Proxy 支持自定义 User-Agent，用于处理部分机场屏蔽 Cloudflare 拉取的问题。
- 策略组图标、Matrix 规则源、节点解析和 Stash 兼容性均做了定制优化。

## 支持协议

- Shadowsocks / SS2022
- VMess
- VLESS
- Trojan
- Hysteria2 / HY2
- TUIC
- Snell
- WireGuard
- AnyTLS
- HTTPS
- SOCKS5 / SOCKS5-TLS

## 支持输出

- Clash / Mihomo YAML
- Sing-Box
- Surge
- Loon
- Quantumult X
- Shadowrocket
- V2rayN / V2rayNG
- Base64 节点订阅
- 第三方 subconverter 后端模式

## 部署方式

如果你不想使用命令行，直接看这份：

[无命令部署教程](docs/NO_COMMAND_DEPLOYMENT_ZH.md)

如果你想看更完整的新手教程，看这份：

[完整小白部署教程](docs/DEPLOYMENT_ZH.md)

### Cloudflare Pages 基本参数

```text
Framework preset: Vue
Build command: npm run build
Build output directory: dist
```

### 必需 KV 绑定

变量名必须是：

```text
MISUB_KV
```

KV 用来保存订阅源、手动节点、订阅组/Profile、自定义规则和后台设置。

### 推荐环境变量

| 变量名 | 说明 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理后台密码；未设置时默认是 `admin`，公开部署务必修改。 |
| `COOKIE_SECRET` | 登录 Cookie 签名密钥，建议设置长随机字符串。 |
| `CRON_SECRET` | 外部定时刷新接口密钥。 |
| `MISUB_PUBLIC_URL` | 项目公开访问地址，用于生成回调链接。 |
| `MISUB_CALLBACK_URL` | 订阅转换回调地址，优先级高于 `MISUB_PUBLIC_URL`。 |

### 可选 D1 绑定

个人使用只绑定 KV 就够了。订阅源很多、刷新频繁时，可以再启用 D1。

Pages 里绑定 D1 时变量名使用：

```text
MISUB_DB
```

## 使用方式

1. 访问部署后的 Pages 域名。
2. 使用 `ADMIN_PASSWORD` 登录管理后台。
3. 在订阅源里添加机场订阅链接，或在手动节点里粘贴单条节点。
4. 在订阅组/Profile 里选择需要组合的订阅源和手动节点。
5. 规则等级选择 `Matrix 分流`，或保持默认全局设置。
6. 复制生成的订阅链接，导入 Clash Verge、Mihomo Party、Stash、FlClash 等客户端。

如果某些客户端对 Reality、WebSocket TLS 或 IPv6 解析更严格，请先用节点预览检查最终 YAML，再根据客户端兼容性微调节点参数。

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

## 开源与规则集声明

本项目不内置真实代理节点、机场订阅、账号、Token 或私有凭据。项目生成的配置可能引用第三方规则集，这些规则集由各自上游维护，不属于 Clash Matrix Studio 自有资产。

本项目基于 MiSub 改造。MiSub 使用 MIT License，本仓库保留上游 LICENSE 和必要署名。更多规则集与第三方项目说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 安全提醒

不要把下面这些内容提交到 GitHub：

- 机场订阅链接
- 真实节点
- 管理员密码
- Cookie 密钥
- token
- 私人定制规则
- 本地专用 YAML 配置

推荐做法是：GitHub 只放代码，Cloudflare 后台放环境变量，项目后台放订阅和节点，私人模板放本地。

## 版本

当前版本：`v5.7.0`
