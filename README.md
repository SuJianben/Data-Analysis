# TKF Signal

TKF Signal 是一个支持 TKF、TMS 站点隔离的数据同步、菜单报表、用户行为和 AI 分析工作台。线上数据保存到 Cloudflare D1，本机仍可使用 SQLite 进行开发。长期凭据只保存在本机 `.env.local`，临时令牌只参与当前请求，两者都不会写入数据库。

## 启动

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

生产模式：

```bash
npm run build
npm start
```

## 配置

复制 `.env.example` 为 `.env.local`，按需填写：

- `GA4_PROPERTY_ID`：GA4 属性 ID
- `GA4_ACCESS_TOKEN`：可选；仅作为 OAuth Refresh Token 以外的临时认证方式
- `GOOGLE_OAUTH_CLIENT_ID`、`GOOGLE_OAUTH_CLIENT_SECRET`、`GOOGLE_OAUTH_REFRESH_TOKEN`：GA4 本机 OAuth 长期认证
- `GOOGLE_APPLICATION_CREDENTIALS`：GA4 服务账号 JSON 的本机路径，作为备用认证方式
- `CLARITY_API_TOKEN`：可选；配置后可供 Clarity 同步接口使用
- `USER_EVENT_INGEST_KEY`：可选；设置后，用户事件接口要求请求头 `x-tkf-ingest-key` 匹配
- `USER_EVENT_ALLOWED_ORIGINS`：允许从浏览器提交事件的店铺来源，多个来源用英文逗号分隔
- `USER_EVENT_FORWARD_URL`、`USER_EVENT_FORWARD_KEY`：可选；让 HTTPS 接入层把事件转发到持久化服务器
- `USER_EVENT_API_URL`、`USER_EVENT_READ_KEY`：可选；让 Vercel 或本机面板从 Cloudflare Worker 读取用户事件
- `TKF_DATABASE_PATH`：可选；指定 SQLite 持久化文件位置
- `IMPORT_INGEST_KEY`：可选；设置后，标准化导入接口要求请求头 `x-tkf-import-key` 匹配
- `AI_BASE_URL`：兼容 OpenAI Chat Completions 的接口根地址
- `AI_API_KEY`：AI 接口密钥
- `AI_MODEL`：AI 模型名称

未配置 AI 密钥时，系统会使用本地规则分析，便于完整验证工作流。

## 本地接口

### 健康检查

`GET /api/health`

### 标准化数据导入

`POST /api/import`

如果服务端设置了 `IMPORT_INGEST_KEY`，请求必须携带 `x-tkf-import-key` 请求头。部署到任何公网环境时都应设置该密钥。

```json
{
  "siteKey": "tkf",
  "source": "shopify",
  "period": {
    "start": "2026-09-01",
    "end": "2026-09-02"
  },
  "menuMetrics": [
    {
      "date": "2026-09-02",
      "deviceCategory": "desktop",
      "menuName": "Kulüpler",
      "menuKey": "clubs",
      "parentMenuName": "",
      "menuLevel": "1",
      "menuAction": "expand",
      "navigationLocation": "header",
      "clickTarget": "/collections/clubs",
      "clickCount": 23
    }
  ],
  "siteMetrics": [
    {
      "date": "2026-09-02",
      "eventName": "purchase",
      "eventCount": 4,
      "totalRevenue": 1820
    }
  ]
}
```

### GA4 同步

`POST /api/sync/ga4`

```json
{
  "siteKey": "tkf",
  "propertyId": "546810508",
  "accessToken": "仅本次请求使用的 OAuth Access Token",
  "startDate": "2026-09-01",
  "endDate": "2026-09-02"
}
```

### 本机自动同步到 Cloudflare D1

`scripts/sync-ga4-to-cloudflare.mjs` 会先调用本机 `/api/sync/ga4`（由本机 OAuth 凭证访问 Google），再把菜单、站点和全局点击汇总发送到 Worker `/v1/analytics/import`。

