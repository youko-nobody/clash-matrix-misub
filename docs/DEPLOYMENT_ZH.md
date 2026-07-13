# Clash Matrix Studio 小白部署教程

这份教程面向第一次使用 Cloudflare Pages 的用户。照着做即可把项目部署成自己的订阅管理面板。

## 项目能做什么

- 管理机场订阅、手动节点和订阅组/Profile。
- 把多个订阅和手动节点合并成一个客户端订阅链接。
- 输出 Clash / Mihomo、Sing-Box、Surge、Loon、Quantumult X、Base64 等格式。
- 内置 Matrix 分流规则，包含 `PROXY`、`TG`、`AI`、`YOUTUBE`、`TIKTOK`、`APPLE`、`BANK`、`FINANCE`、`FAKE-LOCATION`、`BLOCK`、`FINAL` 等策略组。
- 支持节点预览、节点数量统计、订阅流量信息、备份恢复、公开订阅页和访问日志。
- 支持可选 Fetch Proxy，用于解决部分机场屏蔽 Cloudflare 拉取订阅的问题。

## 本项目单独加上的功能

这些是相对原 MiSub 额外加入或重点改造的部分：

- 默认使用 `matrix` 内置规则等级，更接近 Clash Matrix Studio V5.x 的分流习惯。
- 新增 Matrix 可视化自定义规则：可以在管理界面中新建策略组、写入域名/IP 规则，不需要手写完整模板。
- 新增 TikTok 独立策略组，BiliBili 规则默认直连。
- 策略组支持 Qure 图标，但不改变策略组名称，方便 Stash、Mihomo 等客户端识别。
- 延迟测试链接改为 `http://www.google.com/blank.html`。
- 移除 `mirror.ghproxy.com` 前缀，规则源直接使用 `raw.githubusercontent.com`。
- 移除 `privacy-protection-tools/anti-AD` 和 `REIJI007/AdBlock_Rule_For_Clash` 两个超大规则集，避免 Stash 等客户端导入后因规则过大退出代理。
- 保留较轻量的广告、HTTPDNS、DNS 劫持和隐私修复规则。
- 强化节点解析：SS SIP002、URL 编码 Base64、VLESS IPv6、VLESS Reality、Shadowrocket 风格 VLESS 链接等。
- Stash 一键导入会强制使用 Clash YAML 链接，避免被当作普通 Base64 节点订阅。
- Fetch Proxy 支持自定义 User-Agent，部分机场必须指定 UA 才能拉取订阅。
- Matrix 输出默认加入更稳的 Clash/Mihomo 基础项，例如 `allow-lan: false`、`ipv6: false`、`unified-delay: true`、`tcp-concurrent: true`。

## 准备账号

你需要：

- 一个 GitHub 账号。
- 一个 Cloudflare 账号。
- 已经 Fork 或上传好的本项目仓库。

不要把自己的机场订阅、节点、token、密码写进 GitHub 仓库。它们应该在部署后的管理后台里添加。

## 方法一：Cloudflare 网页部署

这是最适合小白的方式。

### 1. 导入 GitHub 仓库

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Pages`。
5. 点击 `Connect to Git`，授权 GitHub。
6. 选择你的 `clash-matrix-misub` 仓库。

### 2. 填写构建设置

构建设置填写：

```text
Framework preset: Vue
Build command: npm run build
Build output directory: dist
```

如果 Cloudflare 让你填写 Root directory：

```text
/
```

如果你不是把 `clash-matrix-misub` 单独作为仓库上传，而是把它放在更大的目录里，Root directory 才填写：

```text
clash-matrix-misub
```

然后点击 `Save and Deploy`。

### 3. 创建 KV 存储

项目需要 KV 保存设置、订阅源和订阅组。

1. 在 Cloudflare 左侧进入 `Workers & Pages`。
2. 找到 `KV` 或 `Workers KV`。
3. 点击 `Create a namespace`。
4. 名字可以填：

```text
clash-matrix-misub-kv
```

这个名字只是 Cloudflare 后台显示名，不是代码绑定名。

### 4. 绑定 KV 到 Pages

1. 回到你的 Pages 项目。
2. 进入 `Settings`。
3. 打开 `Functions`。
4. 找到 `KV namespace bindings`。
5. 分别在 `Production` 和 `Preview` 里添加绑定。
6. 变量名必须填：

```text
MISUB_KV
```

7. KV namespace 选择你刚创建的 KV。

绑定名必须是 `MISUB_KV`，否则项目读不到数据。

### 5. 设置环境变量

在 Pages 项目的 `Settings` -> `Environment variables` 里添加：

| 变量名 | 是否必须 | 说明 |
| --- | --- | --- |
| `ADMIN_PASSWORD` | 建议必须 | 管理后台登录密码。不设置会默认 `admin`，公开部署很危险。 |
| `COOKIE_SECRET` | 建议必须 | 登录 Cookie 密钥，填一串长随机字符。 |
| `MISUB_PUBLIC_URL` | 推荐 | 你的 Pages 访问地址，例如 `https://你的项目.pages.dev`。 |
| `MISUB_CALLBACK_URL` | 可选 | 回调地址。一般和 `MISUB_PUBLIC_URL` 一样即可。 |
| `CRON_SECRET` | 可选 | 定时刷新接口密钥。不用定时刷新可以不填。 |

