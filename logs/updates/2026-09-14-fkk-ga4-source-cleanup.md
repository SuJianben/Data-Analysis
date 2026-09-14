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
- 用户确认负责站点的同事已卸载 Shopify Google 应用，应用注入的 `G-HK1Y567Q2Q` 与 `AW-16511331246` 已停止加载。
- 从正式主题 `layout/theme.liquid` 删除 `GTM-K37NQN8D` 的完整加载代码块，停止其触发的 `G-EM8V8CDL0V`。
- 保留同文件中的 `G-51EXGWMTDP`，未调整 Microsoft Clarity 或其他主题逻辑。

## 来源核对

- `G-7L2C429KC8`：主题代码直接注入，已清理。
- `G-HK1Y567Q2Q`：原由 Shopify Google 应用 Web Pixel 注入，应用卸载后已停止加载。
- `G-EM8V8CDL0V`：原由 `GTM-K37NQN8D` 容器动态触发，GTM 入口清理后已停止加载。
- `G-51EXGWMTDP`：主题代码直接注入，本次按要求保留。

## 影响范围

- FKK 新页面访问不再向 `G-7L2C429KC8` 发送主题直连 GA4 数据。
- FKK 不再加载 `GTM-K37NQN8D`，该容器原有的全部标签均停止运行。
- 不影响保留的 `G-51EXGWMTDP`。
- Shopify Google 应用卸载后，Google Ads 的 `AW-16511331246` 同时停止运行；若后续继续投放，需要单独恢复 Ads 转化追踪。

## 自检结果

- 修改前完整回读正式主题文件，确认待删除代码块只出现一次，并保留恢复所需的原始代码内容。
- 修改后再次回读正式主题：`G-7L2C429KC8` 不存在，`G-51EXGWMTDP` 仍存在。
- 使用新查询参数重新打开正式站点，浏览器实测 `G-7L2C429KC8` 已不再加载，`G-51EXGWMTDP` 正常加载。
- GTM 修改前完整回读正式主题，确认 `GTM-K37NQN8D` 只存在一个独立加载块且没有 `noscript` 第二入口。
- 修改后通过带缓存隔离参数的新页面再次检查：`GTM-K37NQN8D`、`G-EM8V8CDL0V`、`G-HK1Y567Q2Q` 和 `G-7L2C429KC8` 均未加载，页面只保留 `G-51EXGWMTDP`。

## 遗留问题

- GA4 重复来源清理已完成。
- `AW-16511331246` 已随 Shopify Google 应用卸载而停止；是否恢复 Google Ads 转化追踪由后续投放需求决定。
