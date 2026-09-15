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

> 本文档是自包含交接文件，不需要访问原项目目录，也不要再寻找外部 `.js` 文件。

1. 打开 SHOPLINE 后台的“设置 → 客户事件”。
2. 打开现有的 `Google_Analytic`，不要再创建第二个 GA 客户事件。
3. 删除编辑器里的旧代码，完整粘贴下面代码。
4. 保存并保持连接状态。

```javascript
// BLK GA4 ecommerce + Signal purchase - SHOPLINE Customer Events
const GA4_MEASUREMENT_ID = "G-TRCFQDSHYR";
const BLK_SIGNAL_EVENT_ENDPOINT = "https://blk-signal-user-events.trustmereview.workers.dev/v1/events";

const script = document.createElement("script");
script.setAttribute("src", "https://www.googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID);
script.setAttribute("async", "");
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", GA4_MEASUREMENT_ID, { send_page_view: false });

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function pageDetails(event) {
  return {
    page_location: event.data?.url || event.context?.document?.location?.href,
    page_title: event.data?.title || event.context?.document?.title,
    page_referrer: event.context?.document?.referrer || undefined,
  };
}

function pagePath(event, fallback) {
  return event.data?.path || event.context?.document?.location?.pathname || fallback || "/";
}

function shoplineItems(list) {
  return (Array.isArray(list) ? list : []).map((item) => ({
    item_id: item.skuItemNo || item.skuId || item.product_id || item.spuId,
    item_name: item.title || item.product_title || item.line_items_title,
    item_variant: item.variant || item.sku_title,
    item_category: item.category || item.custom_category,
    price: numberValue(item.final_price ?? item.price),
    quantity: Number(item.quantity || 1),
  }));
}

function safeIdentifier(value, fallback) {
  const normalized = String(value || "").replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

function isoTimestamp(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric).toISOString();
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

async function sha256(value) {
  if (!value) return "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function deviceCategory(event) {
  const userAgent = String(event.context?.navigator?.userAgent || "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/.test(userAgent)) return "mobile";
  return "desktop";
}

function signalEvent(event, eventName, overrides = {}) {
  const identity = safeIdentifier(event.clientId || event.id, "shopline_client");
  return {
    eventId: safeIdentifier(`shopline_${eventName}_${event.id}`, `shopline_${eventName}_${identity}`),
    visitorId: safeIdentifier(`visitor_shopline_${identity}`, "visitor_shopline_unknown"),
    eventName,
    occurredAt: isoTimestamp(event.timestamp),
    pagePath: pagePath(event, "/"),
    deviceCategory: deviceCategory(event),
    ...overrides,
  };
}

async function sendSignal(event) {
  await fetch(BLK_SIGNAL_EVENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ siteKey: "blk", source: "shopline_pixel:blk", event }),
    keepalive: true,
  });
}

async function sendSignalPurchase(event) {
  const data = event.data || {};
  const order = data.checkout?.order || {};
  const rawOrderId = data.orderSeq || data.appOrderSeq || order.token || "";
  const list = Array.isArray(data.list) ? data.list : [];
  const itemCount = list.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (!rawOrderId || itemCount < 1) return;

  const fallbackSeed = safeIdentifier(event.clientId || event.id, "shopline_event");
  const [customerIdHash, orderIdHash] = await Promise.all([
    sha256(data.customer_id || ""),
    sha256(rawOrderId),
  ]);
  const currency = String(data.currency || order.currency_code || "").toUpperCase();
  const purchaseEvent = signalEvent(event, "purchase", {
    eventId: safeIdentifier("shopline_purchase_" + event.id, "shopline_purchase_" + fallbackSeed),
    pagePath: pagePath(event, "/checkouts/thank-you"),
    pageSection: "checkout",
    clickTarget: "checkout_completed",
    metadata: {
      currency,
      value: Number(data.value ?? order.total_price ?? 0),
      itemCount,
      orderIdHash,
      platform: "shopline",
    },
  });
  if (customerIdHash) purchaseEvent.customerIdHash = customerIdHash;
  await sendSignal(purchaseEvent);
}

analytics.subscribe("blk_signal_click", (event) => {
  const data = event.data || {};
  const clickParams = {
    page_path: data.page_path || "/",
    element_key: data.element_key || "other:unnamed",
    element_label: data.element_label || "",
    page_section: data.page_section || "other",
    destination_path: data.destination_path || "",
    click_target: data.click_target || "other",
    device_category: data.device_category || "unknown",
  };
  gtag("event", "global_click", clickParams);
  gtag("event", "page_heatmap_click", {
    page_path: clickParams.page_path,
    heatmap_cell: data.heatmap_cell || "x0_y0",
    element_group: data.element_group || clickParams.click_target,
    page_section: clickParams.page_section,
    click_target: clickParams.click_target,
    device_category: clickParams.device_category,
  });
  if (clickParams.page_section === "header" || clickParams.page_section === "navigation") {
    gtag("event", "header_navigation_click", {
      menu_name: clickParams.element_label || "(unnamed menu)",
      menu_key: clickParams.element_key,
      parent_menu_name: "",
      menu_level: "1",
      menu_action: clickParams.click_target === "toggle" ? "toggle" : "navigate",
      navigation_location: clickParams.page_section,
      click_target: clickParams.destination_path,
      device_category: clickParams.device_category,
    });
  }
  sendSignal(signalEvent(event, "global_click", {
    elementKey: clickParams.element_key,
    elementLabel: clickParams.element_label,
    pageSection: clickParams.page_section,
    destinationPath: clickParams.destination_path,
    clickTarget: clickParams.click_target,
    metadata: {
      heatmapCell: data.heatmap_cell || "x0_y0",
      elementGroup: data.element_group || clickParams.click_target,
    },
  })).catch(() => {});
});

analytics.subscribe("page_viewed", (event) => {
  gtag("event", "page_view", pageDetails(event));
  sendSignal(signalEvent(event, "page_view")).catch(() => {});
});

analytics.subscribe("product_added_to_cart", (event) => {
  const data = event.data || {};
  gtag("event", "add_to_cart", {
    ...pageDetails(event),
    currency: data.currency,
    value: numberValue(data.value),
    items: shoplineItems(data.list),
  });
  sendSignal(signalEvent(event, "add_to_cart", {
    pageSection: "product",
    clickTarget: "product_added_to_cart",
    metadata: {
      currency: String(data.currency || "").toUpperCase(),
      value: Number(data.value || 0),
      itemCount: (Array.isArray(data.list) ? data.list : []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    },
  })).catch(() => {});
});

analytics.subscribe("checkout_started", (event) => {
  const data = event.data || {};
  gtag("event", "begin_checkout", {
    ...pageDetails(event),
    currency: data.currency || data.checkout?.order?.currency_code,
    value: numberValue(data.value ?? data.checkout?.order?.total_price),
    items: shoplineItems(data.list),
  });
  sendSignal(signalEvent(event, "begin_checkout", {
    pageSection: "checkout",
    clickTarget: "checkout_started",
    metadata: {
      currency: String(data.currency || data.checkout?.order?.currency_code || "").toUpperCase(),
      value: Number(data.value ?? data.checkout?.order?.total_price ?? 0),
      itemCount: (Array.isArray(data.list) ? data.list : []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    },
  })).catch(() => {});
});

analytics.subscribe("checkout_completed", (event) => {
  const data = event.data || {};
  const order = data.checkout?.order || {};
  gtag("event", "purchase", {
    ...pageDetails(event),
    transaction_id: data.orderSeq || data.appOrderSeq || order.token,
    value: numberValue(data.value ?? order.total_price),
    tax: numberValue(data.taxAmount),
    shipping: numberValue(order.shipping_price),
    currency: data.currency || order.currency_code,
    coupon: data.coupon || undefined,
    items: shoplineItems(data.list),
  });
  sendSignalPurchase(event).catch(() => {});
});

```

该脚本负责：

- 使用 `G-TRCFQDSHYR` 上报 GA4 页面浏览、加购、开始结账和购买；
- 接收店铺页面发布的菜单与全局点击事件；
- 将脱敏后的用户行为和购买归因数据写入 BLK Worker；
- 不采集姓名、邮箱、电话、地址或原始订单号。

## 第二步：确认店铺页面发布器

此项已经在 2026-09-15 通过 SHOPLINE Script Tag API 完成，不需要同事安装 Custom Code，也不要重复新增脚本。

- Script Tag ID：`6aa8a367320c026a3e51e018`
- 正式脚本：`https://tkf-signal.vercel.app/integrations/shopline/blk-signal-publisher.js`
- 作用范围：全部页面
- 加载事件：`onload`

该公开脚本负责在用户允许追踪后采集菜单点击和全局点击，并通过 SHOPLINE 自定义事件把数据交给第一步的客户事件 Pixel。

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
