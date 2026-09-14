# 2026-09-14 FKK GA4 接入

## 本次目标

把 FKK（Football Kit UK）作为第三个独立站点接入现有数据分析面板，并沿用 TKF/TMS 的 GA4、Cloudflare D1、菜单点击、全局点击和用户行为数据链路。

## 修改范围

- 面板站点配置、接口参数校验与本机同步脚本。
- Cloudflare Worker 的三站点部署、来源校验和 FKK 独立入口。
- FKK Shopify 正式主题中的匿名身份与点击埋点。
- FKK GA4 媒体资源的自定义维度。
- FKK 历史 GA4 汇总数据导入。

## 新增内容

- `cloudflare/user-events/src/sites.ts`：集中维护 TKF、TMS、FKK 的站点键、Worker 服务名和正式域名映射。
- `shopify/theme-assets/fkk-user-identity.js`：维护 FKK 独立匿名访客、会话与事件上报。
- `shopify/theme-assets/fkk-user-identity-config.liquid`：注入 FKK 独立 Worker 地址与签名配置。
- `shopify/theme-assets/fkk-global-click.js`：采集 FKK 可操作元素点击，同时发送 GA4 菜单/全局点击事件。
- `shopify/customer-pixels/fkk-ga4-customer-pixel.js`：准备 FKK 的加入购物车、开始结账、购买及购买归因代码。
- `shopify/backups/fkk-theme-2026-09-14-before-signal.liquid`：正式主题接入前备份。
- `docs/handoffs/FKK-Customer-Pixel-Codex操作交接.md`：提供可直接转交给站点同事及其 Codex 的自包含操作文档，内嵌完整 Pixel 代码、执行边界与验收标准。
- 新增 `npm run sync:fkk` 与 Worker 的 `npm run deploy:fkk` 命令。

## 调整内容

- 面板所有站点参数由分散的 TKF/TMS 判断改为复用统一 `siteKeys`，FKK 可在概览、菜单分析、全局埋点、用户行为、数据健康和 AI 分析中选择。
- Worker 支持 `site=fkk`，并新增“来源域名 + Worker 服务名 + siteKey”三项一致校验，浏览器不能把一个站点的数据写入另一个站点。
- FKK 正式主题已加载身份和点击埋点文件，保留正式 GA4 衡量 ID `G-51EXGWMTDP`，不重复发送页面浏览。
- FKK GA4 属性 `553763610` 已建立 12 个事件级自定义维度：菜单名称/键/父菜单/层级/动作、点击目标、热力网格、元素分组、页面区域、元素键/名称和目标路径。
- FKK Shopify Customer Pixel 已由有权限的站点同事创建并启用，正式前台已加载该 Pixel 的 Shopify 沙箱运行环境。
- 已同步 2026-08-15 至 2026-09-13 的 FKK GA4 历史数据到 Cloudflare D1，共 9 行汇总数据，`syncId=13`。
- 已手动运行一次 FKK GA4 自动同步链路，补齐 2026-09-12 至 2026-09-14 数据，写入 27 行，远端 `syncId=14`。
- Codex “每日同步 GA4 与数据健康检查”自动化已从 TKF/TMS 两站扩展为 TKF/TMS/FKK 三站，增加 `npm run sync:fkk` 和 FKK 健康页检查。
- 已按更新后的自动化顺序完整运行三站同步：TKF 写入 222 行（`syncId=10`），TMS 写入 720 行（`syncId=11`），FKK 写入 9 行（`syncId=17`），三条命令均正常退出。
- 面板生产版本已发布到 `https://tkf-signal.vercel.app`。

## 影响范围

- TKF/TMS 保持原有数据和查询方式；三站继续共用一套 Worker 源码和一个 D1，但按 `site_key` 隔离。
- FKK 概览已经可以显示真实页面浏览与访问用户；菜单、全局点击和用户行为会从主题埋点上线后开始积累。
- GA4 自定义维度只对创建后的新事件生效，历史事件不会补出过去不存在的自定义参数报表。

## 自检结果

- 根项目 `npm run typecheck` 通过，Worker `npm run typecheck` 通过。
- FKK 三份浏览器脚本通过 `node --check`，Worker 发布前 dry-run 通过。
- FKK、TKF、TMS Worker 均已重新发布；FKK `/health` 返回独立服务名和 Cloudflare D1 存储状态。
- 使用错误 TKF 载荷向 FKK Worker 提交时返回 403；正确 FKK 测试事件写入成功，合成记录随后按唯一 ID 清理。
- 使用与 Shopify Customer Pixel 相同的 `Origin: null` 和 `shopify_pixel:fkk` 购买载荷进行线上测试，Worker 返回 200 并写入 1 行；测试购买记录随后精确删除，D1 回报删除 1 行。
- 回读 FKK 正式主题，确认三个主题文件与 `theme.liquid` 加载钩子已上线。
- 正式店浏览器实测 FKK 埋点脚本、`G-51EXGWMTDP` 和 GA4 页面浏览请求正常；菜单按钮会产生 `global_click` 与 `header_navigation_click`。
- GA Data API 成功读取属性 `553763610` 的真实数据；本机生产构建成功生成 17 个页面/接口。
- 浏览器真实打开 FKK 概览，确认三站二级菜单、日期范围、3,337 次页面浏览、2,736 位访问用户及设备构成均正常显示；菜单、全局点击和用户行为页面保持 FKK 站点参数且无串站数据。
- Vercel 生产构建生成 17 个页面/接口并完成别名切换；线上浏览器再次确认 FKK 概览、菜单分析跳转和日期参数保留正常。
- 在隔离浏览器中打开 FKK 正式店，确认 Shopify 自定义 Pixel 沙箱 `web-pixel-238420249` 已加载，并向 `G-51EXGWMTDP` 成功发送 GA4 请求。
- 真实执行一次商品加入购物车，GA4 `add_to_cart` 请求返回 204；请求包含商品名、变体尺码 S、单价 42、数量 1、币种 GBP，证明 Customer Pixel 的加购订阅已在生产环境生效。
- FKK 同步后回查 Cloudflare D1：菜单汇总已有 3 次点击，全局点击汇总已有 97 次点击，站点标准事件汇总为 3,877。
- 线上 FKK 菜单页已显示 3 次点击、2 个菜单；全局埋点页已显示 97 次点击、7 个元素和 4 个页面。首次请求命中 30 秒报表缓存，缓存重验后数据正常。
- 三站健康页回查：TKF 运行正常；TMS 因 09/07 无数据显示“需要关注”；FKK 因新接入前的 09/07–09/10 无数据显示“发现异常”。三站最近同步时效与字段有效率均正常，FKK 的 4 天缺口属于上线前无埋点的历史窗口。

## 遗留问题

- 当前账号 `wjiahao@ouyaluo.com` 仍无法读取 FKK Shopify “客户事件”后台页，但正式前台运行证据已确认 Customer Pixel 启用成功。
- `checkout_started` 与 `checkout_completed` 不使用测试订单人为触发；需等下一次真实结账/购买后，再在 GA4 与 D1 中核对真实购买归因。
