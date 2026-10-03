# Homepage on Cloudflare

一个为 Cloudflare Workers + Static Assets 重构的个人主页/服务导航站。

这个仓库根据原先的 Homepage 配置重新实现，目标不是把完整的 Next.js/Docker 版 Homepage 硬塞进 Workers，而是保留你实际使用的导航、天气、搜索、Cloudflare Tunnel（Linux / ColoCrossing）、UptimeRobot，同时让主页本身完全脱离 VPS。

即使云服务器、本地服务器或 Cloudflare Tunnel 宕机，主页仍然由 Cloudflare 提供，并显示故障状态。

## 架构

```text
浏览器
  |
  +-- /, /app.js, /app.css, /config.js
  |      -> Cloudflare Static Assets
  |      -> 不执行 Worker
  |
  +-- Open-Meteo
  |      -> 浏览器直接请求
  |
  +-- /api/status
         -> 一个 Cloudflare Worker 请求
              |-- Cloudflare Tunnel API
              |-- UptimeRobot API
```

`wrangler.jsonc` 使用：

```jsonc
"assets": {
  "directory": "./public",
  "binding": "ASSETS",
  "not_found_handling": "404-page",
  "run_worker_first": ["/api/*"]
}
```

因此主页 HTML/CSS/JS 等静态资源不会运行 Worker。Cloudflare 当前文档说明 Static Assets 请求免费且不限量；只有 `/api/*` 会进入 Worker。Workers Free 当前动态请求限额为 100,000 次/日。额度信息最后核对于 2026-10-02，请以后以官方文档为准。

- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/

## 已迁移功能

- 支持深色 / 浅色主题切换，并同步调整背景图片亮度与遮罩；默认主题为深色。
- 支持前端实时调节“液态玻璃”透明度，默认透明度 72%，范围 35%–100%，设置保存在浏览器本地。
- 百度 / Bing / Google 使用普鲁士蓝液态玻璃分段滑块；支持点击流动切换，也支持按住当前滑块拖动并在松手后吸附最近选项。
- Status 默认紧凑显示状态灯，点击后展开详细信息。

- 标题、Logo、favicon、背景图和原有分组。
- Public / Contact / 学术资源 / 网页工具 / 设计素材 / 影音娱乐。
- 杭州 Open-Meteo 天气。
- 日期与实时本地时间。
- 百度 / Bing / Google 搜索。
- Cloudflare Tunnel：同时监控 `Linux` 与 `ColoCrossing` 两个连接器。
- UptimeRobot：正常/异常监控数量。
- 手动刷新状态。
- 状态失败不会影响静态主页加载。

## 额度优化

### 静态请求不调用 Worker

普通访问 `/`、`/app.js`、`/app.css`、`/config.js` 全部直接命中 Static Assets。

### 所有状态只用一个 API

前端不会分别访问多个动态接口，只请求：

```text
/api/status
```

Worker 每次状态刷新只调用一次 Cloudflare Tunnel 列表 API，同时识别 `Linux` 与 `ColoCrossing`，再并行聚合 UptimeRobot。

### 浏览器缓存 10 分钟

同一浏览器在 10 分钟内重复打开主页，会优先使用 `localStorage` 中的状态结果，不重新调用 Worker。点击“刷新状态”可以主动刷新。

### Worker 内存缓存 60 秒

同一个 Worker isolate 60 秒内会复用已生成的状态结果，减少对第三方 API 的重复访问。它只是机会性缓存，不作为持久状态依赖。

### 不使用 KV / D1

当前方案不需要 KV、D1 或 Durable Objects，因此没有额外的存储读写额度和绑定配置。

如果未来流量真的达到每天数万甚至十万独立访客，可以进一步改造成 Cron 定时生成状态快照并写入 R2，使状态 JSON 也完全静态化。

## 安全设计

原 Homepage 配置中的认证凭据**不会保存到仓库**。GitHub 里只有 `.dev.vars.example` 的变量名与占位值。

真正的 API Token / Client Secret 请放在 Cloudflare Worker 的 **Variables and Secrets** 中，并把敏感项设置成 **Secret**。

Cloudflare 官方文档：
https://developers.cloudflare.com/workers/configuration/secrets/

仓库另外包含：

