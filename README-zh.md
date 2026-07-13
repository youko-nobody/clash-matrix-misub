# Clash Matrix Studio

> 基于 [imzyb/MiSub](https://github.com/imzyb/MiSub) 改造的 Clash / Mihomo 订阅管理与配置生成面板。

Clash Matrix Studio 继承 MiSub 的 Cloudflare Pages + Vue 管理台 + Pages Functions 架构，并加入 Clash Matrix Studio V5.x 里沉淀下来的规则分流、节点解析和配置生成逻辑。旧版单文件 Worker 仍可作为回退方案，新版推荐使用本目录的 Pages 项目。

[English](README.md) | [迁移说明](CLASH_MATRIX_MIGRATION.md) | [第三方声明](THIRD_PARTY_NOTICES.md)

## 核心优势

- 完整借用 MiSub 的成熟管理台布局：订阅源、手动节点、订阅组/Profile、公开页面、备份恢复、日志和诊断能力都在。
- 默认使用 `matrix` 内置规则等级，输出更贴近 Clash Matrix Studio 的分流习惯。
- 内置策略组包含 `PROXY`、`♻️ 自动测速`、`TG`、`AI`、`YOUTUBE`、`TIKTOK`、`APPLE`、`BANK`、`FINANCE`、`FAKE-LOCATION`、`BLOCK`、`FINAL` 等。
- 延迟测试链接默认使用 `http://www.google.com/blank.html`。
- BiliBili 规则默认直连，TikTok 有独立策略组。
- 去广告规则集接入 `privacy-protection-tools/anti-AD` 和 `REIJI007/AdBlock_Rule_For_Clash`。
- 规则源直接使用 `raw.githubusercontent.com`，不再默认添加 `https://mirror.ghproxy.com/` 前缀。
- 修复并增强节点解析：SS SIP002、URL 编码 Base64、VLESS IPv6、VLESS Reality、Shadowrocket 风格 VLESS 链接。
- 默认对 Clash / Mihomo 输出加入更稳的基础项，例如 `allow-lan: false`、`ipv6: false`、`unified-delay: true`、`tcp-concurrent: true`。

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

## 部署到 Cloudflare Pages

1. Fork 或上传本仓库。
2. 进入 Cloudflare Dashboard。
3. 打开 `Workers & Pages`，创建 Pages 项目并连接 GitHub 仓库。
4. 构建设置：
   - Framework preset: `Vue`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 部署完成后，在 Pages 项目的 `Settings` -> `Functions` 里绑定 KV。
6. 设置环境变量后重新部署。

### 必需 KV 绑定

变量名必须是：

```text
MISUB_KV
```

内部仍沿用 MiSub 的存储绑定名，这是为了保持上游架构兼容，不影响项目对外名称。

### 可选 D1 绑定

如果订阅源很多、刷新频繁，建议启用 D1：

```bash
wrangler d1 create clash-matrix-studio
wrangler d1 execute clash-matrix-studio --file=schema.sql --remote
```

Pages 里绑定 D1 时变量名使用：

```text
MISUB_DB
```

### 推荐环境变量

| 变量名 | 说明 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理后台密码；未设置时默认是 `admin`，公开部署务必修改。 |
| `COOKIE_SECRET` | 登录 Cookie 签名密钥，建议设置长随机字符串。 |
| `CRON_SECRET` | 外部定时刷新接口密钥。 |
| `MISUB_PUBLIC_URL` | 项目公开访问地址，用于生成回调链接。 |
| `MISUB_CALLBACK_URL` | 订阅转换回调地址，优先级高于 `MISUB_PUBLIC_URL`。 |

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

## 使用方式

1. 访问部署后的 Pages 域名。
2. 使用 `ADMIN_PASSWORD` 登录管理后台。
3. 在“订阅源”里添加机场订阅链接，或在“手动节点”里粘贴单条节点。
4. 在“订阅组/Profile”里选择需要组合的订阅源和手动节点。
5. 规则等级选择 `Matrix 分流`，或保持默认全局设置。
6. 复制生成的订阅链接，导入 Clash Verge、Mihomo Party、Stash、FlClash 等客户端。

如果某些客户端对 Reality、WebSocket TLS 或 IPv6 解析更严格，请先用“节点预览”检查最终 YAML，再根据客户端兼容性微调节点参数。

## 开源与规则集声明

本项目不内置真实代理节点、机场订阅、账号、Token 或私有凭据。项目生成的配置可能引用第三方规则集，这些规则集由各自上游维护，不属于 Clash Matrix Studio 自有资产。

本项目基于 MiSub 改造。MiSub 使用 MIT License，本仓库保留上游 LICENSE 和必要署名。更多规则集与第三方项目说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 版本

当前版本：`v5.7.0`
