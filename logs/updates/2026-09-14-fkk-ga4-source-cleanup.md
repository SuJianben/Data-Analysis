# 2026-09-14 FKK GA4 来源清理

## 本次目标

保留 FKK 的正式 GA4 衡量 ID `G-51EXGWMTDP`，清理页面同时加载的其他 GA4 数据流，降低重复统计风险。

## 修改范围

- FKK 正式站点 `footballkituk.com` 的 GA/GTM 加载来源检查。
- FKK Shopify 正式主题 `FKK Mobile Stacked Split Promo 2026-09-11`（主题 ID `191936430361`）中的 `layout/theme.liquid`。

## 新增内容

- 无运行时文件或公共模块。
- 新增本次可追溯更新记录。

## 调整内容

- 从正式主题 `layout/theme.liquid` 删除 `G-7L2C429KC8` 的完整 gtag 初始化代码块。
- 保留同文件中的 `G-51EXGWMTDP`，未调整 Google Ads、GTM、Microsoft Clarity 或其他主题逻辑。

## 来源核对

- `G-7L2C429KC8`：主题代码直接注入，已清理。
- `G-HK1Y567Q2Q`：Shopify Google 应用 Web Pixel 注入，并与 `AW-16511331246` Google Ads 配置关联。
- `G-EM8V8CDL0V`：由 `GTM-K37NQN8D` 容器动态触发。
- `G-51EXGWMTDP`：主题代码直接注入，本次按要求保留。

## 影响范围

- FKK 新页面访问不再向 `G-7L2C429KC8` 发送主题直连 GA4 数据。
- 不影响保留的 `G-51EXGWMTDP`。
- 不影响 Google Ads 的 `AW-16511331246`。

## 自检结果

- 修改前完整回读正式主题文件，确认待删除代码块只出现一次，并保留恢复所需的原始代码内容。
- 修改后再次回读正式主题：`G-7L2C429KC8` 不存在，`G-51EXGWMTDP` 仍存在。
- 使用新查询参数重新打开正式站点，浏览器实测 `G-7L2C429KC8` 已不再加载，`G-51EXGWMTDP` 正常加载。

## 遗留问题

- `G-HK1Y567Q2Q` 尚未清理：当前登录的 Shopify 账号没有 FKK 后台权限，需要切换到有权限的账号后在 Google 应用中解除该 GA4 连接，同时保留 Ads 配置。
- `G-EM8V8CDL0V` 尚未清理：当前登录的 Google 账号没有 `GTM-K37NQN8D` 容器权限，需要切换到持有该容器的 Google 账号后停用对应 GA4 标签。
