# 2026-09-18 旧 Pixel 入口兼容转发

## 本次目标

- 在不等待四个店铺后台重新发布 Pixel 的情况下，恢复用户行为事件采集。

## 修改范围

- Cloudflare Worker 用户事件入口。
- Worker 环境类型、正式转发地址和运维文档。

## 新增内容

- `src/event-forwarder.ts`：只负责把通过 Worker 校验的事件转发到 Vercel Queue 接口，并保留原始 Origin 与 User-Agent。

## 调整内容

- `/v1/events` 不再写 D1，改为转发到多站点 Vercel `/api/events`。
- `/health` 的存储状态改为 `vercel-queue-proxy`。
- D1 绑定保留给历史读取和回退接口，不承担新增事件写入。

## 影响范围

- TKF、TMS、FKK、BLK 后台仍使用旧 Worker 地址时，也能进入新的本地 SQLite 数据链路。
- 已直接使用 Vercel 新地址的 Pixel 不受影响。

## 自检结果

- Worker TypeScript 检查通过。
- TKF、TMS、FKK、BLK 四个 Worker 已部署成功，健康检查均返回 `storage=vercel-queue-proxy`。
- 四站正式 Origin 经过旧 Worker 转发到 Vercel Queue 的测试均返回 HTTP 200。
- 四站 Customer Pixel 沙箱来源 `Origin: null` 的生产链路测试也全部返回 HTTP 200。
- 两轮共 8 条测试事件由本机成功消费并写入 SQLite；验证后精确删除并重新发布干净快照，用户事件总数恢复为 23,345。
- Shopify 隔离来源、三站身份策略、四站投递重试、购买证据、BLK 过滤和项目 TypeScript 检查全部通过。
- 部署后短时观察窗口内没有新的自然访客事件，需等待真实流量继续确认。

## 遗留问题

- 四站后台 Pixel 最终仍应逐步替换成正式 Vercel 地址，届时可下线兼容 Worker。
