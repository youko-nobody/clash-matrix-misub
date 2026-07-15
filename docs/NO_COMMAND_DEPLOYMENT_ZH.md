# Clash Matrix MiSub 无命令部署教程

这份教程适合完全不想使用命令行的新手用户。全程只需要使用 GitHub 网页和 Cloudflare 网页后台。

项目地址：

```text
https://github.com/youko-nobody/clash-matrix-misub
```

## 一、项目说明

`clash-matrix-misub` 是一个部署在 Cloudflare Pages 上的订阅管理和配置生成工具。

它可以用来：

- 管理机场订阅。
- 管理手动节点。
- 创建 Profile / 订阅组。
- 合并多个订阅源。
- 输出 Clash / Mihomo / Stash / FlClash 可用的配置。
- 使用 Matrix 内置分流规则。
- 添加自定义策略组和自定义规则。
- 使用 Fetch Proxy 解决部分机场屏蔽 Cloudflare 拉取的问题。

## 二、部署前准备

你需要准备：

- 一个 GitHub 账号。
- 一个 Cloudflare 账号。
- 一个自己的后台登录密码。

请注意：

- 不要把真实机场订阅上传到 GitHub。
- 不要把真实节点上传到 GitHub。
- 不要把 token、密码、私人规则上传到 GitHub。
- GitHub 仓库只放项目代码。
- 订阅、节点、规则都应该在部署完成后的后台里添加。

## 三、Fork 项目到自己的 GitHub

1. 打开项目仓库：

```text
https://github.com/youko-nobody/clash-matrix-misub
```

2. 点击右上角 `Fork`。

3. 选择自己的 GitHub 账号。

4. 等待 Fork 完成。

完成后，你会得到一个自己的仓库，例如：

```text
https://github.com/你的用户名/clash-matrix-misub
```

## 四、创建 Cloudflare Pages 项目

1. 打开 Cloudflare 后台。

2. 进入：

```text
Workers & Pages
```

3. 点击：

```text
Create application
```

4. 选择：

```text
Pages
```

5. 点击：

```text
Connect to Git
```

6. 授权 Cloudflare 访问 GitHub。

7. 选择你刚刚 Fork 的仓库：

```text
clash-matrix-misub
```

8. 点击开始设置。

## 五、填写构建设置

Cloudflare 会让你填写构建参数。

按下面这样填写：

```text
Framework preset: Vue
Build command: npm run build
Build output directory: dist
Root directory: /
```

如果 `Root directory` 可以留空，也可以留空。

如果你的仓库根目录就是 `clash-matrix-misub` 项目，那么不要填写子目录。

最重要的是这两项：

```text
Build command: npm run build
Build output directory: dist
```

填写完成后，点击：

```text
Save and Deploy
```

第一次部署可能会失败，因为还没有绑定 KV。这个是正常的，继续下一步。

## 六、创建 KV 存储

项目需要 KV 保存后台数据。

KV 会保存：

- 机场订阅。
- 手动节点。
- Profile / 订阅组。
- 自定义规则。
- 后台设置。
- 访问记录。
- 备份设置。

创建步骤：

1. 在 Cloudflare 后台进入：

```text
Workers & Pages
```

2. 找到：

```text
KV
```

3. 点击：

```text
Create namespace
```

4. 名字可以填写：

```text
clash-matrix-misub-kv
```

这个名字只是 Cloudflare 后台显示名称，不是项目代码里的绑定名。

## 七、绑定 KV 到 Pages 项目

1. 回到你的 Pages 项目。

2. 进入：

```text
Settings
```

3. 进入：

```text
Functions
```

4. 找到：

```text
KV namespace bindings
```

5. 添加 KV 绑定。

绑定变量名必须填写：

```text
MISUB_KV
```

KV namespace 选择你刚刚创建的：

```text
clash-matrix-misub-kv
```

建议 `Production` 和 `Preview` 都绑定。

这里非常重要：

```text
变量名必须是 MISUB_KV
```

不能写成 `KV`、`KV_STORAGE`、`MISUB_DB` 或其他名字。

## 八、设置环境变量

进入 Pages 项目：

```text
Settings
Environment variables
```

添加下面几个变量。

### 必填推荐

```text
ADMIN_PASSWORD=你的后台登录密码
COOKIE_SECRET=一串很长的随机字符
MISUB_PUBLIC_URL=https://你的项目.pages.dev
```

### 可选

```text
CRON_SECRET=一串随机字符
MISUB_CALLBACK_URL=https://你的项目.pages.dev
```

变量说明：

| 变量名 | 作用 |
| --- | --- |
| `ADMIN_PASSWORD` | 后台登录密码。不设置会默认 `admin`，公开部署不安全。 |
| `COOKIE_SECRET` | 登录 Cookie 签名密钥。建议使用很长的随机字符。 |
| `MISUB_PUBLIC_URL` | 你的公开访问地址，用于生成订阅链接。 |
| `MISUB_CALLBACK_URL` | 回调地址，通常可以不填。 |
| `CRON_SECRET` | 定时刷新接口密钥，不用定时刷新可以不填。 |

`COOKIE_SECRET` 示例：

```text
my_random_cookie_secret_2026_please_change_this_to_yours
```

不要直接照抄示例，建议改成自己的随机字符。

## 九、重新部署

绑定 KV 和设置环境变量后，需要重新部署一次。

进入：

```text
Pages 项目
Deployments
```

找到最新部署，点击：

```text
Retry deployment
```

等待部署成功。

部署完成后，Cloudflare 会给你一个访问地址，例如：

```text
https://clash-matrix-misub.pages.dev
```

## 十、第一次登录后台

打开你的 Pages 地址。

使用你设置的密码登录：

