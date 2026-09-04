# 2026年09月03日更新日志：全局点击埋点上线主题

## 本次目标

按需求将全局点击埋点只部署到当前使用中的主题。

## 修改范围

- 主题：TKF AlOVE Cart Drawer Shift 2026-08-24
- 资产：assets/tkf-global-click.js
- 布局：layout/theme.liquid

## 调整内容

- 当前主题已加载全局点击脚本
- 未发布主题副本未做本次写入
- 同步移除未发布主题副本中的脚本加载引用，确保只有当前主题执行埋点
- 采集链接、按钮、折叠项和其他可识别交互控件的页面、元素标识、标签、页面区域、跳转路径、类型和设备
- 不采集输入框内容、用户自由文本、订单信息或 URL 查询参数

## 自检

- 主题资产返回 200，包含 global_click 事件
- 线上首页返回 200，并包含 tkf-global-click.js 引用
- 写入前布局校验摘要：9b5b08a5bb9a08a4068a96bcf2ae0dfd
- 写入后布局校验摘要：37b5c693143f3b0604fa0f02f7d6ff3f

## 遗留问题

- GA4 仍需注册 element_key、element_label、page_section、destination_path 四个事件级自定义维度，之后本地全局埋点报表才能显示明细。

## 2026-09-03 复核与修复

- 复核发现：当前站点未暴露 gtag/dataLayer，GA4 通过 Shopify Web Pixels 接收自定义事件。
- 修复 `assets/tkf-global-click.js`：优先调用 `Shopify.analytics.publish("tkf:global_click", ...)`，并保留 gtag/dataLayer 兼容回退。
- 将 Shopify 分析接口的异步等待窗口延长到 10 秒，避免页面跳转前接口尚未初始化导致丢失。
- 自检：脚本已重新发布，线上脚本地址版本已更新；仍需在 GA4 实时报告中确认新点击事件出现。

## 2026-09-03 客户事件 Pixel 转发

- 在 Shopify 客户事件中的 `Google analytics` Pixel 内，保留原有标准事件和菜单事件处理。
- 在现有 `all_custom_events` 处理器中新增 `global_click` 分支，将页面、元素标识、页面区域、目标路径、点击类型和设备类型转发到 GA4。
- 先放弃了编辑器中的一次未保存错误修改，确认原代码恢复后再完成精确修改。
- Shopify 保存校验通过，刷新页面后无未保存提示、无代码错误。
- Pixel Helper 已收到 `tkf:global_click`，GA4 实时列表仍需等待处理后复核。

## 2026-09-03 数据同步复核

- GA4 实时报告已出现 `global_click`，当前实时计数为 4。
- 本机执行最近 7 天 GA4 同步成功，写入 51 行菜单与站点指标。
- 同步返回的全局点击明细暂为 0 行；本机 `/api/global-clicks` 仍为空，未写入任何假数据。
- 结论：采集链路已通，标准报表明细尚在 GA4 处理窗口内，不能用实时计数直接替代明细数据。
