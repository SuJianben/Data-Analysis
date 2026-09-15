(function (window, document) {
  "use strict";

  var STORAGE_KEY = "tkf_visitor_id";
  var SESSION_KEY = "tkf_session_id";
  var DEFAULT_ENDPOINT = "/api/events";
  var config = null;

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + "_" + window.crypto.randomUUID();
    }
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
  }

  function getOrCreate(storage, key, prefix) {
    try {
      var current = storage.getItem(key);
      if (current) return current;
      var next = createId(prefix);
      storage.setItem(key, next);
      return next;
    } catch (_error) {
      return createId(prefix);
    }
  }

  function deviceCategory() {
    var width = window.innerWidth || 0;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  function textOf(element) {
    return (element.getAttribute("data-tkf-label") || element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
  }

  function eventDetails(element) {
    var link = element.closest("a");
    var destination = link && link.href ? new URL(link.href, window.location.href) : null;
    var key = element.getAttribute("data-tkf-key") || element.id || "";
    var target = element.tagName.toLowerCase();
    if (!key && link) key = link.getAttribute("data-tkf-key") || link.pathname || "";
    if (!key) key = target;

    return {
      page_path: window.location.pathname + window.location.search,
      element_key: key.slice(0, 300),
      element_label: textOf(element),
      page_section: element.closest("header, nav, main, footer, section")?.getAttribute("data-tkf-section") || "",
      destination_path: destination ? destination.pathname + destination.search : "",
      click_target: target,
      device_category: deviceCategory()
    };
  }

  function directEvent(details) {
    return {
      eventId: createId("evt"),
      visitorId: getOrCreate(window.localStorage, STORAGE_KEY, "visitor"),
      sessionId: getOrCreate(window.sessionStorage, SESSION_KEY, "session"),
      eventName: "global_click",
      occurredAt: new Date().toISOString(),
      pagePath: details.page_path,
      elementKey: details.element_key,
      elementLabel: details.element_label,
      pageSection: details.page_section,
      destinationPath: details.destination_path,
      clickTarget: details.click_target,
      deviceCategory: details.device_category
    };
  }

  function publishShopifyEvent(details) {
    try {
      var analytics = window.Shopify && window.Shopify.analytics;
      if (!analytics) return false;
      var publish = typeof analytics.publish === "function" ? analytics.publish : analytics.publishCustomEvent;
      if (typeof publish !== "function") return false;
      var result = publish.call(analytics, "tkf:global_click", Object.assign({
        ga4EventName: "global_click",
        component: "global_click",
        pageLocation: window.location.href
      }, details));
      if (result && typeof result.catch === "function") result.catch(function () {});
      return true;
    } catch (_error) {
      return false;
    }
  }

  function sendDirect(details) {
    if (!config || !config.endpoint) return;
    var event = directEvent(details);
    var body = JSON.stringify({ source: config.source || "shopify", event: event });
    var headers = { "Content-Type": "application/json" };
    if (config.ingestKey) headers["x-tkf-ingest-key"] = config.ingestKey;

    if (navigator.sendBeacon && !config.ingestKey) {
      try {
        // text/plain 是 CORS 的简单请求类型，避免跨域商店触发预检；服务端仍按 JSON 内容解析。
        if (navigator.sendBeacon(config.endpoint, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return;
      } catch (_error) {}
    }
    window.fetch(config.endpoint, { method: "POST", headers: headers, body: body, keepalive: true, credentials: "omit" })
      .catch(function () {});
  }

  function send(details) {
    if (publishShopifyEvent(details)) return;
    sendDirect(details);
  }

  function init(options) {
    if (config) return;
    config = Object.assign({ endpoint: DEFAULT_ENDPOINT, source: "shopify" }, options || {});
    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest("a,button,[role='button'],[data-tkf-track]")
        : null;
      if (!target || target.hasAttribute("data-tkf-ignore")) return;
      send(eventDetails(target));
    }, true);
  }

  window.TKFSignalTracker = { init: init };
})(window, document);
