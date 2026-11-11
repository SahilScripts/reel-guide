// "Didn't get your guide?" box: the buyer enters the email they paid with; the backend re-checks their order with Razorpay
// and emails the guide again. Put <div id="resend"></div> where the box should appear, then load this after config.js.
(function () {
  var box = document.getElementById("resend");
  if (!box || !window.SHOP) return;
  box.innerHTML =
    '<div class="card" style="margin-top:22px">' +
    '<h2 style="margin-bottom:6px">Paid but didn\'t get your guide?</h2>' +
    '<p class="note" style="text-align:left;margin:0 0 6px">First check Spam and Promotions for "Your guide". Not there? Enter the email you paid with and we\'ll send it again.</p>' +
    '<label for="rs-email">Email you paid with</label><input id="rs-email" type="email" autocomplete="email" placeholder="you@gmail.com">' +
    '<button class="btn alt" id="rs-btn" type="button">Send my guide again</button>' +
    '<p class="note" id="rs-msg" aria-live="polite"></p></div>';
  var btn = document.getElementById("rs-btn"), msg = document.getElementById("rs-msg"), input = document.getElementById("rs-email");
  btn.onclick = function () {
    var email = (input.value || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Please enter the email you used when paying."; return; }
    btn.disabled = true; btn.textContent = "Checking your order…"; msg.textContent = "";
    fetch(window.SHOP.api, { method: "POST", body: JSON.stringify({ action: "resend", email: email }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { msg.textContent = d.error ? d.error : d.message; })
      .catch(function () { msg.textContent = "Couldn't reach us just now. Please try again, or DM us on Instagram @mahabharat.retold."; })
      .then(function () { btn.disabled = false; btn.textContent = "Send my guide again"; });
  };
  var em = new URLSearchParams(location.search).get("email");
  if (em) input.value = em;
})();
