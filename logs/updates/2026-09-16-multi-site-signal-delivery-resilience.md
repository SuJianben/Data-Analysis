# 2026-09-16 多站点 Signal 投递稳定性统一优化

## 本次目标

- 不导入 Shopify 或 SHOPLINE 订单作为行为数据，继续保持平台订单、GA4 与 Signal 三条验证链独立。
- 为 TKF、TMS、FKK、BLK 的开始结账和购买事件补齐响应检查、有限重试和失败诊断，降低网络抖动或临时服务错误造成的静默漏采。

## 修改范围

- `shopify/customer-pixels/tkf-signal-purchase-bridge.js`
- `shopify/customer-pixels/tms-ga4-customer-pixel.js`
- `shopify/customer-pixels/fkk-ga4-customer-pixel.js`
- `shopline/customer-events/blk-ga4-signal-pixel.js`
- `scripts/test-signal-delivery-retry.mjs`
- `package.json`

## 新增与调整

- 开始结账最多尝试 2 次，购买最多尝试 4 次；仅对网络异常、HTTP 429 和 5xx 临时错误重试。
- 同一购买在重试期间复用相同事件号，避免短暂失败恢复后形成重复购买。
- 最终仍失败时写入 GA4 `signal_delivery_error` 诊断事件，保留站点、事件类型、响应状态和尝试次数，不上传原始客户号或订单号。
- 新增四站统一投递模拟测试，覆盖“503 后恢复”“购买最终失败”“重试事件号不变”和“失败诊断已产生”。

## 发布状态

- TMS：已更新 Shopify 已连接的 `Google Analytics` 自定义像素，保存后读回确认包含重试配置。
- TKF：已保留原有 GA4 主体，只替换 Signal 桥接区块；合并前后按长度和 SHA-256 校验，保存后 Shopify 提示像素已保存。
- BLK：已在 SHOPLINE 原像素中原位加入重试逻辑，保留现有 GA4、流量过滤和隐私设置；保存后代码逐字读回一致，仍为已连接状态。
- FKK：本地代码与自动测试已完成；当前登录账号仍无 FKK Customer Events 权限，未在 Shopify 后台发布。

## 影响范围

- 不改变站点的数据来源、GA4 衡量 ID、Worker 地址、隐私设置或用户身份映射。
- 不增加页面浏览和普通点击的客户端重试，避免低价值事件放大 D1 写入压力。
- 历史漏采购买不会通过订单后台补写；优化只作用于发布后的新事件。

## 自检

- `npm run test:tracking`：通过。
- `npm run test:worker-ingest`：通过。
- `npm run test:blk-filter`：通过。
- `npm run typecheck`：通过。
- TMS、TKF、BLK 后台保存和连接状态均完成真实页面检查。

## 遗留问题

- FKK 需要具备该店 Shopify 客户事件权限的账号发布本地最新像素代码。
- 购买事件只能在下一笔真实 Online Store 订单发生后完成最终端到端验收；模拟测试和后台代码验收不能代替真实结账事件。
