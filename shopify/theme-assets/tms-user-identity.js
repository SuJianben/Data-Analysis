/* TMS Signal consent-aware pseudonymous identity transport. */
(function (window, document) {
  "use strict";

  if (window.__tmsSignalUserIdentityV1) return;
  window.__tmsSignalUserIdentityV1 = true;

  var VISITOR_STORAGE_KEY = "tms_signal_visitor_id";
  var SESSION_STORAGE_KEY = "tms_signal_session_id";
  var config = Object.assign({ source: "shopify:tms", siteKey: "tms" }, window.TMS_SIGNAL_IDENTITY_CONFIG || {});
  var analyticsAllowed = false;

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return prefix + "_" + window.crypto.randomUUID();
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

  function updatePermission() {
    var privacy = window.Shopify && window.Shopify.customerPrivacy;
    analyticsAllowed = Boolean(privacy && typeof privacy.analyticsProcessingAllowed === "function" && privacy.analyticsProcessingAllowed());
  }

  function loadPrivacyApi() {
    document.addEventListener("visitorConsentCollected", updatePermission);
    document.addEventListener("trackingConsentAccepted", updatePermission);
    if (window.Shopify && window.Shopify.customerPrivacy) {
      updatePermission();
      return;
    }
    if (!window.Shopify || typeof window.Shopify.loadFeatures !== "function") return;
    window.Shopify.loadFeatures([{ name: "consent-tracking-api", version: "0.1" }], function (error) {
      if (!error) updatePermission();
    });
  }

  function safeText(value, maxLength) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function normalizedEvent(eventName, data) {
    var event = {
      eventId: createId("evt"),
      visitorId: getOrCreate(window.localStorage, VISITOR_STORAGE_KEY, "visitor"),
      sessionId: getOrCreate(window.sessionStorage, SESSION_STORAGE_KEY, "session"),
      eventName: safeText(eventName, 120),
      occurredAt: new Date().toISOString(),
      pagePath: safeText(data.page_path || window.location.pathname || "/", 2000),
      elementKey: safeText(data.element_key, 300),
      elementLabel: safeText(data.element_label, 500),
      pageSection: safeText(data.page_section, 200),
      destinationPath: safeText(data.destination_path, 2000),
      clickTarget: safeText(data.click_target, 120),
      deviceCategory: safeText(data.device_category, 40) || "unknown"
    };
    var customerIdHash = safeText(config.customerIdHash || data.customer_id_hash, 200);
    if (customerIdHash) event.customerIdHash = customerIdHash;
    return event;
  }

  function send(event) {
    if (!analyticsAllowed || !config.endpoint) return;
    var body = JSON.stringify({ siteKey: config.siteKey, source: config.source, event: event });
    if (window.navigator.sendBeacon) {
      try {
        if (window.navigator.sendBeacon(config.endpoint, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return;
      } catch (_error) {}
    }
    window.fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: body,
      keepalive: true,
      credentials: "omit"
    }).catch(function () {});
  }

  function track(eventName, data) {
    if (!analyticsAllowed || !config.endpoint) return;
    send(normalizedEvent(eventName, data || {}));
  }

  loadPrivacyApi();
  window.TMSSignalIdentity = { track: track, refreshConsent: updatePermission };
})(window, document);
