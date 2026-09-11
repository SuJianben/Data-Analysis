/* TMS Signal actionable click collector. */
(function () {
  "use strict";

  if (window.__tmsGlobalClickCollectorV1) return;
  window.__tmsGlobalClickCollectorV1 = true;

  function safeValue(value, fallback) {
    var normalized = String(value || "").trim().slice(0, 80);
    return normalized && /^[a-zA-Z0-9._:-]+$/.test(normalized) ? normalized : (fallback || "");
  }

  function cleanLabel(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  function deviceCategory() {
    var width = window.innerWidth || 0;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  function pageSection(element) {
    if (element.closest("nav, [role='navigation']")) return "navigation";
    if (element.closest("header")) return "header";
    if (element.closest("main")) return "main";
    if (element.closest("footer")) return "footer";
    if (element.closest("aside")) return "aside";
    if (element.closest("form")) return "form";
    return "other";
  }

  function destinationPath(element) {
    var link = element.closest("a[href]");
    if (!link) return "";
    try {
      var url = new URL(link.getAttribute("href"), window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return (url.host === window.location.host ? "" : url.host) + (url.pathname || "/");
    } catch (_error) {
      return "";
    }
  }

  function targetType(element) {
    if (element.closest("a")) return "link";
    if (element.closest("button")) return "button";
    if (element.closest("summary, [aria-expanded]")) return "toggle";
    if (element.closest("[role='button']")) return "role_button";
    return "other";
  }

  function elementKey(element) {
    var explicit = element.closest("[data-track-id]");
    var explicitValue = explicit && explicit.getAttribute("data-track-id");
    if (explicitValue) return safeValue(explicitValue, "custom");
    if (element.id) return safeValue(element.id, "id");
    var named = element.getAttribute("name");
    if (named) return safeValue(named, "named");
    var path = destinationPath(element);
    return targetType(element) + (path ? ":" + path : "");
  }

  function elementLabel(element) {
    var source = element.closest("[data-track-label]");
    var label = source && source.getAttribute("data-track-label");
    if (!label) label = element.getAttribute("aria-label") || element.getAttribute("title");
    if (!label) {
      var productCard = element.closest(".card-wrapper, .card, .product-card, [data-product-card], [data-product-handle]");
      if (productCard) {
        var productTitle = productCard.querySelector("[data-track-label], [data-product-title], .card__heading a, .card__heading, .product-title, .product-card__title, .card-information__text");
        if (productTitle) label = productTitle.getAttribute("data-track-label") || productTitle.innerText || productTitle.textContent;
      }
    }
    if (!label && element.innerText) label = element.innerText;
    if (!label) {
      var image = element.querySelector("img[alt]");
      if (image) label = image.getAttribute("alt");
    }
    return cleanLabel(label);
  }

  function publishShopifyEvent(params) {
    try {
      var analytics = window.Shopify && window.Shopify.analytics;
      if (!analytics) return false;
      var publish = typeof analytics.publish === "function" ? analytics.publish : analytics.publishCustomEvent;
      if (typeof publish !== "function") return false;
      var result = publish.call(analytics, "tms:global_click", {
        ga4EventName: "global_click",
        component: "global_click",
        page_path: params.page_path,
        element_key: params.element_key,
        element_label: params.element_label,
        page_section: params.page_section,
        destination_path: params.destination_path,
        click_target: params.click_target,
        device_category: params.device_category,
        pageLocation: window.location.href
      });
      if (result && typeof result.catch === "function") result.catch(function () {});
      return true;
    } catch (_error) {
      return false;
    }
  }

  function send(params) {
    if (window.TMSSignalIdentity && typeof window.TMSSignalIdentity.track === "function") {
      window.TMSSignalIdentity.track("global_click", params);
    }
    var started = Date.now();
    function attempt() {
      if (publishShopifyEvent(params)) return;
      if (typeof window.gtag === "function") {
        window.gtag("event", "global_click", params);
        return;
      }
      if (window.dataLayer && typeof window.dataLayer.push === "function") {
        window.dataLayer.push(Object.assign({ event: "global_click" }, params));
        return;
      }
      if (Date.now() - started < 10000) window.setTimeout(attempt, 150);
    }
    attempt();
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
    if (!target || !target.closest) return;
    if (target.closest("[data-track-ignore], input, textarea, select, option, video, audio, script, style")) return;
    var actionable = target.closest("a, button, summary, [role='button'], [aria-expanded], [data-track-id], [onclick]");
    if (!actionable) return;
    send({
      page_path: window.location.pathname || "/",
      element_key: elementKey(actionable),
      element_label: elementLabel(actionable),
      page_section: pageSection(actionable),
      destination_path: destinationPath(actionable),
      click_target: targetType(actionable),
      device_category: deviceCategory()
    });
  }, { capture: true, passive: true });
})();
