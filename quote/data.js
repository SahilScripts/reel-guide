/* One price list for every design of the quote. Edit numbers here only; all pages read this file.
   Rupees, before GST. Per-reel rates: single reel / in a 15-day plan / in a 30-day plan. */
window.QUOTE = {
  no: "SS-2611-01",
  date: "10 Nov 2026",
  valid: "30 Nov 2026",
  handles: ["@wisereveryday_", "@mahabharat.retold"],
  contact: { label: "@mahabharat.retold", url: "https://www.instagram.com/mahabharat.retold/" },

  formats: [
    {
      key: "story", name: "Illustrated Story Reel", short: "Story reel",
      example: "@wisereveryday_", exampleTitle: "कुंभकर्ण ने मौत क्यों चुनी?",
      lang: "Hindi", length: "45–65 s", fps: "30 fps", turnaround: "24 hours",
      proof: "8.6M views and 11,200 followers in 4 weeks on @wisereveryday_",
      what: "A Hindi story with a twist, told in AI-painted scenes where every character looks the same from frame to frame.",
      includes: ["Story and Hindi script with a hook in the first 2 seconds", "12–20 painted scenes, same characters throughout", "Voice-over, music and sound effects", "Title card, caption and hashtags"],
      rate: { single: 800, d15: 600, d30: 550 }
    },
    {
      key: "myth", name: "Mythology Motion Reel", short: "Motion reel",
      example: "@mahabharat.retold", exampleTitle: "सोने की लंका रावण की थी ही नहीं",
      lang: "Hindi", length: "80–100 s", fps: "30 fps", turnaround: "2 days",
      proof: "1.4M plays on our ‘Asur vs Rakshas’ reel",
      what: "Flat-art Mahabharat and Ramayana characters that walk, talk and fight, on animated sets, with a story checked against the source text.",
      includes: ["Story picked from Valmiki, Vyasa and the Puranas", "20–25 animated shots with rigged characters", "Deep Hindi narration, score and sound effects", "Caption, hashtags and end card"],
      rate: { single: 1000, d15: 800, d30: 700 }
    },
    {
      key: "paper", name: "Paper Diorama Story", short: "Paper diorama",
      example: "@mahabharat.retold", exampleTitle: "Untold Ramayan 01: Ram and the dog",
      lang: "Hindi + English headlines", length: "100–130 s", fps: "30 fps", turnaround: "2–3 days",
      proof: "Handmade look, documentary depth: the format that gets saved and shared",
      what: "Painted cut-out characters on paper sets, with headlines that build word by word, maps, stamps and torn notes. Feels handmade, explains like a documentary.",
      includes: ["Little-known story, every fact source-checked", "Painted characters and sets in Indian art styles", "Headlines, maps, counters and stamps animated in", "Narration, music, paper sound design, caption"],
      rate: { single: 1250, d15: 1000, d30: 900 }
    },
    {
      key: "sci", name: "3D Science Explainer", short: "3D explainer",
      example: "New format", exampleTitle: "Rabies: the clock starts at the bite",
      lang: "Hindi or English", length: "90–100 s", fps: "60 fps", turnaround: "3 days",
      proof: "More motion on screen than the top science explainer pages we measured",
      what: "Cinematic 3D: the camera follows the virus up a nerve, antibodies swarm, the globe lights up. Every shot is a moving AI video clip, finished at 60 fps.",
      includes: ["Medically checked script with real numbers", "20–25 moving 3D clips, no still pictures", "Data graphics, labels and pencil call-outs", "Narration, sound design, 60 fps master"],
      rate: { single: 1900, d15: 1500, d30: 1350 },
      maxPerDay: 1
    }
  ],

  plans: [
    { key: "single", name: "Single reel", days: 0, perDay: 0, note: "Try one of any format. Full price, 50% upfront." },
    { key: "d15", name: "15-day plan", days: 15, perDay: 2, off: "about 20% off", note: "2 reels a day for 15 days: 30 reels." },
    { key: "d30", name: "30-day plan", days: 30, perDay: 2, off: "about 30% off", note: "2 reels a day for 30 days: 60 reels." }
  ],
  planIncludes: [
    "Posted for you at 2 fixed times a day (we suggest 7 AM and 6 PM)",
    "Content calendar agreed a week ahead",
    "Captions, hashtags and auto-DM keyword on every reel",
    "Weekly report: views, saves, follows, what to make more of",
    "30-day plan adds a live growth dashboard and a review call"
  ],
  planRule: "3D explainers take one of the two daily slots at most. Pair them with any other format for the second slot.",

  training: {
    name: "15-Day AI Studio Training",
    lead: "From zero to running your own AI studio. 15 days, one live session a day, no AI or coding experience needed. You'll learn APIs, MCP servers, connectors, GitHub and browser automation, build your own motion graphics skills, and leave with a channel that makes, posts and reports on its own.",
    tiers: [
      { key: "t1", name: "Solo", price: 49999, unit: "15 days · 1 live session a day · 1 person", for: "A creator who wants the whole system running on their own accounts.", points: ["Every automation set up on your own laptop and accounts", "Recordings of all 15 sessions", "30 days of WhatsApp support after day 15"], best: true },
      { key: "t2", name: "Team", price: 89999, unit: "15 days · 1 live session a day · up to 5 people", for: "A brand that wants an in-house team running the system.", points: ["Everything in Solo, for up to 5 people", "2 templates built in your brand's look and voice", "45 days of WhatsApp support after day 15"] }
    ],
    modules: [
      { n: "Day 1", title: "AI from zero", body: "How AI models think, prompts vs agents, tokens and context windows, and what an AI agent can do on your own computer." },
      { n: "Day 2", title: "Set up your AI studio", body: "Install the studio, terminal basics, projects and folders, and safe permissions so the agent can run commands for you." },
      { n: "Day 3", title: "GitHub from zero", body: "What a repo is; clone, commit, push, branches and pull requests; free website hosting with GitHub Pages." },
      { n: "Day 4", title: "APIs and keys", body: "What an API is, getting and protecting API keys, calling voice, image and video APIs, and keeping costs and rate limits in check." },
      { n: "Day 5", title: "MCP servers and connectors", body: "What MCP is, plugging Drive, Gmail, YouTube and Instagram tools into your studio, and writing a small MCP server of your own." },
      { n: "Day 6", title: "Browser automation", body: "Connect your own Chrome to the AI studio so it uses websites for you: logged-in sessions, making pictures and clips, downloads and uploads." },
      { n: "Day 7", title: "Your skills library", body: "What skills are, installing a ready library (reels, captions, research, carousels, editing), and chaining skills into one workflow." },
      { n: "Day 8", title: "Motion graphics skills", body: "Build your own motion graphics skill from a reference reel, clone and adapt open-source skills from GitHub, code animation with React and Remotion, and 3D scenes." },
      { n: "Day 9", title: "Voice-over and sound", body: "AI voices and voice cloning, fixing Hindi pronunciation, timing words to picture, music, sound effects and Instagram loudness." },
      { n: "Day 10", title: "Pictures and moving clips", body: "Consistent characters across scenes, AI image and video generation, smoothing to 60 fps, and rendering the final reel." },
      { n: "Day 11", title: "Auto-posting, auto-DM and replies", body: "A posting queue at fixed times with captions and hashtags, a DM sent on a comment keyword, and reply drafts for every comment." },
      { n: "Day 12", title: "Read your data and live dashboard", body: "Pull your insights through the API, find the reels that beat your average and why, and a dashboard that updates itself." },
      { n: "Day 13", title: "A channel that runs itself", body: "Scheduled tasks and background jobs: new reels are made, checked, posted and reported every day without you starting anything." },
      { n: "Day 14", title: "Your brand's templates and memory", body: "Save your look and voice as skills, give the agent a memory of your rules, and set it up for a team." },
      { n: "Day 15", title: "Hand-over", body: "You run the whole studio alone while we watch, fix what's left and plan your next month." }
    ]
  },

  web: {
    name: "Website Experience",
    lead: "We don't hand over a template with your logo on it. We build a place people remember: it moves, tells your story as they scroll, and turns visitors into followers and buyers.",
    promises: ["Story told as you scroll, with motion and 3D", "Art made for your brand, in the style of your reels", "Hindi and English", "Opens in under 2 seconds on a phone", "Booking, payments and lead capture built in", "Analytics you can read"],
    tiers: [
      { key: "w1", name: "Reimagine", price: 50000, time: "3 weeks", body: "We take your current site to another level: a full audit, then your home page and 4 key pages redesigned with motion, new art and faster loading." },
      { key: "w2", name: "Signature Experience", price: 100000, time: "5–6 weeks", body: "A new site built from scratch around one big idea: a scroll story with 3D scenes, your reels woven in, a CMS your team can edit, payments and bilingual content.", best: true }
    ],
    care: { name: "Care plan", price: 3000, unit: "per month", body: "Updates, new pages, speed and security checks." }
  },

  app: {
    name: "App Experience",
    lead: "Not another app that gets deleted after a week. Every screen is designed like a scene: it reacts, it animates, and it gives people a reason to open it every day.",
    promises: ["iPhone and Android from one build", "Custom motion on every screen", "Daily stories, streaks and notifications that people want", "Your reels and content inside the app", "Payments and subscriptions"],
    tiers: [
      { key: "a1", name: "App Experience", price: 200000, time: "8–10 weeks", body: "A complete app for iPhone and Android: up to 12 screens, sign-in, your content library, push notifications and in-app payments." },
      { key: "a2", name: "Signature App", price: 350000, time: "12–14 weeks", body: "Everything in App Experience plus AI features: personalised daily stories, voice narration, a smart feed, and an admin dashboard for your team.", best: true }
    ],
    care: { name: "Care plan", price: 3000, unit: "per month", body: "App store updates, fixes, new features each month." }
  },

  terms: [
    "Prices are in Indian rupees and don't include GST.",
    "Reel plans: 50% before day 1, 50% on day 15 (30-day plan) or on delivery (15-day plan).",
    "Training: paid in full when the session is booked.",
    "Website and app: 40% to start, 30% at design sign-off, 30% at launch.",
    "Every reel gets one round of changes. Extra rounds are free if we missed the brief.",
    "You own every reel, website and app we make for you."
  ]
};