在本机 `.env.local` 或系统环境变量中配置：

```text
TKF_ANALYTICS_IMPORT_URL=https://你的Worker地址/v1/analytics/import
TKF_ANALYTICS_IMPORT_KEY=与 Worker SERVER_INGEST_KEY 相同的密钥
LOCAL_SYNC_URL=http://localhost:3000/api/sync/ga4
```

分别同步 TKF 或 TMS 最近 3 天：

```bash
npm run sync:tkf
npm run sync:tms
```

TKF 使用 `TKF_GA4_PROPERTY_ID`，TMS 使用 `TMS_GA4_PROPERTY_ID`。这里必须填写 GA4 的纯数字属性 ID，不能填写以 `G-` 开头的衡量 ID。兼容旧配置时，TKF 仍可读取 `GA4_PROPERTY_ID`。

面板顶部提供 7 天、30 天、90 天和自定义起止日期。时间范围通过 URL 在各页面间保留，并由 Worker/D1 实际过滤概览、菜单、全局点击、用户行为和 AI 数据集。

“数据健康”页面固定检查最近7个完整自然日，包含：

- GA4 最近一次同步是否超过 36/60 小时；
- 最近7天是否存在数据缺口；
- 菜单名称、元素名称和用户事件标识的有效率；
- 最近完整日相对历史日均是否发生明显突降或突增。

每日 Codex 自动化会在同步完成后读取健康结果。全部正常时保持安静；发现需要关注或严重异常时才通知。

也可以指定日期：

```bash
node scripts/sync-ga4-to-cloudflare.mjs --start-date 2026-09-01 --end-date 2026-09-03
```

### Clarity 同步

`POST /api/sync/clarity`

```json
{
  "apiToken": "仅本次请求使用的 Clarity Token",
  "numOfDays": 1
}
```

### 生成分析

`POST /api/analysis`

```json
{
  "question": "分析菜单表现，并指出最值得优先验证的三个问题。"
}
```

### 用户行为事件接收

`POST /api/events`

接口接收单个或一批经过脱敏的用户行为事件。`visitorId` 应由站点生成稳定的匿名访客标识；登录用户只提交不可逆的 `customerIdHash`，不要提交姓名、邮箱、电话或原始客户 ID。`eventId` 用于去重。

```json
{
  "siteKey": "tms",
  "source": "shopify",
  "event": {
    "eventId": "evt_01J8YV7Q2QK3",
    "visitorId": "visitor_01J8YV6X9M",
    "sessionId": "session_01J8YV6Y2A",
    "eventName": "global_click",
    "occurredAt": "2026-09-04T08:40:00.000Z",
    "pagePath": "/collections/barcelona",
    "elementKey": "product:barcelona-home-jersey",
    "elementLabel": "巴塞罗那主场球衣",
    "destinationPath": "/products/barcelona-home-jersey",
    "deviceCategory": "mobile"
  }
}
```

面板的“用户行为”页面会分别展示匿名访客和登录客户：匿名访客按浏览器标识汇总，登录客户按客户哈希跨设备合并。一个浏览器只出现过一个登录客户时，登录前的匿名行为会安全归入该客户；共享浏览器出现多个客户时，无法确认归属的匿名行为仍单独保留，避免串号。当前 GA4 汇总报表不会自动产生用户级记录，需要站点把事件发送到此接口，或另行接入 GA4 BigQuery 事件导出。

### Cloudflare Worker + D1

线上报表和用户事件以 Cloudflare D1 为唯一数据源，所有报表、用户和事件都按 `site=tkf` 或 `site=tms` 隔离。Worker 地址不包含结尾斜杠：

```text
USER_EVENT_API_URL=https://你的Worker地址/v1
USER_EVENT_READ_KEY=Cloudflare Worker 的只读密钥
```