```text
ADMIN_PASSWORD
```

如果你没有设置 `ADMIN_PASSWORD`，默认密码是：

```text
admin
```

公开部署一定不要使用默认密码。

## 十一、添加订阅和创建 Profile

登录后台后，推荐按这个顺序操作：

1. 进入订阅源管理。
2. 添加机场订阅链接。
3. 如果有单独节点，进入手动节点管理添加。
4. 创建 Profile / 订阅组。
5. 在 Profile 里选择需要包含的订阅源和手动节点。
6. 规则等级选择默认 Matrix 规则。
7. 保存 Profile。
8. 复制生成的订阅链接。
9. 导入 Stash、FlClash、Clash Verge、Mihomo Party 等客户端。

## 十二、客户端导入建议

Stash、FlClash、Clash Verge、Mihomo Party 推荐使用 Clash YAML 链接。

常见格式类似：

```text
https://你的域名/sharexxxx/profileId?clash
```

或：

```text
https://你的域名/sharexxxx/profileId?target=clash
```

如果浏览器打开看到一串 Base64，不一定是错误。客户端会根据格式或参数获取对应配置。

## 十三、自定义规则使用方式

后台支持可视化添加自定义规则。

一般流程：

1. 打开后台。
2. 进入设置。
3. 找到自定义规则模块。
4. 如果需要新分组，先新建策略组。
5. 再写入域名规则或 IP 规则。
6. 保存。
7. 客户端重新拉取订阅。

规则示例：

```text
DOMAIN-SUFFIX,example.com,PROXY
DOMAIN-SUFFIX,bilibili.com,DIRECT
DOMAIN-SUFFIX,emby.example.com,Emby代理
```

自定义规则通常会放在内置规则前面，因此优先级更高。

## 十四、绑定自定义域名

如果不想使用 `pages.dev` 域名，可以绑定自己的域名。

进入 Pages 项目：

```text
Custom domains
Set up a custom domain
```

填写你的域名，例如：

```text
sub.example.com
```

如果域名也托管在 Cloudflare，系统通常会自动添加 DNS。

绑定完成后，记得把环境变量改成你的新域名：

```text
MISUB_PUBLIC_URL=https://sub.example.com
```

然后重新部署一次。

## 十五、D1 要不要配置

新手可以先不配置 D1。

KV 已经足够个人使用。

D1 是可选项，适合：

- 订阅源很多。
- Profile 很多。
- 数据量比较大。
- 希望使用数据库结构保存数据。

如果只是自己用，先用 KV 就可以。

## 十六、Fetch Proxy 是什么

有些机场会屏蔽 Cloudflare 的访问。

表现通常是：

- 机场订阅在浏览器里能打开。
- 放进项目后台却拉取失败。
- 节点数量是 0。
- 提示订阅获取失败。

这种情况可以使用 Fetch Proxy。

Fetch Proxy 的作用是：

```text
Cloudflare 项目
→ 请求你的 Fetch Proxy
→ Fetch Proxy 去拉机场订阅
→ 返回给 Cloudflare 项目
```

这样机场看到的是你的 VPS 请求，而不是 Cloudflare 请求。

## 十七、常见问题

### 1. 部署后保存失败

大概率是 KV 没绑定好。

检查：

```text
Settings
Functions
KV namespace bindings
```

绑定名必须是：

```text
MISUB_KV
```

### 2. 登录密码不对

检查环境变量：

```text
ADMIN_PASSWORD
```

修改后需要重新部署。

### 3. 导入客户端没有节点

可能原因：

- 机场订阅链接失效。
- 机场屏蔽 Cloudflare。
- 订阅需要特殊 User-Agent。
- Profile 没选择订阅源。
- 订阅源拉取失败。

可以尝试：

- 重新复制机场订阅。
- 使用 Fetch Proxy。
- 检查后台节点预览。
- 重新保存 Profile。

### 4. Stash 导入后几秒退出代理

可能原因：

- 某些规则集太大。
- 节点协议不兼容。
- 远程规则下载失败。
- 配置里有不兼容字段。

本项目默认已经移除过大的广告规则集，通常比重规则模板更适合 Stash。

### 5. GitHub 更新后 Cloudflare 没变化

进入：

```text
Pages 项目
Deployments
```

点击：

```text
Retry deployment
```

或者检查 GitHub 是否真的推送到了 main 分支。

## 十八、安全提醒

请不要公开这些内容：

- 机场订阅链接。
- 真实节点。
- 管理员密码。
- Cookie 密钥。
- token。
- 私人定制规则。
- 本地专用 YAML 配置。

推荐做法：

```text
GitHub 只放代码
Cloudflare 后台放环境变量
项目后台放订阅和节点
私人模板放本地
```

## 十九、最小检查清单

部署失败时，按这个清单检查：

- GitHub 仓库是否 Fork 成功。
- Cloudflare 是否连接了正确仓库。
- 构建命令是否是 `npm run build`。
- 输出目录是否是 `dist`。
- KV 是否创建。
- KV 绑定名是否是 `MISUB_KV`。
- 是否设置 `ADMIN_PASSWORD`。
- 是否设置 `COOKIE_SECRET`。
- 修改环境变量后是否重新部署。
- Profile 是否选择了订阅源。
- 客户端是否使用 Clash YAML 链接。

## 二十、推荐小白部署顺序

最稳顺序：

1. Fork GitHub 项目。
2. Cloudflare Pages 连接 GitHub。
3. 填写构建设置。
4. 第一次部署。
5. 创建 KV。
6. 绑定 `MISUB_KV`。
7. 设置环境变量。
8. 重新部署。
9. 打开网站登录。
10. 添加机场订阅。
11. 创建 Profile。
12. 复制订阅链接导入客户端。

