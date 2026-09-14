# FKK Customer Pixel：交给 Codex 的操作文档

## 同事发送给 Codex 时需要附带的消息

请把本文件上传给 Codex，并在消息正文中明确发送下面这句话：

> 请按照附件执行。我授权你在 FKK 的 Shopify 后台“设置 → 客户事件”中检查、创建、保存并连接名为 `FKK GA4` 的自定义 Pixel。操作范围仅限客户事件配置，不要访问订单、客户、付款或其他敏感数据；完成后请验证状态并向我汇报。

只有上传文件、没有上面这句明确授权时，Codex 可能会把附件视为参考资料而不是操作授权。

---

## 给 Codex 的执行任务

### 一、目标

在 FKK Shopify 店铺创建并连接唯一的自定义 Customer Pixel，使以下事件发送到正式 GA4，并把完成购买事件同步到 FKK 数据分析面板：

- 加入购物车：`add_to_cart`
- 开始结账：`begin_checkout`
- 完成购买：`purchase`

### 二、必须核对的店铺信息

- Shopify 店铺地址：`fbed87-94.myshopify.com`
- Shopify 后台店铺标识：`fbed87-94`
- 正式域名：`footballkituk.com`
- GA4 媒体资源 ID：`553763610`
- 正式 GA4 衡量 ID：`G-51EXGWMTDP`
- FKK Worker：`https://fkk-signal-user-events.trustmereview.workers.dev/v1/events`
- Pixel 名称：`FKK GA4`

如果当前后台并非 `fbed87-94`，立即停止，不要在其他店铺创建 Pixel。

### 三、执行边界

- 只允许操作 `设置 → 客户事件 → 自定义像素`。
- 不访问订单、客户、付款、结账记录等敏感数据。
- 不修改 `theme.liquid` 或其他主题文件；页面浏览与点击埋点已经在主题中配置好。
- 不安装 Shopify Google 应用，不新建 GTM，不添加其他 GA4 衡量 ID。
- 不删除或断开已有 Pixel。
- 不创建重复的 `FKK GA4`：如果已存在，先打开检查代码与连接状态；内容正确时只连接，不重复创建。
- 不向代码中添加 Shopify Admin API Token、邮箱、密码或任何客户资料。

### 四、后台操作步骤

1. 打开：`https://admin.shopify.com/store/fbed87-94/settings/customer_events`。
2. 核对当前店铺是 FKK，URL 中包含 `/store/fbed87-94/`。
3. 进入“自定义像素 / Custom pixels”。
4. 检查是否已经存在名为 `FKK GA4` 的 Pixel：
   - 如果不存在，点击“添加自定义像素 / Add custom pixel”，名称填写 `FKK GA4`。
   - 如果已存在，不创建第二个，打开现有 Pixel 检查并更新为本文代码。
5. 客户隐私建议：
   - 权限选择“需要 / Required”。
   - 用途只选择“分析 / Analytics”。
   - 数据销售选择“不属于数据销售”。
   - 如果店铺已有明确的公司合规策略与此不同，不要自行覆盖，先向用户报告。
6. 将下方“完整 Pixel 代码”原样粘贴进代码编辑器。
7. 点击“保存 / Save”。
8. 保存成功后点击“连接像素 / Connect pixel”。
9. 在 Shopify 的连接确认窗口中核对名称仍为 `FKK GA4`，然后完成连接。

### 五、完整 Pixel 代码

