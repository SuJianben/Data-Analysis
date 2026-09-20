# 多站点数据分析

这是一个支持 TKF、TMS、FKK、BLK 和 DTK 站点隔离的数据同步、菜单报表、用户行为和 AI 分析工作台。TKF、TMS、FKK 来自 Shopify，BLK 和 DTK 来自 SHOPLINE。本机 SQLite 是主数据库；Vercel 负责 HTTPS 接收、事件队列和只读展示，Cloudflare Worker KV 只负责中转压缩后的只读快照。Cloudflare D1 暂时保留为迁移兼容与回退，不再承担主库职责。

正式面板地址：`https://multi-site-analytics.vercel.app`

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

- `GA4_PROPERTY_ID`：TKF 的 GA4 属性 ID（兼容旧配置）
- `TMS_GA4_PROPERTY_ID`、`FKK_GA4_PROPERTY_ID`、`BLK_GA4_PROPERTY_ID`、`DTK_GA4_PROPERTY_ID`：对应站点的 GA4 属性 ID
- `GA4_ACCESS_TOKEN`：可选；仅作为 OAuth Refresh Token 以外的临时认证方式
- `GOOGLE_OAUTH_CLIENT_ID`、`GOOGLE_OAUTH_CLIENT_SECRET`、`GOOGLE_OAUTH_REFRESH_TOKEN`：GA4 本机 OAuth 长期认证
- `GOOGLE_APPLICATION_CREDENTIALS`：GA4 服务账号 JSON 的本机路径，作为备用认证方式
- `CLARITY_API_TOKEN`：可选；配置后可供 Clarity 同步接口使用
- `USER_EVENT_INGEST_KEY`：可选；设置后，用户事件接口要求请求头 `x-tkf-ingest-key` 匹配
- `USER_EVENT_ALLOWED_ORIGINS`：允许从浏览器提交事件的店铺来源，多个来源用英文逗号分隔
- `USER_EVENT_STORAGE_MODE`：本机使用 `local`，Vercel 使用 `queue`
- `USER_EVENT_QUEUE_TOPIC`、`USER_EVENT_QUEUE_REGION`：Vercel 事件队列名称和固定区域
- `LOCAL_QUEUE_TOKEN_URL`：本机自动化取得短期生产队列凭证的受保护接口
- `ANALYTICS_READ_MODE=local`：面板以 SQLite 快照为数据源
- `ANALYTICS_DATABASE_PATH`：可选；指定 SQLite 主库位置
- `USER_EVENT_FORWARD_URL`、`USER_EVENT_API_URL`：Cloudflare Worker 事件代理与 KV 快照中转地址
- `USER_EVENT_FORWARD_KEY`：事件代理和快照上传凭证；未单独设置读取密钥时也用于快照读取
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

### 本机主库自动同步

`scripts/run-local-sync.mjs` 会回收 Vercel 队列中的埋点事件、调用本机 `/api/sync/ga4` 同步五站最近 3 天，并发布新的只读 SQLite 快照。`scripts/sync-ga4-to-cloudflare.mjs` 只保留为旧命令兼容入口，不再上传 D1。

新站点接入时，可以先预览缺少的事件级自定义维度，再由拥有 `analytics.edit` 权限的 OAuth 凭证一次性补齐：

```bash
npm run ga4:dimensions -- --site blk
npm run ga4:dimensions -- --site blk --apply
```

本机同步入口：

```bash
npm run sync:events
npm run sync:local
npm run snapshot:publish
```

分别同步 TKF、TMS、FKK、BLK 或 DTK 最近 3 天：

```bash
npm run sync:tkf
npm run sync:tms
npm run sync:fkk
npm run sync:blk
npm run sync:dtk
```

TKF 使用 `TKF_GA4_PROPERTY_ID`，TMS 使用 `TMS_GA4_PROPERTY_ID`，FKK 使用 `FKK_GA4_PROPERTY_ID`，BLK 使用 `BLK_GA4_PROPERTY_ID`，DTK 使用 `DTK_GA4_PROPERTY_ID`。这里必须填写 GA4 的纯数字属性 ID，不能填写以 `G-` 开头的衡量 ID。兼容旧配置时，TKF 仍可读取 `GA4_PROPERTY_ID`。

面板顶部提供 7 天、30 天、90 天和自定义起止日期。时间范围通过 URL 在各页面间保留，并由 SQLite 实际过滤概览、菜单、全局点击、用户行为和 AI 数据集。

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

分析结果按 `site + startDate + endDate` 持久化：Vercel 生产环境通过 Worker 写入 KV，本机写入 SQLite。重新打开或刷新相同站点、相同日期范围的 AI 分析页时会恢复最近一次结果，不同站点和日期范围互不覆盖。

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

