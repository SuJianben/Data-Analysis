# 2026-09-18 购买快速通道 v2

## 本次目标

消除购买事件在发出 Signal 请求前被 SHA-256 阻塞的问题，覆盖 TKF、TMS、FKK 和 BLK。

## 修改范围

- 四站 Customer Pixel / 客户事件脚本。
- Vercel 直连接收端与 Cloudflare 兼容入口的载荷校验。
- Shopify、SHOPLINE、投递重试、商品证据和真实接口链路测试。

## 新增内容

- `scripts/test-purchase-fastpath.mjs`：冻结 SHA-256，验证四站 purchase 仍立即发出。
- `logs/bugs/2026-09-18-purchase-fastpath.md`：记录共享根因、修复和验收状态。
- `docs/handoffs/PURCHASE-FASTPATH-V2-ROLLOUT.md`：逐站后台替换与验收说明。

## 调整内容

- purchase 首包不再等待订单或客户哈希。
- 首包附带精简商品证据与版本号，并使用平台事件号幂等去重。
- 服务端兼容新旧两种购买证据，避免旧 Pixel 在切换期间中断。

## 影响范围

- 只调整购买事件的发送顺序和接收校验；页面浏览、点击、加购和开始结账逻辑保持原有语义。
- 历史缺失购买不从平台订单反向补录。

## 自检

- `npm run typecheck`：通过。
- `npm run test:tracking`：通过。
- `npm run test:worker-ingest`：通过。
- `npm run test:blk-filter`：通过。
- `npm run build`：通过。
- 本地重复写入与正式队列探针：通过，测试记录已删除。

## 遗留问题

- 四个店铺后台仍需替换 Pixel 文件；在替换并出现下一笔自然订单前，不能把“代码完成”表述为真实购买闭环已验收。
