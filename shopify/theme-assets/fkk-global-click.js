/* FKK Signal actionable click collector. */
(function () {
  "use strict";

  if (window.__fkkGlobalClickCollectorV1) return;
  window.__fkkGlobalClickCollectorV1 = true;

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
        var title = productCard.querySelector("[data-track-label], [data-product-title], .card__heading a, .card__heading, .product-title, .product-card__title, .card-information__text");
        if (title) label = title.getAttribute("data-track-label") || title.innerText || title.textContent;
      }
    }
    if (!label && element.innerText) label = element.innerText;
    if (!label) {
      var image = element.querySelector("img[alt]");
      if (image) label = image.getAttribute("alt");
    }
    return cleanLabel(label);
  }

  function sendGa4(eventName, params) {
    var started = Date.now();
    function attempt() {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, params);
        return;
      }
      if (window.dataLayer && typeof window.dataLayer.push === "function") {
        window.dataLayer.push(Object.assign({ event: eventName }, params));
        return;
      }
      if (Date.now() - started < 10000) window.setTimeout(attempt, 150);
    }
    attempt();
  }

  function send(params) {
    if (window.FKKSignalIdentity && typeof window.FKKSignalIdentity.track === "function") {
      window.FKKSignalIdentity.track("global_click", params);
    }
    sendGa4("global_click", params);
    if (params.page_section === "navigation" || params.page_section === "header") {
      sendGa4("header_navigation_click", {
        menu_name: params.element_label || "(unnamed menu)",
        menu_key: params.element_key,
        parent_menu_name: "",
        menu_level: "1",
        menu_action: params.click_target === "toggle" ? "toggle" : "navigate",
        navigation_location: params.page_section,
        click_target: params.destination_path,
        device_category: params.device_category
      });
    }
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