/* Shared helpers */
window.QUOTE.inr = function (n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
};
window.QUOTE.fmt = function (key) {
  return window.QUOTE.formats.find(function (f) { return f.key === key; });
};
/* Total for a plan: slotA and slotB are format keys (each slot = 1 reel a day). */
window.QUOTE.planTotal = function (planKey, slotA, slotB) {
  var Q = window.QUOTE, plan = Q.plans.find(function (p) { return p.key === planKey; });
  if (plan.key === "single") {
    var f = Q.fmt(slotA);
    return { reels: 1, total: f.rate.single, lines: [{ f: f, count: 1, rate: f.rate.single }] };
  }
  var lines = [], counts = {};
  [slotA, slotB].forEach(function (k) { counts[k] = (counts[k] || 0) + plan.days; });
  Object.keys(counts).forEach(function (k) {
    var f = Q.fmt(k);
    lines.push({ f: f, count: counts[k], rate: f.rate[plan.key] });
  });
  var total = lines.reduce(function (s, l) { return s + l.count * l.rate; }, 0);
  var full = lines.reduce(function (s, l) { return s + l.count * l.f.rate.single; }, 0);
  return { reels: plan.days * 2, total: total, full: full, save: full - total, lines: lines };
};
/* A plain-text summary of a choice, for the "copy my choice" buttons */
window.QUOTE.summary = function (planKey, slotA, slotB, extras) {
  var Q = window.QUOTE, r = Q.planTotal(planKey, slotA, slotB);
  var plan = Q.plans.find(function (p) { return p.key === planKey; });
  var out = ["Quote " + Q.no + ": " + plan.name];
  r.lines.forEach(function (l) { out.push("  " + l.count + " × " + l.f.name + " @ " + Q.inr(l.rate) + " = " + Q.inr(l.count * l.rate)); });
  out.push("  Reels total: " + Q.inr(r.total) + " + GST");
  (extras || []).forEach(function (e) { out.push("  " + e); });
  return out.join("\n");
};