- `.gitignore`：排除 `.dev.vars`、`.env` 等本地密钥文件。
- `scripts-security-check.mjs`：检查常见 UptimeRobot/私钥泄漏模式。
- GitHub Actions CI：每次提交执行语法检查、单元测试、Gitleaks 密钥扫描与 Playwright 浏览器 E2E。

> 旧配置文件中曾以明文保存 API 凭据。迁移完成后建议把旧的 Cloudflare 和 UptimeRobot 凭据全部轮换，再使用新凭据部署。

## Cloudflare 部署：推荐方式

### 1. 从 GitHub 导入

Cloudflare Dashboard：

1. 打开 **Workers & Pages**。
2. 选择 **Create application**。
3. 选择从 GitHub repository 导入。
4. 选择 `MadisonWirtanen/Homepage-on-cloudflare`。
5. Production branch 选择 `main`。
6. Build command：

```bash
npm run check
```

7. Deploy command：

```bash
npx wrangler deploy
```

仓库中的 `wrangler.jsonc` 已包含 Static Assets 与 API 路由配置。

第一次不设置第三方变量也可以部署成功，只是 Status 项目会显示“未配置”。

### 2. 添加 Cloudflare Tunnel 变量

进入：

**Worker -> Settings -> Variables and Secrets**

添加：

| 名称 | 类型 | 内容 |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Text | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | **Secret** | 仅具 Tunnel Read 权限的 API Token |
| `TUNNEL_LINUX_NAME` | Text | 可选，默认 `Linux` |
| `TUNNEL_COLO_NAME` | Text | 可选，默认 `ColoCrossing` |

建议专门新建最小权限 Read-only Token。

### 3. 添加 UptimeRobot

| 名称 | 类型 |
| --- | --- |
| `UPTIMEROBOT_API_KEY` | **Secret** |

建议使用 Read-only key。

### 4. 重新部署并测试

保存 Variables and Secrets 后重新部署，并通过自定义域名测试：

- 页面和背景是否正常；
- 导航是否正常；
- 天气是否正常；
- Status 中 Linux、ColoCrossing 与 UptimeRobot 是否返回数据；

当前账户的 `*.workers.dev` 入口在实际部署验证中持续返回 Cloudflare 平台 1101，因此本项目生产环境不依赖 `workers.dev`。正式环境使用 **Settings -> Domains & Routes** 下的自定义域名 / Worker Route。

## 本地开发 / Wrangler 部署

```bash
git clone https://github.com/MadisonWirtanen/Homepage-on-cloudflare.git
cd Homepage-on-cloudflare
npm ci
cp .dev.vars.example .dev.vars
```

把 `.dev.vars` 中的占位值换成你自己的值。这个文件已经被 `.gitignore` 排除。

检查：

```bash
npm run check
```

本地运行：

```bash
npm run dev
```

部署：

```bash
npx wrangler login
npm run deploy
```