示例：

```text
ADMIN_PASSWORD=换成你自己的强密码
COOKIE_SECRET=随便生成一串很长的随机字符
MISUB_PUBLIC_URL=https://your-project.pages.dev
```

设置完环境变量后，重新部署一次。

### 6. 重新部署

进入 Pages 项目的 `Deployments`，找到最新部署，点击 `Retry deployment`。

部署成功后，打开 Cloudflare 给你的域名。

## 方法二：本地命令部署

适合已经会用命令行的用户。

### 1. 安装依赖

```bash
npm install
```

### 2. 本地构建

```bash
npm run build
```

### 3. 登录 Cloudflare

```bash
npx wrangler login
```

### 4. 部署 Pages

```bash
npx wrangler pages deploy dist --project-name clash-matrix-misub --commit-dirty=true
```

如果你使用自己的 Pages 项目名，把 `clash-matrix-misub` 换成你的项目名。

命令部署后，仍然需要在 Cloudflare Pages 后台绑定 KV，变量名仍然是：

```text
MISUB_KV
```

## 可选：启用 D1

KV 已经够大多数个人用户使用。订阅源很多、刷新很频繁时，可以再启用 D1。

创建 D1：

```bash
npx wrangler d1 create clash-matrix-studio
```

初始化表结构：

```bash
npx wrangler d1 execute clash-matrix-studio --file=schema.sql --remote
```

在 Pages 的 `Settings` -> `Functions` -> `D1 database bindings` 里添加绑定：

```text
MISUB_DB
```

## 第一次使用

1. 打开部署后的域名。
2. 使用 `ADMIN_PASSWORD` 登录。
3. 进入设置页，确认或修改主订阅 token、订阅组分享 token。
4. 在订阅源里添加机场订阅链接。
5. 在手动节点里添加单条节点链接。
6. 在订阅组/Profile 里选择要合并的订阅源和手动节点。
7. 规则等级选择 `Matrix 分流`，或保持默认设置。
8. 复制订阅组链接，导入 Stash、FlClash、Clash Verge、Mihomo Party 等客户端。

## 自定义规则怎么用

1. 进入管理后台。
2. 打开 `设置`。
3. 进入 `自定义规则`。
4. 在 `新建策略组` 中添加一个策略组，例如 `MY-MEDIA`。
5. 在 `写入域名规则` 中添加规则，例如：

```text
DOMAIN-SUFFIX,example.com,MY-MEDIA
```

6. 点击页面底部保存。
7. 重新拉取客户端订阅。

这些规则会插入到 Matrix 内置规则之前，优先级更高。

## 常见问题

### 打开网站后登录密码是什么？

如果你设置了 `ADMIN_PASSWORD`，就用你设置的密码。如果没设置，默认是：

```text
admin
```

公开部署一定要改掉默认密码。

### Stash 导入后几秒退出代理怎么办？

先更新到最新代码并重新部署。本项目已经移除了两个超大广告规则集，避免 Stash 启动时解析规则过重。

如果仍然退出，打开 Stash 的配置日志，看是否是某个节点协议不兼容、规则集下载失败，或订阅链接不是 Clash YAML。

### 为什么访问分享链接看到的是一串 Base64？

浏览器直接打开默认可能返回 Base64 节点订阅。Stash、Clash、Mihomo 等客户端会通过 User-Agent 或 `?target=clash` 获取 YAML。

手动复制给 Stash 时，建议使用：

```text
https://你的域名/分享token/订阅组ID?target=clash
```

### 机场订阅拉取失败怎么办？

有些机场会屏蔽 Cloudflare 出口 IP。可以给该订阅源配置 Fetch Proxy。详细教程见：

[Fetch Proxy 部署指南](fetch-proxy-tutorial.md)

### 要不要启用 D1？

个人使用一般 KV 就够了。节点、订阅组、设置很多，或者想要更稳定的数据结构，再启用 D1。

## 安全提醒

- 不要把真实节点、机场订阅、订阅 token、管理密码提交到 GitHub。
- `ADMIN_PASSWORD` 必须修改。
- `COOKIE_SECRET` 建议使用长随机字符。
- 公开分享订阅组前，确认里面没有不想公开的节点。
- 规则集来自第三方仓库，维护权属于对应项目。
