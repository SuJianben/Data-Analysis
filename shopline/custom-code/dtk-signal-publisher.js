/* DTK Signal Publisher manual-install fallback.
 * Preferred installation: SHOPLINE Script Tag API loads the canonical asset directly.
 */
(function (window, document) {
  "use strict";

  if (window.__dtkSignalPublisherLoaderV1 || window.__dtkSignalPublisherV1) return;
  window.__dtkSignalPublisherLoaderV1 = true;

  var script = document.createElement("script");
  script.src = "https://multi-site-analytics.vercel.app/integrations/shopline/dtk-signal-publisher.js";
  script.async = true;
  script.setAttribute("data-dtk-signal-publisher", "v1");
  document.head.appendChild(script);
})(window, document);
