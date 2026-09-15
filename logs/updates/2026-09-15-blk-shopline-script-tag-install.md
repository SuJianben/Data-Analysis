# 2026-09-15 BLK SHOPLINE Script Tag 接入

## 本次目标

- 在不依赖本机 SHOPLINE 后台登录的情况下，为 BLK 正式店安装页面交互发布器。
- 保持发布器只有一份可维护的业务实现，避免后台复制代码与仓库版本长期分叉。

## 修改范围

- BLK 页面发布器的托管位置与手动安装备用加载器。
- BLK SHOPLINE 交接说明和项目 README。
- SHOPLINE 正式店的 Script Tag 配置。

## 新增内容

- `public/integrations/shopline/blk-signal-publisher.js`：由 Vercel 公开托管的唯一发布器实现。
- `logs/updates/2026-09-15-blk-shopline-script-tag-install.md`：记录本次外部安装、验证结果和剩余边界。

## 调整内容

- `shopline/custom-code/blk-signal-publisher.js` 改为精简备用加载器，仅在无法使用 Script Tag API 时手动安装。
- 交接文档优先使用 SHOPLINE Script Tag API，不再要求把整段业务代码复制进 Custom Code 后台。
- 交接文档改为完全自包含：内嵌完整 `Google_Analytic` 客户事件代码，并明确 Publisher 已安装，不再依赖接收方本地项目路径。
- 通过 SHOPLINE Admin REST API 为 `myfirststore-13z0` 创建一条 `display_scope=all`、`event=onload` 的 Script Tag。

## 影响范围

- BLK 正式店会加载 `https://tkf-signal.vercel.app/integrations/shopline/blk-signal-publisher.js`。
- 不影响 TKF、TMS、FKK 三个 Shopify 站点。
- 不修改 BLK 已有 GA4 汇总数据、D1 数据或客户事件 Pixel。
- 管理令牌未写入仓库、日志或前端资源。

## 自检结果

- 两份发布器脚本均通过 `node --check`。
- 根项目 `npm run typecheck` 与 `npm run build` 均通过。
- Vercel 生产发布完成并继续使用别名 `https://tkf-signal.vercel.app`。
- 公开脚本返回 HTTP 200，响应类型为 `application/javascript; charset=utf-8`，线上与本地 SHA-256 一致。
- SHOPLINE Script Tag 列表由 0 条变为 1 条，回读确认 ID 为 `6aa8a367320c026a3e51e018`，地址、作用范围和加载事件均正确，没有重复记录。
- BLK Worker 健康检查返回 HTTP 200。
- 自包含交接文档复查通过：不再引用接收方无法访问的 `.js` 相对路径，内嵌代码与仓库源文件内容一致。
- 客户事件代码由站点同事处理后完成线上回读：BLK 在 2026-09-15 已出现 147 位匿名访客、153 条用户事件。
- 抽查一位匿名访客的完整链路，连续记录 3 次 `page_view`、3 次 `global_click` 和 1 次 `add_to_cart`，页面、点击、加购均已从 SHOPLINE 写入 Worker/D1 并能由面板接口读取。
- 复查 Script Tag 仍为唯一 1 条，公开脚本与 BLK Worker 均返回 HTTP 200。

## 遗留问题

- Belgiumkits 正式域名对自动化浏览器返回 Cloudflare HTTP 403，因此无法在本机完成真实点击验收；该结果不代表 Script Tag 创建失败。
- SHOPLINE 自定义客户事件 Pixel 已由有后台权限的同事处理并开始产生真实页面、点击和加购事件。
- 当前尚无接入后的真实 `purchase`，仍需等待下一笔完成购买事件核对 GA4、D1 和面板归因。
