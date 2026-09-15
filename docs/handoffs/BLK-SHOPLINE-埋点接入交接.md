# BLK SHOPLINE 埋点接入交接

## 接入目标

将 Belgiumkits（BLK）接入现有数据分析面板，并在站点选择器中用 `SHOPLINE` 标签与 TKF、TMS、FKK 的 Shopify 站点区分。沿用现有 GA4 数据源，不新建或重复安装 GA。

## 固定配置

- 站点简称：BLK
- 正式域名：`https://belgiumkits.com`
- GA4 媒体资源 ID：`550705698`
- GA4 衡量 ID：`G-TRCFQDSHYR`
- 用户行为接收地址：`https://blk-signal-user-events.trustmereview.workers.dev/v1/events`

## 第一步：替换现有 Google_Analytic 客户事件

1. 打开 SHOPLINE 后台的“设置 → 客户事件”。
2. 打开现有的 `Google_Analytic`，不要再创建第二个 GA 客户事件。
3. 用 [blk-ga4-signal-pixel.js](../../shopline/customer-events/blk-ga4-signal-pixel.js) 的完整内容替换原代码。
4. 保存并保持连接状态。

该脚本负责：

- 使用 `G-TRCFQDSHYR` 上报 GA4 页面浏览、加购、开始结账和购买；
- 接收店铺页面发布的菜单与全局点击事件；
- 将脱敏后的用户行为和购买归因数据写入 BLK Worker；
- 不采集姓名、邮箱、电话、地址或原始订单号。

## 第二步：接入店铺页面发布器

正式环境优先通过 SHOPLINE Script Tag API 加载以下唯一脚本，不再把整段逻辑复制到后台：

- `https://tkf-signal.vercel.app/integrations/shopline/blk-signal-publisher.js`

这样后续修复埋点时只需更新项目中的公开脚本，不需要再次进入 SHOPLINE 后台粘贴完整代码。

如果 Script Tag API 不可用，再使用以下后台手动方式：

1. 打开 SHOPLINE 后台的“应用 → Custom Code”。
2. 新建代码，名称建议使用 `BLK Signal Publisher`。
3. 作用页面选择“所有页面”，设备选择“桌面端和移动端”，插入位置选择页面底部。
4. 将 [blk-signal-publisher.js](../../shopline/custom-code/blk-signal-publisher.js) 的加载器内容放入 `<script>...</script>` 后保存并启用。

公开脚本负责在用户允许追踪后采集菜单点击和全局点击，并通过 SHOPLINE 自定义事件把数据交给客户事件 Pixel。后台加载器仅负责载入公开脚本，不包含重复业务逻辑。

## 第三步：建立 GA4 自定义维度

在 GA4“管理 → 自定义定义”中创建以下事件范围维度，显示名称和事件参数可使用同名值：

- `menu_name`
- `menu_key`
- `parent_menu_name`
- `menu_level`
- `menu_action`
- `click_target`
- `element_key`
- `element_label`
- `page_section`
- `destination_path`
- `heatmap_cell`
- `element_group`

如果执行电脑上的 Google OAuth 凭证拥有 `analytics.edit` 权限，也可以在项目根目录运行 `npm run ga4:dimensions -- --site blk --apply` 自动补齐；脚本会跳过已存在的维度，不会重复创建。

## 验收流程

1. 在无痕窗口打开 `https://belgiumkits.com`，同意统计类 Cookie。
2. 浏览两个页面，点击一次主菜单、一个商品入口和一次加入购物车。
3. 在 GA4 DebugView 或实时报告中确认 `page_view`、`global_click`、`menu_click` 或加购事件出现。
4. 打开数据面板并切换到 BLK，确认页面不再显示其他站点数据。
5. 待真实订单完成后，核对 SHOPLINE 订单、GA4 `purchase` 和面板用户购买归因三处金额与次数。

## 注意事项

- 不要把 SHOPLINE Admin Token、客户隐私数据或原始订单号写进脚本和文档。
- `checkout_completed` 只有在订单完成页成功加载时才会由 SHOPLINE 客户事件触发；真实购买验收需保留这一平台边界。
- 埋点上线前的数据无法倒推点击明细；GA4 已存在的标准汇总数据可以同步到面板。