未配置 `USER_EVENT_API_URL` 时，本机继续读取 `data/analytics.db`，方便离线开发。Vercel 配置后，概览、菜单、全局点击、AI 数据集和用户行为都会读取 D1。

### Vercel HTTPS 接入层

Shopify 页面只能向 HTTPS 地址稳定发送事件。Vercel 配置：

```text
USER_EVENT_FORWARD_URL=https://你的Worker地址/v1/events
USER_EVENT_FORWARD_KEY=Cloudflare Worker 的服务端写入密钥
USER_EVENT_ALLOWED_ORIGINS=https://turkforma.com,https://www.turkforma.com
```

正式店铺可以直接提交到 Worker；Vercel 转发接口保留为兼容入口。两种方式最终都写入 D1，不会落到 Vercel 临时磁盘。

全局点击明细使用 Worker 端分页：页面只请求当前 20 条明细，搜索和设备筛选在 D1 查询中完成；趋势、设备构成和分布散点通过独立汇总接口读取完整时间范围，不受当前页影响。

### Shopify 快速接入

项目内的 `public/tkf-user-identity.js` 是身份与传输模块。正式店铺由现有全局点击脚本调用它，不再注册第二个点击监听器；主题只需提供 HTTPS 接口地址和 Shopify Liquid 生成的客户哈希。

Shopify 自定义 Pixel 还需追加 `shopify/customer-pixels/tkf-signal-purchase-bridge.js`。该桥接订阅 `checkout_completed`，把完成购买写入同一用户事件链，只保存匿名访客标识、客户与订单的不可逆 SHA-256 哈希以及金额、币种、商品数量，不提交姓名、邮箱、电话或原始 ID。

旧的 `public/tkf-user-tracker.js` 仍可用于没有现成全局点击脚本的独立站，初始化方式如下：

```html
<script src="https://你的分析域名/tkf-user-tracker.js" defer></script>
<script>
  window.addEventListener("DOMContentLoaded", function () {
    window.TKFSignalTracker.init({
      endpoint: "https://你的分析域名/api/events",
      source: "shopify"
    });
  });
</script>
```

脚本会为浏览器保存匿名 `visitorId`，为当前标签页保存 `sessionId`，并记录链接、按钮及带 `data-tkf-track` 的控件。可在元素上增加 `data-tkf-key`、`data-tkf-label`、`data-tkf-section` 让报表显示更明确的名称；不需要采集个人信息。分析域名必须使用 HTTPS，不能让 HTTPS 商店页面请求 HTTP 地址。

## 数据位置

SQLite 数据库保存在 `data/analytics.db`，其中包括：

- 菜单点击汇总
- 站点业务指标
- 原始数据快照
- 同步日志
- AI 分析结果

令牌和 API 密钥不会写入数据库。

## 固定数据源凭证

### GA4（推荐 OAuth Refresh Token）

将 OAuth Playground 获取的本机凭据填入 `.env.local`：

```text
GOOGLE_OAUTH_CLIENT_ID=你的ClientID
GOOGLE_OAUTH_CLIENT_SECRET=你的ClientSecret
GOOGLE_OAUTH_REFRESH_TOKEN=你的RefreshToken
```

三项需同时填写。重启软件后，同步接口会自动换取短期 Access Token。

`.env.local` 已被 Git 忽略，凭据不会进入代码仓库或数据库。

### GA4（服务账号备用方式）

1. 在 Google Cloud 创建服务账号并下载 JSON 密钥。
2. 将文件保存为 `secrets/ga4-service-account.json`。
3. 在 GA4 属性 `546810508` 的“媒体资源访问权限管理”中，将 JSON 内的 `client_email` 添加为“查看者”。
4. 重启软件。服务账号认证生效后，无需再输入临时 Access Token。

服务账号 JSON 已被 Git 忽略，不会进入代码仓库。

### Clarity

将长期 Token 填入 `.env.local`：

```text
CLARITY_API_TOKEN=你的长期Token
```

重启软件后，Clarity 同步接口会使用该 Token。
