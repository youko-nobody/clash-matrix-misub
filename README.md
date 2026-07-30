# Clash Matrix Studio

<div align="center">

一个运行在 Cloudflare Pages 上的订阅管理、节点解析与 Matrix 分流配置生成面板。

[![Version](https://img.shields.io/badge/version-v5.8.0-2563eb?style=for-the-badge)](#v580-更新重点)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-f97316?style=for-the-badge)](#部署到-cloudflare-pages)
[![License](https://img.shields.io/badge/license-MIT-16a34a?style=for-the-badge)](LICENSE)

[快速部署](#部署到-cloudflare-pages) ·
[功能说明](#功能说明) ·
[Matrix 分流](#matrix-分流能力) ·
[使用流程](#使用流程) ·
[安全提醒](#开源与安全提醒)

</div>

基于 [MiSub](https://github.com/imzyb/MiSub) 改造，适合把多个机场订阅、手动节点和自定义规则统一整理成一个干净的订阅入口，再导入 Clash / Mihomo / Stash / FlClash 等客户端。

> [!TIP]
> 适合自用场景：多个订阅源、多个手动节点、一套固定分流规则、一个对外订阅链接。

> [!IMPORTANT]
> 本仓库只包含程序代码和内置模板，不包含真实节点、机场订阅、账号、密码、Token 或私人规则。

## v5.8.0 更新重点

| 类型 | 内容 |
| --- | --- |
| Bug 修复 | 修复部分机场订阅里的传统 Shadowsocks 节点无法识别、不会进入导出配置的问题。 |
| 解析策略 | 移除静态 SS 加密算法白名单。只要 SS 链接能解析，就先保留节点，最终是否可用交给客户端内核判断。 |
| 覆盖场景 | 已覆盖原始订阅文本、整份 Base64 订阅、`aes-256-cfb`、`rc4-md5`、`aes-256-gcm` 等场景。 |
| 保留能力 | SS2022 的必要校验和自动修复逻辑仍然保留。 |
| 首页体验 | GitHub 首页、公开订阅页、项目仓库链接和版本检查信息统一更新。 |

这次修复主要针对下面这类问题：

```text
机场订阅里明明有 ss:// 节点
但是导出的 Clash / Mihomo 配置里没有出现
```

现在的处理方式更稳：解析器只负责把节点正确读出来，不在解析阶段提前丢弃传统 SS 节点。

## 功能说明

| 功能 | 说明 |
| --- | --- |
| 订阅管理 | 添加、编辑、刷新机场订阅源。 |
| 手动节点 | 粘贴单条或多行节点链接，和机场订阅一起合并输出。 |
| 订阅组 Profile | 把多个订阅源、手动节点、自定义规则组合成一个公开订阅入口。 |
| 节点解析 | 支持 SS / SS2022、VMess、VLESS、Trojan、HY2、TUIC、Snell、WireGuard、AnyTLS、HTTP、SOCKS5 等协议。 |
| 兼容增强 | 支持 SS SIP002、整份 Base64 订阅、URL 编码 Base64、VLESS IPv6、Reality、Shadowrocket 风格 VLESS 链接。 |
| Fetch Proxy | 用专属拉取代理处理部分机场屏蔽 Cloudflare 拉取订阅的问题。 |
| 多格式输出 | 支持 Clash / Mihomo、Sing-Box、Surge、Loon、Quantumult X、Shadowrocket、V2rayN / V2rayNG、Base64 等格式。 |
| 公开订阅页 | 支持订阅卡片、复制链接、二维码、节点预览和一键导入。 |
| 数据存储 | 默认使用 KV，可选接入 D1。 |
| 运维能力 | 支持访问日志、备份恢复、定时刷新和版本检查。 |

## Matrix 分流能力

默认规则等级为 `matrix`，更贴近 Clash Matrix Studio 的使用习惯。

| 策略组 | 用途 |
| --- | --- |
| `PROXY` | 默认代理出口。 |
| `AUTO` | 自动测速选择节点。 |
| `TG` | Telegram 流量。 |
| `AI` | OpenAI、Claude、Gemini 等 AI 服务。 |
| `YOUTUBE` | YouTube 流量。 |
| `TIKTOK` | TikTok 独立分流。 |
| `APPLE` | Apple 服务。 |
| `BANK` / `FINANCE` | 银行、金融相关域名。 |
| `FAKE-LOCATION` | 容易暴露地区或定位异常的服务。 |
| `BLOCK` | 广告、劫持、恶意请求拦截。 |
| `FINAL` | 兜底规则。 |

内置规则特点：

- BiliBili 默认直连。
- 小红书默认直连。
- TikTok 使用独立策略组。
- 支持局域网、内网地址过滤。
- 支持可视化自定义规则，不需要手写完整 YAML。
- 延迟测试链接默认使用 `http://www.google.com/blank.html`。
- 规则源直接使用 `raw.githubusercontent.com`，不再默认添加 `https://mirror.ghproxy.com/` 前缀。
- 默认保留轻量广告、HTTPDNS、DNS 劫持和隐私修复规则。
- 默认不输出 `privacy-protection-tools/anti-AD` 和 `REIJI007/AdBlock_Rule_For_Clash` 两个超大规则集，降低 Stash 等客户端导入后退出代理的概率。

## 部署到 Cloudflare Pages

不想使用命令行的用户，建议直接看：

- [无命令部署教程](docs/NO_COMMAND_DEPLOYMENT_ZH.md)
- [完整小白部署教程](docs/DEPLOYMENT_ZH.md)

Cloudflare Pages 构建参数：

| 项目 | 填写内容 |
| --- | --- |
| Framework preset | `Vue` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空或仓库根目录 |

必须绑定 KV：

| 绑定类型 | 绑定名 |
| --- | --- |
| KV Namespace | `MISUB_KV` |

可选绑定 D1：

| 绑定类型 | 绑定名 |
| --- | --- |
| D1 Database | `MISUB_DB` |

推荐环境变量：

| 变量名 | 说明 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理后台密码。未设置时默认是 `admin`，公开部署务必修改。 |
| `COOKIE_SECRET` | 登录 Cookie 签名密钥，建议设置长随机字符串。 |
| `CRON_SECRET` | 外部定时刷新接口密钥。 |
| `MISUB_PUBLIC_URL` | 项目公开访问地址，用于生成回调链接。 |
| `MISUB_CALLBACK_URL` | 订阅转换回调地址，优先级高于 `MISUB_PUBLIC_URL`。 |

> [!WARNING]
> 公开部署时一定要修改 `ADMIN_PASSWORD`，并设置足够长的 `COOKIE_SECRET`。

## 使用流程

1. 访问部署后的 Cloudflare Pages 域名。
2. 使用 `ADMIN_PASSWORD` 登录管理后台。
3. 在“我的订阅”添加机场订阅链接。
4. 在“手动节点”粘贴单条或多行节点链接。
5. 在“订阅组 Profile”里选择需要组合的订阅源和手动节点。
6. 根据需要选择 `Matrix 分流`，或使用默认规则。
7. 复制生成的公开订阅链接。
8. 导入 Clash Verge、Mihomo Party、Stash、FlClash 等客户端。

如果某些客户端对 Reality、WebSocket TLS 或 IPv6 参数更严格，可以先用节点预览检查最终 YAML，再按客户端兼容性微调。

## 本地开发

安装依赖：

```bash
npm install
```

启动前端开发服务：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

运行测试：

```bash
npm run test:run
```

## 常用检查

| 目标 | 命令 |
| --- | --- |
| 构建项目 | `npm run build` |
| 运行测试 | `npm run test:run` |
| 本地预览 | `npm run preview` |
| Cloudflare 本地调试 | `npx wrangler pages dev dist` |

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

推荐做法：

| 内容 | 放在哪里 |
| --- | --- |
| 项目代码 | GitHub 仓库 |
| 环境变量 | Cloudflare Pages 后台 |
| 机场订阅 | 项目管理后台 |
| 手动节点 | 项目管理后台 |
| 私人规则 | 项目管理后台 |

## 相关文档

- [无命令部署教程](docs/NO_COMMAND_DEPLOYMENT_ZH.md)
- [完整小白部署教程](docs/DEPLOYMENT_ZH.md)
- [迁移说明](CLASH_MATRIX_MIGRATION.md)
- [第三方声明](THIRD_PARTY_NOTICES.md)

当前版本：`v5.8.0`
