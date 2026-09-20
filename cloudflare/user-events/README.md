# TKF Signal User Events Worker

该子项目现在作为旧 Pixel 地址的兼容转发层：继续接收 TKF、TMS、FKK、BLK 已发布 Pixel 发往 `workers.dev` 的事件，完成来源与载荷校验后转发到多站点 Vercel 事件队列。D1 只保留历史读取与回退，不再接收新的用户行为写入。

## 接口

- `GET /health`：健康检查。
- `POST /v1/events`：兼容旧 Pixel 地址，校验后转发到 `https://multi-site-analytics.vercel.app/api/events`。
- `GET /v1/users`：持有只读密钥的服务端读取用户摘要。
- `GET /v1/users/:identityKey`：持有只读密钥的服务端读取单个用户行为。
- `POST /v1/analytics/import`：持有服务端写入密钥的本机同步任务覆盖导入指定日期范围。
- `GET /v1/analytics/overview`：读取概览指标、趋势和高频菜单。
- `GET /v1/analytics/menus`：读取菜单点击明细。
- `GET /v1/analytics/global-clicks`：读取全局点击明细。
- `GET /v1/analytics/dataset`：读取 AI 分析使用的数据集。
- `GET /v1/analytics/health`：检查最近同步、7天数据连续性、关键字段质量和数据量波动。

报表和用户行为读取接口支持 `site=tkf|tms|fkk|blk&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`。未传 `site` 时兼容为 `tkf`。站点和日期筛选都在 D1 查询层执行，概览、表格、用户行为和 AI 使用同一统计范围，各站点的数据不会互相混入。健康检查固定使用所选站点最近7个完整自然日，避免当天尚未完整的数据触发误报。

## 本机开发

```bash
npm install
npm run db:migrate:local
npm run dev
```

## 首次部署

1. 在 `wrangler.jsonc` 中绑定已创建的 D1 数据库。
2. 执行 `npm run db:migrate:remote`。
3. 分别执行 `npx wrangler secret put READ_API_KEY` 和 `npx wrangler secret put SERVER_INGEST_KEY`。
4. 执行 `npm run deploy`。

`npm run deploy` 会从同一份源码依次发布四个站点一致的入口：

- TKF：`https://tkf-signal-user-events.trustmereview.workers.dev`
- TMS：`https://tms-signal-user-events.trustmereview.workers.dev`
- FKK：`https://fkk-signal-user-events.trustmereview.workers.dev`
- BLK：`https://blk-signal-user-events.trustmereview.workers.dev`

四个 Worker 继续使用原域名，保证后台尚未替换的 Pixel 无需立即改代码；事件校验通过后统一进入 Vercel Queue，再由本机任务写入 SQLite。健康检查会返回 `storage=vercel-queue-proxy`。单独发布时可使用 `npm run deploy:tkf`、`npm run deploy:tms`、`npm run deploy:fkk` 或 `npm run deploy:blk`，禁止复制多套 Worker 源码分别维护。

密钥只保存在 Cloudflare 和调用方的环境变量中，禁止写入代码、日志或 Git 仓库。`ALLOWED_ORIGINS` 只填写正式店铺 HTTPS 域名。

Shopify 自定义 Pixel 在沙箱 iframe 中提交请求时会使用不透明来源 `Origin: null`。Worker 不会把该来源加入普通来源白名单，而是仅对符合下列条件的单条事件开放受限入口：来源与站点匹配、事件属于已登记的 Shopify 行为、使用合规的匿名访客标识且发生在允许时间窗口内。新版购买首包必须是 `checkout_completed`，携带平台事件号、金额、币种、商品数量和精简商品证据；服务端仍兼容旧版订单哈希载荷。重复购买统一按事件号去重。

为避免旧版 Pixel、页面重复初始化或短时间连续点击放大 D1 写入，Worker 会在服务端再次归一低价值事件：同一访客、页面在 5 分钟内的重复 `page_view` 共用一个事件号，同一访客、页面和元素在 5 秒内的重复 `global_click` 共用一个事件号。加购、开始结账和购买不做窗口去重，始终保留平台事件号。D1 暂时不可写时接口返回 `503`、`Retry-After: 60` 和 `storage_temporarily_unavailable`，不会再把存储故障伪装成请求格式错误。

FKK Customer Pixel 对 `begin_checkout` 和 `purchase` 采用有限重试并复用同一个事件号，因此响应丢失不会生成重复购买。多次尝试仍失败时只向 GA4 写入 `signal_delivery_error` 诊断事件；该事件用于发现 Signal 漏采，不会从 Shopify 订单反向补数，也不参与购买统计。

SHOPLINE 客户事件同样运行在隔离环境中。BLK 的不透明来源入口只接受 `siteKey=blk`、`source=shopline_pixel:blk`，以及带 SHOPLINE 专属事件 ID、匿名 `clientId`、有效时间和对应字段的页面浏览、点击、加购、结账或购买事件；新版购买首包使用平台事件号和精简商品证据，不等待订单哈希，服务端继续兼容旧版哈希载荷。这样既能缩短购买页退出前的发送路径，也能拒绝其他站点和格式不符的数据。

## 用户归属规则

- 匿名行为按 `visitorId` 汇总。
- 已识别客户行为按不可逆 `customerIdHash` 跨浏览器汇总。
- 一个浏览器只关联过一个已识别客户时，识别前行为归入该客户。
- 共享浏览器关联多个客户时，无法确认归属的匿名行为保持独立，防止把用户 A 的行为算给用户 B。
