# Clash Matrix Studio

> A Clash / Mihomo subscription management and configuration generator based on [imzyb/MiSub](https://github.com/imzyb/MiSub).

Clash Matrix Studio keeps MiSub's Cloudflare Pages, Vue dashboard, Pages Functions, storage, profile, backup, and diagnostics foundation, then adds the Clash Matrix Studio V5.x rule generation and node parsing behavior.

[中文说明](README-zh.md) | [Beginner Deployment Guide](docs/DEPLOYMENT_ZH.md) | [Migration Notes](CLASH_MATRIX_MIGRATION.md) | [Third-Party Notices](THIRD_PARTY_NOTICES.md)

## Highlights

- Uses MiSub's full dashboard layout and management workflow.
- Defaults to the `matrix` built-in rule level.
- Adds Matrix policy groups such as `PROXY`, `♻️ 自动测速`, `TG`, `AI`, `YOUTUBE`, `TIKTOK`, `APPLE`, `BANK`, `FINANCE`, `FAKE-LOCATION`, `BLOCK`, and `FINAL`.
- Uses `http://www.google.com/blank.html` as the default latency test URL.
- Routes BiliBili directly and gives TikTok its own policy group.
- Keeps lightweight ad, HTTPDNS, DNS hijacking, and privacy repair rules. Oversized `privacy-protection-tools/anti-AD` and `REIJI007/AdBlock_Rule_For_Clash` providers are not enabled by default to avoid Stash startup failures.
- Uses direct `raw.githubusercontent.com` rule URLs instead of a `mirror.ghproxy.com` prefix.
- Improves node parsing for SS SIP002, URL-encoded Base64 userinfo, VLESS IPv6, VLESS Reality, and Shadowrocket-style VLESS links.
- Emits safer Clash / Mihomo defaults such as `allow-lan: false`, `ipv6: false`, `unified-delay: true`, and `tcp-concurrent: true`.

## Added In This Fork

- Visual Matrix custom rules in the dashboard: create policy groups and add domain/IP rules without hand-writing full templates.
- Dedicated TikTok policy group and direct BiliBili routing.
- Stash quick import uses an explicit Clash YAML link.
- Fetch Proxy supports custom User-Agent forwarding for providers that block Cloudflare fetches.
- Matrix rules, policy icons, node parsing, and Stash compatibility are customized for this fork.

## Deploy To Cloudflare Pages

Chinese beginner guide: [docs/DEPLOYMENT_ZH.md](docs/DEPLOYMENT_ZH.md).

1. Fork or upload this repository.
2. Open the Cloudflare dashboard.
3. Create a Pages project from your GitHub repository.
4. Use these build settings:
   - Framework preset: `Vue`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Bind a KV namespace in `Settings` -> `Functions`.
6. Set environment variables and redeploy.

### Required KV Binding

Use this binding name:

```text
MISUB_KV
```

The internal binding name is kept for upstream compatibility.

### Optional D1 Binding

```bash
wrangler d1 create clash-matrix-studio
wrangler d1 execute clash-matrix-studio --file=schema.sql --remote
```

Bind it as:

```text
MISUB_DB
```

### Recommended Environment Variables

| Name | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Admin password. Defaults to `admin` when unset. Change it before public deployment. |
| `COOKIE_SECRET` | Stable cookie signing secret. |
| `CRON_SECRET` | Secret for external refresh jobs. |
| `MISUB_PUBLIC_URL` | Public site URL used for generated callback links. |
| `MISUB_CALLBACK_URL` | Callback base URL. Takes precedence over `MISUB_PUBLIC_URL`. |

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Test:

```bash
npm run test:run
```

## Usage

1. Open the deployed Pages URL.
2. Log in with `ADMIN_PASSWORD`.
3. Add upstream subscriptions or manual nodes.
4. Create a Profile that combines the sources you need.
5. Keep the default `matrix` rule level or select it explicitly.
6. Copy the generated subscription link into Clash Verge, Mihomo Party, Stash, FlClash, or another compatible client.

## Open Source Notes

This repository does not include real proxy nodes, private subscriptions, tokens, accounts, or credentials. Generated configs may reference third-party rule sets maintained by their own upstream authors.

This project is based on MiSub, which is licensed under the MIT License. The upstream license and attribution are retained. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for rule-set and upstream notices.

## Version

Current version: `v5.7.0`