```javascript
// FKK GA4 ecommerce + Signal purchase - Shopify Customer Events
const GA4_MEASUREMENT_ID = 'G-51EXGWMTDP';
const FKK_SIGNAL_EVENT_ENDPOINT = 'https://fkk-signal-user-events.trustmereview.workers.dev/v1/events';
const FKK_SIGNAL_VISITOR_KEY = 'fkk_signal_visitor_id';
const FKK_SIGNAL_SESSION_KEY = 'fkk_signal_session_id';

const script = document.createElement('script');
script.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID);
script.setAttribute('async', '');
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', GA4_MEASUREMENT_ID, { send_page_view: false });

function eventPage(event) {
  return {
    page_location: event.context?.document?.location?.href,
    page_title: event.context?.document?.title,
    page_referrer: event.context?.document?.referrer || undefined,
  };
}

function moneyAmount(money) {
  const amount = Number(money?.amount ?? money);
  return Number.isFinite(amount) ? amount : undefined;
}

function checkoutItems(checkout) {
  return (checkout?.lineItems || []).map((lineItem) => {
    const variant = lineItem.variant || lineItem.merchandise || {};
    return {
      item_id: variant.sku || variant.id || lineItem.id,
      item_name: lineItem.title || variant.product?.title,
      item_variant: variant.title,
      price: moneyAmount(variant.price),
      quantity: Number(lineItem.quantity || 1),
    };
  });
}

function safeIdentifier(value, fallback) {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9._:-]/g, '_').slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

async function sha256(value) {
  if (!value) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function storageValue(storage, key) {
  try { return (await storage.getItem(key)) || ''; } catch (_error) { return ''; }
}

function deviceCategory(event) {
  const userAgent = String(event.context?.navigator?.userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android/.test(userAgent)) return 'mobile';
  return 'desktop';
}

async function sendSignalPurchase(event) {
  const checkout = event.data?.checkout;
  if (!checkout) return;
  const storedVisitorId = await storageValue(browser.localStorage, FKK_SIGNAL_VISITOR_KEY);
  const storedSessionId = await storageValue(browser.sessionStorage, FKK_SIGNAL_SESSION_KEY);
  const fallbackSeed = safeIdentifier(event.clientId || event.id, 'shopify_event');
  const visitorId = safeIdentifier(storedVisitorId, `visitor_shopify_${fallbackSeed}`);
  const sessionId = safeIdentifier(storedSessionId, `session_shopify_${fallbackSeed}`);
  const [customerIdHash, orderIdHash] = await Promise.all([
    sha256(checkout.order?.customer?.id || checkout.customer?.id || ''),
    sha256(checkout.order?.id || ''),
  ]);
  const lineItems = Array.isArray(checkout.lineItems) ? checkout.lineItems : [];
  const itemCount = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const purchaseEvent = {
    eventId: safeIdentifier(`shopify_purchase_${event.id}`, `purchase_${fallbackSeed}`),
    visitorId,
    sessionId,
    eventName: 'purchase',
    occurredAt: event.timestamp || new Date().toISOString(),
    pagePath: event.context?.document?.location?.pathname || '/checkouts/thank-you',
    pageSection: 'checkout',
    clickTarget: 'checkout_completed',
    deviceCategory: deviceCategory(event),
    metadata: {
      currency: checkout.currencyCode || '',
      value: Number(checkout.totalPrice?.amount || 0),
      itemCount,
      orderIdHash,
    },
  };
  if (customerIdHash) purchaseEvent.customerIdHash = customerIdHash;
  await fetch(FKK_SIGNAL_EVENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ siteKey: 'fkk', source: 'shopify_pixel:fkk', event: purchaseEvent }),
    keepalive: true,
  });
}

analytics.subscribe('product_added_to_cart', (event) => {
  const cartLine = event.data.cartLine;
  const merchandise = cartLine?.merchandise || {};
  const price = moneyAmount(merchandise.price);
  const quantity = Number(cartLine?.quantity || 1);
  gtag('event', 'add_to_cart', {
    ...eventPage(event),
    currency: merchandise.price?.currencyCode,
    value: price === undefined ? undefined : price * quantity,
    items: [{
      item_id: merchandise.sku || merchandise.id,
      item_name: merchandise.product?.title,
      item_variant: merchandise.title,
      price,
      quantity,
    }],
  });
});

analytics.subscribe('checkout_started', (event) => {
  const checkout = event.data.checkout;
  gtag('event', 'begin_checkout', {
    ...eventPage(event),
    currency: checkout?.currencyCode,
    value: moneyAmount(checkout?.totalPrice),
    items: checkoutItems(checkout),
  });
});

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data.checkout;
  const coupon = (checkout?.discountApplications || [])
    .map((discount) => discount.title || discount.code)
    .filter(Boolean)
    .join(', ');
  gtag('event', 'purchase', {
    ...eventPage(event),
    transaction_id: checkout?.order?.id,
    value: moneyAmount(checkout?.totalPrice),
    tax: moneyAmount(checkout?.totalTax),
    shipping: moneyAmount(checkout?.shippingLine?.price),
    currency: checkout?.currencyCode,
    coupon: coupon || undefined,
    items: checkoutItems(checkout),
  });
  sendSignalPurchase(event).catch(() => {});
});
```

### 六、保存前必须检查

在代码编辑器中搜索并确认：

- `G-51EXGWMTDP` 存在，且没有其他 `G-` 衡量 ID。
- Worker 地址以 `fkk-signal-user-events` 开头，不是 `tkf-` 或 `tms-`。
- 载荷中是 `siteKey: 'fkk'`。
- 来源是 `source: 'shopify_pixel:fkk'`。
- 存在 `product_added_to_cart`、`checkout_started`、`checkout_completed` 三个订阅。
- `gtag('config', ...)` 中保留 `send_page_view: false`，避免页面浏览重复统计。

### 七、完成标准

只有同时满足以下条件才算完成：

1. 自定义像素列表里只存在一个 `FKK GA4`。
2. 状态明确显示“已连接 / Connected”，不能只显示“已保存”。
3. 回读 Pixel 代码，仍然包含正确的 GA4 ID、FKK Worker、`siteKey: 'fkk'` 和三个 Shopify 事件订阅。
4. 没有修改主题、其他 Pixel 或其他店铺设置。

完成后请向用户汇报：

- 店铺标识是否为 `fbed87-94`。
- Pixel 名称和连接状态。
- 隐私权限最终设置。
- 代码中确认到的 GA4 ID 与 Worker 地址。
- 是否发现重复 Pixel、保存报错或连接失败。
- 提供显示 `FKK GA4` 和“已连接”的页面截图。

不要声称已经检测到真实购买；真实购买验收需要等待下一笔订单，或者由原项目负责人进行不涉及真实付款的专用测试。
