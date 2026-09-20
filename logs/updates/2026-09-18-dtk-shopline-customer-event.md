# 2026-09-18 DTK SHOPLINE 客户事件接入

## 本次目标

为 Deintrikot（DTK）制作与 BLK 同级的 SHOPLINE 客户事件、GA4 电商事件和 Signal 用户行为链路。

## 修改范围

- 新增 DTK 客户事件、公开托管发布器和手动加载器。
- 面板站点配置、SHOPLINE 不透明来源鉴权、GA4 同步与自动同步站点列表。
- Vercel 生产来源白名单与 SHOPLINE Script Tag。

## 新增内容

- `shopline/customer-events/dtk-ga4-signal-pixel.js`
- `public/integrations/shopline/dtk-signal-publisher.js`
- `shopline/custom-code/dtk-signal-publisher.js`
- `scripts/test-shopline-publisher-contract.mjs`
- `docs/handoffs/DTK-SHOPLINE-客户事件接入交接.md`

## 调整内容

- `src/config/sites.ts` 新增 `dtk`。
- Vercel 客户事件鉴权由 BLK 硬编码改为根据站点 `platform=shopline` 验证，同时强制 `source=shopline_pixel:<siteKey>`。
- 本机 GA4 同步、自动同步和 npm 命令加入 DTK。
- SHOPLINE 后台已创建并连接 `DTK Signal GA4` 客户事件；回读代码与仓库标准文件一致。
- 同事发布新主题后，当前发布主题切换为 `Fashion 2026/09/18 v2`；已再次删除新主题携带的旧直连 GA 和按钮文字推测埋点，改由客户事件与唯一发布器负责采集。

## 影响范围

- 其他四站载荷格式和站点标识不变。
- DTK 使用独立的 `dtk_signal_click`、`shopline_pixel:dtk` 和 `G-2YN8WS6N3E`，不与 BLK 混用。
- 旧主题 GA 与文字推测埋点已移除，避免与客户事件重复上报 `page_view` 和交互事件。

## 自检

- `npm run test:tracking`：通过。
- `npm run build`：通过。
- 构建结束后单独 `npm run typecheck`：通过。
- Vercel 生产发布：通过。
- DTK 事件经 Vercel 鉴权、队列和本地 SQLite 落库：通过；所有测试记录已删除并重发布快照。
- 客户事件编辑器回读 SHA-256 与仓库文件一致：`46bac51c677ca27f95304fd0c282649c52328a815fb8d625e18e2dc95399fbfe`。
- 客户事件状态显示为已连接，页面操作入口为“断开连接”。
- 新主题预览实测：旧 GA 代码 0 份、旧文字推测埋点 0 份、DTK 发布器 1 份。
- 主题管理页确认 `Fashion 2026/09/18 v2` 为已发布主题；保存后等待 SHOPLINE 缓存刷新，正式域名复测结果同为旧 GA 代码 0 份、旧文字推测埋点 0 份、DTK 发布器 1 份。
- 客户事件页复核：`DTK Signal GA4` 代码仍在、状态仍为已连接，未被本次主题调整影响。
- 正式店铺实测产生 `page_view`、`global_click` 和 `add_to_cart`，来源均为 `shopline_pixel:dtk`，并已通过 Vercel 队列写入本地 SQLite。
- 验收产生的 15 条测试事件已从本地主库删除，并重新发布干净快照。

## 遗留问题

- GA4 Analytics Admin API 未启用，自定义维度暂时无法自动补齐。
- `begin_checkout` 仍需随下一次可控测试或自然订单验证。
- DTK 下一笔自然订单尚未验收，购买闭环未完成。