也可以单独设置 Secret：

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put UPTIMEROBOT_API_KEY
```

## 修改主页内容

所有允许公开给浏览器的导航内容都集中在：

```text
public/config.js
```

例如增加服务：

```js
{
  id: "my-service",
  name: "My Service",
  icon: "https://example.com/icon.svg",
  href: "https://service.example.com/",
  description: "服务说明",
  target: "_blank",
}
```

网页级 ping / HTTP HEAD 探测已关闭。服务卡片不会再主动探测目标网站，也不会显示延迟/在线角标。

**不要把密码、API Token、Access Service Token、私钥放进 `public/config.js`。**
`public/` 下内容全部是公开静态资源。


## 项目结构

```text
.
├── public/
│   ├── index.html
│   ├── app.js                 # 轻量入口
│   ├── config.js
│   ├── js/
│   │   ├── ui.js
│   │   ├── status.js
│   │   ├── weather.js
│   │   ├── search.js
│   │   ├── theme.js
│   │   ├── liquid-glass.js
│   │   ├── storage.js
│   │   └── clock.js
│   ├── styles/
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── theme.css
│   │   └── search.css
│   └── effects/               # 预生成 Liquid Glass 位移贴图
├── src/
│   └── worker.js
├── tests/
│   ├── worker.test.mjs
│   └── e2e/
│       └── homepage.spec.mjs
├── .github/workflows/ci.yml
├── .dev.vars.example
├── scripts-security-check.mjs
├── wrangler.jsonc
└── package.json
```

## 为什么不直接部署原版 Homepage

原版 Homepage 是完整 Next.js/Node 应用，其中：

- Docker 状态依赖 Docker API / Docker socket。
- ICMP ping 依赖系统能力。
- 配置文件依赖运行时文件系统。
- 部分集成依赖 Node 库或宿主机。

这些不适合无修改地放进 Workers。

你当前实际使用的状态功能主要是 HTTP/API，因此重新实现成 Cloudflare-native 版本更小、更可靠、调用量也更低。

如果以后需要 Docker CPU/RAM、容器状态、磁盘等内部指标，建议单独做一个只读 Probe Agent，通过 Cloudflare Tunnel / Workers VPC 暴露给这个 Worker；主页本体继续保持完全托管在 Cloudflare。

## 已知限制

1. 不包含原版 Homepage 的 Docker Socket、容器 CPU/RAM/网络统计。
2. 网页 ping / HTTP HEAD 服务探测已关闭。
3. UptimeRobot 当前使用兼容现有配置的 v2 `getMonitors` 接口；代码已将其隔离，未来迁移新版 API 不影响前端结构。
4. 不提供搜索联想词，避免新增代理、CORS 和 Worker 调用。

## 图标与外部依赖

核心导航与分组图标（Safari、Gmail、GitHub、Google Scholar、Actix、Apple、YouTube、WeChat、Cloudflare、Uptime Kuma）已放入 `public/icons/`，不再依赖 Simple Icons CDN。少量第三方站点 favicon 仍使用外部来源，但前端加载失败时会自动降级为文字缩写，不影响导航可用性。

## 前端模块化与 E2E

前端保持原生 ES Modules，不引入 React / Vue / Next.js。原先集中在 `public/app.js` 的逻辑已经按职责拆分：导航 UI、状态、天气、搜索、主题、液态玻璃、时钟和本地缓存分别维护。

Liquid Glass 的三张 displacement map 已经预生成在 `public/effects/`，页面加载时不再用 Canvas 逐像素计算。

Playwright E2E 会在本地 Wrangler 开发服务器上真实验证：

- 百度 / Bing / Google 滑块可见、点击切换与桌面拖动吸附；
- 深浅主题与 localStorage 持久化；
- 液态玻璃默认 72%、最大 100% 与持久化；
- Status 默认折叠并可展开；
- 顶部三个组件等宽、文字居中；
- 桌面与移动端无横向溢出；
- 不存在的路径返回真正的 HTTP 404。

## 校验

本项目提供：

```bash
npm run check
```

会执行：

- Worker 与全部前端 ES Module 语法检查；
- Node 单元测试；
- 当前工作树常见敏感凭据模式扫描。

GitHub Actions 另外执行 Gitleaks 与 Playwright Chromium E2E。

## Attribution

项目思路、原始配置方式与部分交互来源于 [gethomepage/homepage](https://github.com/gethomepage/homepage)。本仓库是针对个人场景重新实现的 Cloudflare-native 版本，并非原项目官方发行版。

## License

MIT

## 当前生产部署

当前生产环境使用 Cloudflare Worker `homepage-on-cloudflare`，GitHub `main` 分支已连接 Cloudflare Workers Builds：

- 构建检查：`npm run check`
- 部署：`npx wrangler deploy`
- 正式入口：`https://www.xn--rgvt7o95i1ni.com/`
- 正式域名通过 Worker Route 接管，请求在到达原 Cloudflare Tunnel 之前进入新 Worker。
- 原 `www` CNAME 到 Cloudflare Tunnel 保留作为快速回滚路径；删除对应 Worker Route 即可恢复旧主页。
- 此 Cloudflare 账户的 `*.workers.dev` 入口在部署验证时持续返回平台 1101，因此生产环境明确使用自定义域名，不依赖 `workers.dev`。
- 运行时认证信息存储在 Cloudflare Worker Secrets 中，不保存在 GitHub 仓库。
- 普通 HTML/CSS/JS 由 Static Assets 直接提供，只有 `/api/*` 进入 Worker。不存在的普通页面使用 Static Assets 的 `404-page` 行为，不再把任意路径伪装成首页 200。

生产 smoke test 位于 `.github/workflows/ci.yml`，会在每次 `main` 推送后验证正式主页、健康接口以及状态聚合接口。
