# 2026-09-14 站点独立 Worker 前缀

## 本次目标

让 TKF 与 TMS 的事件上报地址、服务自报名称和站点标识保持一致，避免 TMS 配置中继续出现 TKF 前缀。

## 修改范围

- Cloudflare Worker 的双站点部署命令与健康检查服务名。
- TMS 本地主题配置和两份客户事件参考代码。
- TMS 线上正式主题的身份配置片段。
- TMS Shopify 客户事件中的购买回传地址。

## 新增内容

- 新增 `deploy:tkf`、`deploy:tms` 两个独立部署命令；总部署命令会依次发布两个 Worker。
- 新增 `SERVICE_NAME` 环境变量，使两个域名的 `/health` 返回各自服务名。
- 新增 TMS 独立入口：`https://tms-signal-user-events.trustmereview.workers.dev`。

## 调整内容

- TKF 保持使用 `https://tkf-signal-user-events.trustmereview.workers.dev`。
- TMS 主题点击与身份事件改为提交到 TMS 入口。
- TMS Shopify Customer Pixel 的购买事件改为提交到 TMS 入口。
- 两个 Worker 继续复用同一源码与同一 D1，通过 `siteKey` 和 `source` 隔离数据。

## 影响范围

- 不迁移、不修改历史正式数据。
- 不改变前端数据面板的查询方式。
- 不改变 TKF 现有上报地址。
- TMS 新产生的主题事件和购买事件会通过 TMS 域名进入原 D1。

## 自检结果

- TypeScript 类型检查通过。
- TKF、TMS Worker 均成功发布，健康检查分别返回对应服务名。
- 回读 TMS 正式主题，确认配置已指向 TMS 域名。
- Shopify 后台明确提示客户事件像素已保存，代码中的旧 TKF 地址已不存在。
- 使用 TMS 正式域名分别提交一条浏览器点击测试事件和一条 Shopify 沙箱购买测试事件，D1 均写入成功且 `site_key = tms`。
- 两条合成测试记录已按唯一事件 ID 精确删除，复查剩余数量为 0。

## 遗留问题

- 无。本次只拆分入口名称，核心服务和数据库仍共享，后续站点扩展继续沿用同一源码部署模式。