面板的“用户行为”页面会分别展示匿名访客和已识别客户：匿名访客按浏览器标识汇总，已识别客户按客户哈希跨设备合并。一个浏览器只关联过一个客户时，识别前的匿名行为会安全归入该客户；共享浏览器出现多个客户时，无法确认归属的匿名行为仍单独保留，避免串号。“已识别客户”只表示事件带有脱敏客户标识，不代表访客一定登录过账号。当前 GA4 汇总报表不会自动产生用户级记录，需要站点把事件发送到此接口，或另行接入 GA4 BigQuery 事件导出。

### 本地 SQLite + Vercel 队列

所有报表和用户事件在本地主库中按站点隔离。店铺把事件提交到 Vercel `/api/events`，Vercel 使用队列暂存；本机每 5 分钟消费一次，只有本地写入成功后才确认消息。普通事件合并到每小时完整同步后发布，购买事件在最近一次 5 分钟任务中优先发布；快照先压缩再写入 Cloudflare KV，供 Vercel 面板只读展示。

```text
USER_EVENT_STORAGE_MODE=queue
USER_EVENT_QUEUE_TOPIC=signal-user-events-v1
USER_EVENT_QUEUE_REGION=fra1
ANALYTICS_READ_MODE=local
USER_EVENT_API_URL=https://你的快照Worker地址/v1
USER_EVENT_FORWARD_KEY=与Worker一致的服务端密钥
```

Vercel 每 30 秒最多检查一次快照版本；发现版本变化后下载压缩快照，完成 SHA-256 和 SQLite 完整性校验，再原子切换读取连接。远程快照暂时不可用时继续使用随部署携带的最后有效快照，不再让页面直接报 500。

### Vercel HTTPS 接入层

Shopify 和 SHOPLINE 页面向 Vercel HTTPS 接入层发送事件。Vercel 配置：

```text
USER_EVENT_STORAGE_MODE=queue
USER_EVENT_ALLOWED_ORIGINS=https://turkforma.com,https://www.turkforma.com
```

正式店铺统一提交到 Vercel `/api/events`。事件先进入持久队列，本机离线时会保留并在恢复后继续消费；Vercel 临时磁盘不承担主存储。

全局点击明细使用 Worker 端分页：页面只请求当前 20 条明细，搜索和设备筛选在 D1 查询中完成；趋势、设备构成和分布散点通过独立汇总接口读取完整时间范围，不受当前页影响。

### Shopify 快速接入

Shopify 店铺以 Customer Pixel 的 `event.clientId` 作为匿名访客主标识。普通行为中发现的客户 ID 只在 Pixel 内转成 SHA-256 哈希；购买首包为了避免结账页结束前被异步哈希阻塞，改用平台事件号、匿名访客号和精简商品证据立即发送，不携带原始客户号或订单号。页面浏览、点击、加购、开始结账和购买因此能够进入同一条用户轨迹，不再依赖主题与结账页之间共享 localStorage。

TKF 使用 `shopify/customer-pixels/tkf-signal-purchase-bridge.js` 作为完整 Signal 行为桥（文件名为兼容历史安装说明而保留）；TMS 与 FKK 分别使用 `tms-ga4-customer-pixel.js` 和 `fkk-ga4-customer-pixel.js`。这些 Pixel 对同页重复浏览采用 5 分钟窗口、对同按钮重复点击采用 5 秒窗口；加购、开始结账和购买始终逐条保留。

主题点击脚本只负责通过 `Shopify.analytics.publish` 发布自定义点击，不再直接写入 Signal。`public/tkf-user-identity.js` 和 `shopify/theme-assets/tms-user-identity.js` 仅作为非 Shopify 或回滚兼容文件，不应与正式 Shopify Customer Pixel 同时承担写入职责。

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

### SHOPLINE 快速接入

BLK 和 DTK 各自使用两个职责分离的脚本：

- `public/integrations/shopline/blk-signal-publisher.js`：公开托管的唯一业务实现，由 SHOPLINE Script Tag 在店铺页面加载；在客户隐私 API 允许后记录可交互元素并发布自定义客户事件。
- `shopline/custom-code/blk-signal-publisher.js`：后台手动安装的备用加载器，仅加载上述公开脚本，不重复维护业务逻辑。
- `shopline/customer-events/blk-ga4-signal-pixel.js`：用于替换已有 `Google_Analytic` 像素代码，订阅 SHOPLINE 标准电商事件、菜单和全局点击，并把完成购买写入 BLK 用户行为链。
- DTK 对应文件使用同样分层：`dtk-signal-publisher.js` 和 `dtk-ga4-signal-pixel.js`，但事件名、站点标识和 GA4 衡量 ID 完全隔离。

不要新建第二个 GA4 像素，否则会造成重复统计。SHOPLINE 安装步骤参见 `docs/handoffs/BLK-SHOPLINE-埋点接入交接.md` 和 `docs/handoffs/DTK-SHOPLINE-客户事件接入交接.md`。

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
