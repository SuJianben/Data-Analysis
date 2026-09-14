# 2026-09-14 BLK SHOPLINE 接入

## 本次目标

把 Belgiumkits（BLK）作为首个 SHOPLINE 站点接入现有多站点数据面板，并在导航中明确区分 SHOPLINE 与 Shopify 站点。

## 修改范围

- 站点配置和左侧站点选择器。
- GA4 本机同步脚本与环境变量模板。
- Cloudflare Worker 的站点路由、来源白名单和 SHOPLINE 购买校验。
- SHOPLINE 店铺页面采集脚本与客户事件 Pixel。
- 接入说明和部署命令。

## 新增内容

- 新增 BLK 站点配置，平台标记为 `shopline`。
- 新增 BLK 专属 Worker 发布入口。
- 新增 SHOPLINE 普通页面点击采集脚本。
- 新增 SHOPLINE 客户事件 Pixel，沿用 `G-TRCFQDSHYR`。
- 新增 SHOPLINE 沙箱购买事件的专用严格校验。
- 新增 BLK SHOPLINE 埋点交接文档。
- 新增可重复执行的 GA4 自定义维度检查/补齐脚本；默认只预览，显式传入 `--apply` 才写入。

## 调整内容

- TKF、TMS、FKK 明确标记为 Shopify，BLK 标签显示为 `SHOPLINE`。
- GA4 同步站点参数从三个扩展为四个。
- D1 继续使用同一数据库，但按 `siteKey=blk` 隔离数据。
- 正式来源白名单加入 `belgiumkits.com` 和 `www.belgiumkits.com`。
- SHOPLINE 用户链路统一使用官方 Pixel 事件的匿名 `clientId`，串联浏览、点击、加购、结账与购买，不依赖未被 SHOPLINE 文档承诺的沙箱存储接口。
- 每日 GA4 同步与数据健康检查自动化已扩展为 TKF、TMS、FKK、BLK 四站。

## 影响范围

- 现有三个站点继续使用原有路由、Worker 和数据；未改变默认站点兼容逻辑。
- BLK 可读取自己的 GA4 汇总数据，并在埋点安装后写入自己的用户行为与购买归因。
- SHOPLINE 管理令牌未写入仓库、日志或前端脚本。

## 自检

- 状态：代码、云端数据与面板接入完成；SHOPLINE 后台安装待登录后执行。
- 主项目 `npm run typecheck` 通过，`npm run build` 通过。
- Worker `npm run typecheck` 通过，两个 SHOPLINE 脚本 `node --check` 通过。
- 本地 Worker 验证：有效 SHOPLINE 页面事件返回 200；错站点与错误事件 ID 返回 403；同一购买事件首次写入 1 条、重复提交写入 0 条。
- BLK Worker 已发布到 `https://blk-signal-user-events.trustmereview.workers.dev`，线上健康检查正常，正式域 OPTIONS 返回 204，非白名单域和伪造购买返回 403。
- 中央 TKF Worker 已同步发布四站点校验，修复旧导入口拒绝 `siteKey=blk` 的问题。
- BLK GA4 于 2026-09-14 同步 2026-09-11 至 2026-09-13 数据成功：13 行，远端 `syncId=18`。
- 线上 `https://tkf-signal.vercel.app/?site=blk` 已发布并以 1920×1080 浏览器验收：BLK 行显示 `SHOPLINE`，六个主菜单均保持 `site=blk`，控制台 0 错误、0 警告。
- 已回读 BLK 标准数据：2,288 次页面浏览、632 位访问用户、20 次加购；菜单、热力和全局点击尚无自定义维度数据。
- 敏感模式扫描未发现 SHOPLINE Admin Token 或 Shopify Admin Token 被写入仓库。

## 遗留问题

- SHOPLINE 后台当前停在登录页；登录后需替换现有 `Google_Analytic` 客户事件并新增 `BLK Signal Publisher` Custom Code。
- 当前 Google 浏览器账号无 BLK 媒体资源管理权限，OAuth 所属 Google Cloud 项目也未启用 Analytics Admin API；因此 12 个自定义维度尚未创建。项目拥有者需先启用该 API，或由有 BLK 管理权限的 Google 账号按交接文档创建。
- SHOPLINE 官方说明 `checkout_completed` 仅在 Thank you 页成功加载时触发，仍需用后续真实订单完成最终购买归因验收。
