/* BLK Signal storefront interactions - SHOPLINE Custom Code, all pages, bottom. */
(function (window, document) {
  "use strict";

  if (window.__blkSignalPublisherV1) return;
  window.__blkSignalPublisherV1 = true;

  var started = false;

  function cleanText(value, maxLength) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function deviceCategory() {
    var width = window.innerWidth || 0;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
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

  function isPaginationControl(element) {
    if (element.closest(".pagination, .pagination-wrapper, [data-pagination], nav[aria-label*='pagination' i]")) return true;
    var link = element.closest("a[href]");
    if (!link) return false;
    try {
      var url = new URL(link.getAttribute("href"), window.location.href);
      return url.pathname === window.location.pathname && url.searchParams.has("page");
    } catch (_error) {
      return false;
    }
  }

  function pageSection(element) {
    if (isPaginationControl(element)) return "pagination";
    if (element.closest("header")) return "header";
    if (element.closest("nav, [role='navigation']")) return "navigation";
    if (element.closest("footer")) return "footer";
    if (element.closest("aside")) return "aside";
    if (element.closest("form")) return "form";
    if (element.closest("main")) return "main";
    return "other";
  }

  function targetType(element) {
    if (element.closest("a")) return "link";
    if (element.closest("button")) return "button";
    if (element.closest("summary, [aria-expanded]")) return "toggle";
    if (element.closest("[role='button']")) return "role_button";
    return "other";
  }

  function elementLabel(element) {
    var source = element.closest("[data-track-label]");
    var label = source && source.getAttribute("data-track-label");
    if (!label) label = element.getAttribute("aria-label") || element.getAttribute("title");
    if (!label) {
      var product = element.closest("[data-product-card], [data-product-id], .product-card, .product-item");
      var title = product && product.querySelector("[data-product-title], .product-title, .product-card__title, h2, h3");
      if (title) label = title.textContent;
    }
    if (!label) label = element.textContent;
    if (!label) {
      var image = element.querySelector("img[alt]");
      if (image) label = image.getAttribute("alt");
    }
    return cleanText(label, 120);
  }

  function elementKey(element) {
    var explicit = element.closest("[data-track-id]");
    var explicitValue = explicit && explicit.getAttribute("data-track-id");
    if (explicitValue) return cleanText(explicitValue, 300);
    if (element.id) return cleanText(element.id, 300);
    var named = element.getAttribute("name");
    if (named) return cleanText(named, 300);
    var path = destinationPath(element);
    var label = elementLabel(element).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
    return cleanText(targetType(element) + ":" + (path || label || "unnamed"), 300);
  }

  function heatmapCell(event) {
    var width = Math.max(window.innerWidth || 0, 1);
    var height = Math.max(document.documentElement.scrollHeight || window.innerHeight || 0, 1);
    var x = Math.min(9, Math.max(0, Math.floor(Number(event.clientX || 0) / width * 10)));
    var pageY = Number(event.pageY || (event.clientY || 0) + (window.scrollY || 0));
    var y = Math.min(9, Math.max(0, Math.floor(pageY / height * 10)));
    return "x" + x + "_y" + y;
  }

  function publish(name, data) {
    var attempts = 0;
    function attempt() {
      if (window.Shopline && window.Shopline.analytics && typeof window.Shopline.analytics.publish === "function") {
        window.Shopline.analytics.publish(name, data);
        return;
      }
      attempts += 1;
      if (attempts < 40) window.setTimeout(attempt, 250);
    }
    attempt();
  }

  function handleClick(event) {
    var target = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
    if (!target || !target.closest) return;
    if (target.closest("[data-track-ignore], input, textarea, select, option, video, audio, script, style")) return;
    var actionable = target.closest("a, button, summary, [role='button'], [aria-expanded], [data-track-id], [onclick]");
    if (!actionable) return;

    var params = {
      page_path: window.location.pathname || "/",
      element_key: elementKey(actionable),
      element_label: elementLabel(actionable),
      page_section: pageSection(actionable),
      destination_path: destinationPath(actionable),
      click_target: targetType(actionable),
      device_category: deviceCategory(),
      heatmap_cell: heatmapCell(event),
      element_group: targetType(actionable)
    };
    publish("blk_signal_click", params);
  }

  function startTracking() {
    if (started) return;
    started = true;
    document.addEventListener("click", handleClick, { capture: true, passive: true });
  }

  function canTrack() {
    return !window.Shopline || !window.Shopline.customerPrivacy || window.Shopline.customerPrivacy.userCanBeTracked();
  }

  function initializePrivacy() {
    document.addEventListener("trackingConsentAccepted", startTracking);
    if (!window.Shopline || typeof window.Shopline.loadFeatures !== "function") {
      if (canTrack()) startTracking();
      return;
    }
    window.Shopline.loadFeatures([{ name: "consent-tracking-api", version: "0.1" }], function () {
      if (canTrack()) startTracking();
    });
  }

  initializePrivacy();
})(window, document);
