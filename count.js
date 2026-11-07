// Visit counter: one anonymous ping per page view to the shop backend (date, page, where from, phone or computer).
// No cookies and nothing personal. Daily totals: the "Daily" tab of the orders Google Sheet.
(function () {
  try {
    var page = document.currentScript.getAttribute("data-page") || "page";
    var q = new URLSearchParams(location.search);
    var from = q.get("utm_source") || q.get("from") || (document.referrer ? new URL(document.referrer).hostname : "");
    var phone = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "1" : "0";
    fetch(window.SHOP.api + "?action=hit&p=" + encodeURIComponent(page) + "&r=" + encodeURIComponent(from) + "&m=" + phone, { mode: "no-cors" });
  } catch (e) {}
})();
