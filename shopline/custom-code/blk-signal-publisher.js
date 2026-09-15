/* BLK Signal Publisher manual-install fallback.
 * Preferred installation: SHOPLINE Script Tag API loads the canonical asset directly.
 */
(function (window, document) {
  "use strict";

  if (window.__blkSignalPublisherLoaderV1 || window.__blkSignalPublisherV1) return;
  window.__blkSignalPublisherLoaderV1 = true;

  var script = document.createElement("script");
  script.src = "https://tkf-signal.vercel.app/integrations/shopline/blk-signal-publisher.js";
  script.async = true;
  script.setAttribute("data-blk-signal-publisher", "v1");
  document.head.appendChild(script);
})(window, document);