/* The client's picks across the page. Each design calls these. */
window.QUOTE.state = { plan: "d30", a: "story", b: "myth", training: null, web: null, app: null, webCare: false, appCare: false, reels: true };
window.QUOTE.tier = function (group, key) {
  var g = window.QUOTE[group];
  return g && g.tiers.find(function (t) { return t.key === key; });
};
window.QUOTE.basket = function () {
  var Q = window.QUOTE, s = Q.state, lines = [];
  if (s.reels) {
    var plan = Q.plans.find(function (p) { return p.key === s.plan; });
    var r = Q.planTotal(s.plan, s.a, s.b);
    var label = plan.key === "single" ? "1 × " + Q.fmt(s.a).name
      : plan.name + ": " + r.lines.map(function (l) { return l.count + " " + l.f.short + (l.count > 1 ? "s" : ""); }).join(" + ");
    lines.push({ label: label, amount: r.total, once: true });
  }
  if (s.training) { var t = Q.tier("training", s.training); lines.push({ label: "Training: " + t.name, amount: t.price, once: true }); }
  if (s.web) { var w = Q.tier("web", s.web); lines.push({ label: "Website: " + w.name, amount: w.price, once: true }); }
  if (s.webCare && s.web) lines.push({ label: "Website care plan", amount: Q.web.care.price, monthly: true });
  if (s.app) { var a = Q.tier("app", s.app); lines.push({ label: "App: " + a.name, amount: a.price, once: true }); }
  if (s.appCare && s.app) lines.push({ label: "App care plan", amount: Q.app.care.price, monthly: true });
  var once = lines.filter(function (l) { return !l.monthly; }).reduce(function (x, l) { return x + l.amount; }, 0);
  var monthly = lines.filter(function (l) { return l.monthly; }).reduce(function (x, l) { return x + l.amount; }, 0);
  return { lines: lines, once: once, monthly: monthly };
};
window.QUOTE.basketText = function () {
  var Q = window.QUOTE, b = Q.basket();
  var out = ["Hi! I'd like to go ahead with quote " + Q.no + ":"];
  b.lines.forEach(function (l) { out.push("• " + l.label + ": " + Q.inr(l.amount) + (l.monthly ? " a month" : "")); });
  out.push("Total: " + Q.inr(b.once) + (b.monthly ? " + " + Q.inr(b.monthly) + " a month" : "") + " (+ GST)");
  return out.join("\n");
};
/* 3D explainers fill one daily slot at most */
window.QUOTE.fixSlots = function () {
  var s = window.QUOTE.state;
  if (s.plan !== "single" && s.a === "sci" && s.b === "sci") s.b = "story";
};
/* Copy text from inside a click handler; falls back to selecting a textarea */
window.QUOTE.copy = function (text, fallbackEl, done) {
  function fallback() { if (fallbackEl) { fallbackEl.hidden = false; fallbackEl.value = text; fallbackEl.select(); } done(false); }
  try { navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); } catch (e) { fallback(); }
};
/* Reel players: <video data-reel="story"> starts as a silent loop; a [data-sound="story"] button plays the full reel with sound */
window.QUOTE.wireVideos = function (base) {
  base = base || "media/";
  document.querySelectorAll("[data-sound]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var k = btn.getAttribute("data-sound");
      document.querySelectorAll("video[data-reel]").forEach(function (v) {
        if (v.getAttribute("data-reel") !== k && v.dataset.full === "1") { v.pause(); }
      });
      var v = document.querySelector('video[data-reel="' + k + '"]');
      if (!v) return;
      if (v.dataset.full !== "1") { v.dataset.full = "1"; v.src = base + k + "-full.mp4"; v.loop = false; v.controls = true; }
      v.muted = false; var p = v.play(); if (p && p.catch) p.catch(function () {});
      btn.setAttribute("aria-pressed", "true");
    });
  });
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("video[data-reel]").forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
  }
};
