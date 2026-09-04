# TKF Signal

TKF Signal 是一个仅在本机运行的数据同步、菜单报表和 AI 分析工作台。长期凭据只保存在本机 `.env.local`，临时令牌只参与当前请求，两者都不会写入数据库。

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
- `GA4_ACCESS_TOKEN`：可选；不填写时可在数据源页面临时输入
- `GOOGLE_OAUTH_CLIENT_ID`、`GOOGLE_OAUTH_CLIENT_SECRET`、`GOOGLE_OAUTH_REFRESH_TOKEN`：GA4 本机 OAuth 长期认证
- `GOOGLE_APPLICATION_CREDENTIALS`：GA4 服务账号 JSON 的本机路径，作为备用认证方式
- `CLARITY_API_TOKEN`：可选；不填写时可在数据源页面临时输入
- `USER_EVENT_INGEST_KEY`：可选；设置后，用户事件接口要求请求头 `x-tkf-ingest-key` 匹配
- `AI_BASE_URL`：兼容 OpenAI Chat Completions 的接口根地址
- `AI_API_KEY`：AI 接口密钥
- `AI_MODEL`：AI 模型名称

未配置 AI 密钥时，系统会使用本地规则分析，便于完整验证工作流。

## 本地接口

### 健康检查

`GET /api/health`

### 标准化数据导入

`POST /api/import`

```json
{
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
  "propertyId": "546810508",
  "accessToken": "仅本次请求使用的 OAuth Access Token",
  "startDate": "2026-09-01",
  "endDate": "2026-09-02"
}
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

接口接收单个或一批经过脱敏的用户行为事件。`visitorId` 应由站点生成稳定的匿名访客标识；不要直接提交姓名、邮箱、电话或未哈希的客户 ID。`eventId` 用于去重。

```json
{
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

面板的“用户行为”页面会按 `visitorId` 汇总用户，并可以打开单个访客的完整事件时间线。当前 GA4 汇总报表不会自动产生用户级记录，需要站点把事件发送到此接口，或另行接入 GA4 BigQuery 事件导出。

### Shopify 快速接入

项目内的 `public/tkf-user-tracker.js` 是一个无框架追踪脚本。将它作为主题脚本加载后初始化：

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

三项需同时填写。重启软件后，数据源页面显示“OAuth 已固定”，同步时会自动换取短期 Access Token。

`.env.local` 已被 Git 忽略，凭据不会进入代码仓库或数据库。

### GA4（服务账号备用方式）

1. 在 Google Cloud 创建服务账号并下载 JSON 密钥。
2. 将文件保存为 `secrets/ga4-service-account.json`。
3. 在 GA4 属性 `546810508` 的“媒体资源访问权限管理”中，将 JSON 内的 `client_email` 添加为“查看者”。
4. 重启软件。数据源页面显示“服务账号已固定”后，无需再输入临时 Access Token。

服务账号 JSON 已被 Git 忽略，不会进入代码仓库。

### Clarity

将长期 Token 填入 `.env.local`：

```text
CLARITY_API_TOKEN=你的长期Token
```

重启软件后，数据源页面会显示“Token 已固定”。
