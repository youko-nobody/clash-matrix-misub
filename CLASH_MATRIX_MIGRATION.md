# Clash Matrix Studio on MiSub

本目录是 Clash Matrix Studio 的新架构底座：整体借用 MiSub 的 Cloudflare Pages + Vue 管理台 + Pages Functions 能力，并加入 Clash Matrix Studio V5.x 的专属配置生成逻辑。

## 已加入的 Clash Matrix 特性

- 默认项目名改为 `Clash Matrix Studio`，版本从 `5.7.0` 开始。
- 默认内置规则等级改为 `matrix`。
- 新增 `matrix` 分流方案：
  - `PROXY`
  - `Emby代理`
  - `TG`
  - `AI`
  - `YOUTUBE`
  - `TIKTOK`
  - `FINAL`
  - `BLOCK`
  - `APPLE`
  - `BANK`
  - `FINANCE`
  - `FAKE-LOCATION`
  - `♻️ 自动测速`
- Matrix 测速链接使用 `http://www.google.com/blank.html`。
- BiliBili 规则直连，TikTok 进入 `TIKTOK` 分组。
- 加入 Clash Matrix 使用过的去广告、DNS 防污染、AI、Apple、Aqara、Bank、Finance、FakeLocation 等规则源。
- 规则源使用 `raw.githubusercontent.com`，不再加 `https://mirror.ghproxy.com/` 前缀。
- 节点链接解析补强：
  - SS SIP002 / URL 编码 Base64 userinfo
  - VLESS IPv6 `[addr]:port`
  - VLESS Reality
  - Shadowrocket 风格 `vless://base64(...)?remarks=...&tls=1&peer=...&xtls=2&pbk=...&sid=...`
  - `peer` 映射到 `servername/sni`
  - `xtls=2` 映射到 `xtls-rprx-vision`

## 部署方式

这个新底座不再是单文件 Cloudflare Worker，而是 Cloudflare Pages 项目。

本地开发：

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

Cloudflare Pages：

- 构建命令：`npm run build`
- 输出目录：`dist`
- KV 绑定：`MISUB_KV`
- 可选 D1 绑定：`MISUB_DB`

## 迁移说明

旧版 `Clash Matrix Studio V5.6.js` 仍保留在仓库根目录，用于回退和对照。

新版本优先使用 MiSub 的订阅管理、手动节点、Profile、KV/D1、公开页、备份恢复和操作符链能力。Clash Matrix 旧版中的特殊逻辑会逐步迁移到：

- `functions/utils/url-to-clash.js`
- `functions/modules/subscription/builtin-rules-provider.js`
- `functions/modules/subscription/builtin-clash-generator.js`
- `src/components/settings/sections/ServiceSettings/TransformCard.vue`
- `src/components/modals/ProfileModal/ProfileForm.vue`

## 上游声明

本目录基于 `imzyb/MiSub` 改造。MiSub 采用 MIT License。保留上游 LICENSE、文档和源码声明。
