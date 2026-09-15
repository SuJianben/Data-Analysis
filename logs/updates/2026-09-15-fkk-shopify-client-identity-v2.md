# 2026-09-15 FKK Shopify clientId 身份链路 v2

## 本次目标

- 修复 FKK 真实购买已经进入面板、但购买前行为无法归入同一用户的问题。
- 将身份归并从跨结账页存储读取切换为 Shopify 官方事件 `clientId`。

## 修改范围

- FKK 主题点击发布脚本与 Customer Pixel 待部署代码。
- Cloudflare Worker 的 Shopify 隔离来源校验与数据健康查询。
- 面板用户身份文案与数据健康说明。
- FKK 后台操作交接文档和自动化测试脚本。

## 新增内容

- `scripts/test-fkk-shopify-signal.mjs`：模拟主题点击与五类 Customer Pixel 事件，验证同一访客归并、哈希和兜底标记。
- `scripts/test-shopify-pixel-ingest.mjs`：验证 Worker 对合法 Shopify Pixel 事件的放行以及异常载荷拒绝。
- 数据健康“购买轨迹归并”检查项。
- Worker `/health` 增加身份链路版本标识。

## 调整内容

- FKK 点击事件通过 Shopify Analytics 发布，不再直接依赖自建 localStorage 身份。
- FKK Pixel 向 Signal 写入 `page_view`、`global_click`、`add_to_cart`、`begin_checkout` 和 `purchase`。
- 五类事件统一生成 `shopify_client_<clientId>` 访客号；缺少 clientId 时生成可监控的兜底号。
- 客户身份统一为 Pixel 内 SHA-256，主题端不再注入 HMAC 客户哈希。
- “登录客户”调整为“已识别客户”，并明确该类型不等于访客一定登录。
- Worker 保留旧版购买载荷兼容，避免后台 Pixel 更新前购买事件中断。

## 影响范围

- FKK 新版 Pixel 生效后的新事件。
- Worker 校验与健康检查代码由四个站点 Worker 共用；TKF、TMS、BLK 现有载荷继续兼容。
- 历史断链购买保持原样，不做可能串号的猜测性回填。

## 自检

- 主项目和 Worker TypeScript 类型检查通过。
- Next.js 生产构建通过。
- 两组埋点自动化测试通过。
- Worker 本地 D1 身份健康 SQL 执行成功。
- 四个 Worker 已发布；FKK 当前版本支持统一事件写入。
- FKK Worker 线上正向写入、D1 回读、反向拒绝和测试数据清理均通过。
- Playwright 回读线上数据健康页，确认“购买轨迹归并”显示实际 1 / 2 已串联。
- 生产面板已发布到 `https://tkf-signal.vercel.app`，生产构建与浏览器控制台检查通过。
- 四个 Worker 均回报 `2026-09-15.identity-v2`：TKF `52319fee-f650-4716-824e-ba65a02afb25`、TMS `5756c778-dc59-43f1-b475-29b96bb4959c`、FKK `ff87143d-53f2-42f4-a4ee-c49aeaa9ad59`、BLK `cb0786b2-dc16-461b-a5b0-936ce90689ec`。
- 线上再次验证身份来源不匹配的新版购买请求返回 403。

## 遗留问题

- Shopify 自定义 Pixel 没有可用于更新代码的 Admin API，仍需在 FKK 后台手动替换 `FKK GA4` 代码并保持已连接。
- Pixel 更新完成后才能发布 FKK 主题点击脚本，随后等待下一笔自然订单做最终闭环验收。
