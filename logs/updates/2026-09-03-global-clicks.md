# 2026年09月03日更新日志：全局点击埋点

## 本次目标

将采集范围从菜单和热力坐标调整为全站可交互元素，统一查看链接、按钮和切换控件的点击行为。

## 修改范围

- 未发布主题 TKF AlOVE Cart Drawer Shift 2026-08-24 的副本
- 全局点击采集脚本和主题加载引用
- SQLite、GA4 同步、导入接口和本地报表
- 侧栏导航入口

## 新增内容

- 新事件名：global_click
- 新字段：页面路径、元素标识、可访问标签、页面区域、目标路径、元素类型、设备类别
- 本地新增 global_click_metrics 表
- 本地新增 /global-clicks 页面和 /api/global-clicks 接口
- 原有菜单报表和热力图代码保留，但热力图不再作为主导航入口

## 隐私边界

不读取输入框内容、用户自由文本、订单信息或带查询参数的完整 URL；元素标签只使用 data-track-label、aria-label 和 title。

## 自检

- 主题副本已写入 tkf-global-click.js，并更新 layout/theme.liquid 加载引用
- /global-clicks、/api/global-clicks、/api/health 均返回 200
- npm run typecheck 通过
- npm run build 通过
- 当前 global_click_metrics 为 0 行，没有导入测试假数据

## 遗留问题

- GA4 需要注册 element_key、element_label、page_section、destination_path 四个事件级自定义维度后，API 才能读取明细。
- 当前改动仍只在未发布主题副本，主主题未发布。
