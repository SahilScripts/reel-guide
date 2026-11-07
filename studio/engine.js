/**
 * Paper Studio engine: draws a "paper diorama" story reel on a canvas (1080x1920, 30 fps) from a story code, the
 * pictures and the voice-over. Painted cut-out characters on painted sets, a folded-paper texture, a dossier header,
 * two-tone headlines that build word by word, label chips, torn-paper notes, rubber stamps, a counter card, slow
 * cameras and story-led transitions. Plain canvas 2D only (works the same on phones and computers).
 *
 * Cues: a cue is a sentence number of the script. 3 = the start of sentence 3, 3.5 = halfway through it, 3.9 = near
 * its end. The sentence times come from the voice-over itself (alignSentences), so nothing needs typing in seconds.
 */
export const W = 1080;
export const H = 1920;
export const FPS = 30;

const RED = "#ff4a3d";
const GOLD = "#ffc83a";
const GREEN = "#7fe39a";
const CREAM = "#f1e8d4";
const INK = "#1c1813";
const TONES = { red: RED, gold: GOLD, yellow: GOLD, green: GREEN, white: "#ffffff", cream: CREAM };
const STAMP = { red: "#d42a2a", green: "#23804a", gold: "#b07a12", blue: "#1f5aa8", black: "#1c1813" };
const ANTON = '"Anton", Impact, "Arial Narrow", sans-serif';
const MONO = '"Space Mono", ui-monospace, Menlo, monospace';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lin = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a)));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
const mix = (a, b, k) => a + (b - a) * k;
const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && isFinite(+v) ? +v : d);
const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
const arr = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]);
export const slug = (s) => str(s).toLowerCase().replace(/\.(png|jpe?g|webp|heic|gif)$/i, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** load the two fonts before drawing anything (the page links them from Google Fonts) */
export async function loadFonts() {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load('100px "Anton"'),
    document.fonts.load('700 30px "Space Mono"'),
    document.fonts.load('400 30px "Space Mono"'),
  ]).catch(() => {});
}

// ------------------------------------------------------------------------------------------------ story code

/** read the story code (JSON, as Gemini or Claude writes it) into a checked story; throws a plain-language error */
export function parseStory(raw) {
  let text = String(raw || "").trim();
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1];
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("No story code found. Copy the whole code block, from the first { to the last }.");
  text = text.slice(a, b + 1);
  let data = null;
  const tries = [text, text.replace(/,\s*([}\]])/g, "$1"), text.replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")];
  let err = null;
  for (const t of tries) {
    try {
      data = JSON.parse(t);
      break;
    } catch (e) {
      err = err || e;
    }
  }
  if (!data) {
    const m = String(err && err.message).match(/position (\d+)/);
    let where = "";
    if (m) {
      const pos = +m[1];
      const line = text.slice(0, pos).split("\n").length;
      where = ` (near line ${line}: "${text.slice(Math.max(0, pos - 30), pos + 20).replace(/\s+/g, " ")}")`;
    }
    throw new Error("The story code has a typing mistake" + where + ". Ask the AI: \"The studio says the code has a mistake, please send the full code again.\"");
  }
  return normaliseStory(data);
}

function splitScript(s) {
  return str(s).split(/(?<=[।?!.])\s+/).map((x) => x.trim()).filter(Boolean);
}

function normaliseStory(d) {
  const warnings = [];
  const story = {
    title: str(d.title) || "paper reel",
    series: str(d.series || d.chip),
    follow: d.follow !== false,
    followAt: d.follow_at,
    text: d.text !== false,
    sentences: [],
    pictures: [],
    scenes: [],
    warnings,
  };
  story.sentences = (Array.isArray(d.sentences) ? d.sentences : splitScript(d.script)).map(str).filter(Boolean);
  if (!story.sentences.length) throw new Error('The story code has no "sentences" (the script, one sentence per line).');
  const N = story.sentences.length;
  const pics = new Map();
  for (const p of arr(d.pictures)) {
    const id = slug(p && (p.id || p.name));
    if (!id || pics.has(id)) continue;
    const type = /set|background|place|scene|backdrop/i.test(str(p.type)) ? "set" : "character";
    pics.set(id, { id, type, what: str(p.what || p.label || p.description), prompt: str(p.prompt) });
  }
  const need = (id, type) => {
    const k = slug(id);
    if (!k) return "";
    if (!pics.has(k)) {
      pics.set(k, { id: k, type, what: "", prompt: "" });
      warnings.push(`Picture "${k}" is used but not listed; added it.`);
    }
    return k;
  };
  let prevTo = 0;
  const scenes = arr(d.scenes);
  scenes.forEach((s, i) => {
    if (!s || typeof s !== "object") return;
    let from = Math.round(num(s.from, prevTo + 1));
    let to = Math.round(num(s.to, from));
    if (i === 0) from = 1;
    if (from <= prevTo) from = prevTo + 1;
    if (from > N) {
      warnings.push(`Scene ${i + 1} starts after the last sentence; left out.`);
      return;
    }
    if (to < from) to = from;
    if (to > N) to = N;
    if (from > prevTo + 1 && story.scenes.length) {
      story.scenes[story.scenes.length - 1].to = from - 1; // close a gap: the previous scene stays on
    }
    prevTo = to;
    const sc = {
      n: story.scenes.length + 1,
      from, to,
      place: str(s.place || s.label),
      set: need(s.set || s.background, "set"),
      look: str(s.look || s.tone || "normal").toLowerCase(),
      camera: str(s.camera || "push").toLowerCase(),
      transition: str(s.transition || (i === 0 ? "cut" : "fade")).toLowerCase(),
      irisAt: Array.isArray(s.iris_at) ? s.iris_at : null,
      shade: num(s.shade, 0.55),
      effects: arr(s.effects).map((e) => str(e).toLowerCase()),
      characters: arr(s.characters).filter((c) => c && (c.id || c.name)).map((c) => ({ ...c, id: need(c.id || c.name, "character") })),
      headlines: arr(s.headlines || s.headline).map((h) => (typeof h === "string" ? { white: h } : h)).filter(Boolean),
      notes: arr(s.notes || s.note).map((x) => (typeof x === "string" ? { text: x } : x)).filter(Boolean),
      stamps: arr(s.stamps || s.stamp).map((x) => (typeof x === "string" ? { text: x } : x)).filter(Boolean),
      counter: s.counter && typeof s.counter === "object" ? s.counter : null,
    };
    if (!sc.set) warnings.push(`Scene ${sc.n} has no set picture; it will use the previous one.`);
    story.scenes.push(sc);
  });
  if (!story.scenes.length) throw new Error('The story code has no "scenes".');
  const last = story.scenes[story.scenes.length - 1];
  if (last.to < N) {
    warnings.push(`The scenes end at sentence ${last.to} of ${N}; the last scene now runs to the end.`);
    last.to = N;
  }
  for (let i = 0; i < story.scenes.length; i++) if (!story.scenes[i].set && i > 0) story.scenes[i].set = story.scenes[i - 1].set;
  story.pictures = [...pics.values()];
  return story;
}

// ------------------------------------------------------------------------------------------------ timing from the voice

/** find where each sentence starts and ends in the voice-over, from the pauses between sentences */
export function alignSentences(buffer, sentences) {
  const sr = buffer.sampleRate;
  const hop = Math.round(sr * 0.01);
  const win = hop * 2;
  const chans = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
  const len = buffer.length;
  const nF = Math.max(1, Math.floor((len - win) / hop));
  const db = new Float32Array(nF);
  for (let f = 0; f < nF; f++) {
    let s = 0;
    const o = f * hop;
    for (let i = 0; i < win; i += 2) {
      let v = 0;
      for (const ch of chans) v += ch[o + i];
      v /= chans.length;
      s += v * v;
    }
    db[f] = 10 * Math.log10(s / (win / 2) + 1e-12);
  }
  const sorted = Array.from(db).sort((x, y) => x - y);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const floor = pct(0.1);
  const peak = pct(0.95);
  const thr = Math.max(floor + 10, peak - 40);
  const voiced = new Uint8Array(nF);
  for (let f = 0; f < nF; f++) voiced[f] = db[f] > thr ? 1 : 0;
  // fill tiny silences inside words (< 60 ms) and drop tiny blips (< 40 ms)
  const runs = (val, maxLen, set) => {
    let f = 0;
    while (f < nF) {
      if (voiced[f] !== val) { f++; continue; }
      let g = f;
      while (g < nF && voiced[g] === val) g++;
      if (g - f < maxLen && f > 0 && g < nF) for (let k = f; k < g; k++) voiced[k] = set;
      f = g;
    }
  };
  runs(0, 6, 1);
  runs(1, 4, 0);
  let first = 0;
  while (first < nF && !voiced[first]) first++;
  let lastF = nF - 1;
  while (lastF > 0 && !voiced[lastF]) lastF--;
  const t0 = first * 0.01;
  const t1 = Math.min(buffer.duration, (lastF + 2) * 0.01);
  const gaps = [];
  let f = first;
  while (f <= lastF) {
    if (voiced[f]) { f++; continue; }
    let g = f;
    while (g <= lastF && !voiced[g]) g++;
    if ((g - f) * 0.01 >= 0.1) gaps.push({ a: f * 0.01 + 0.01, b: g * 0.01, len: (g - f) * 0.01 });
    f = g;
  }
  const N = sentences.length;
  const weight = sentences.map((s) => Math.max(1, str(s).replace(/[\s.,!?।"'“”‘’()\-–—:;…]/g, "").length));
  const even = () => {
    const total = weight.reduce((x, y) => x + y, 0);
    let acc = 0;
    return weight.map((w) => {
      const a = t0 + ((t1 - t0) * acc) / total;
      acc += w;
      return { start: a, end: t0 + ((t1 - t0) * acc) / total };
    });
  };
  if (N === 1) return { times: [{ start: t0, end: t1 }], method: "single", t0, t1 };
  if (gaps.length < N - 1) return { times: even(), method: "even", t0, t1 };
  const G = gaps.length;
  const totalW = weight.reduce((x, y) => x + y, 0);
  const longest = gaps.map((g) => g.len).sort((x, y) => y - x).slice(0, N - 1).reduce((x, y) => x + y, 0);
  let rate = totalW / Math.max(1, t1 - t0 - longest);
  let best = null;
  for (let pass = 0; pass < 3; pass++) {
    const seg = (i, a, b) => {
      const d = Math.max(0.05, b - a);
      const r = Math.log((d * rate) / weight[i]);
      return r * r * 4;
    };
    const reward = (g) => -1.2 * Math.log(Math.max(0.1, g.len) / 0.1);
    // D[k][j]: best cost with boundary k (between sentence k-1 and k, k = 1..N-1) at gap j
    const D = [];
    const P = [];
    for (let k = 1; k < N; k++) {
      const row = new Float64Array(G).fill(Infinity);
      const prow = new Int32Array(G).fill(-1);
      for (let j = k - 1; j < G - (N - 1 - k); j++) {
        if (k === 1) {
          row[j] = seg(0, t0, gaps[j].a) + reward(gaps[j]);
        } else {
          const prev = D[k - 2];
          let bv = Infinity;
          let bi = -1;
          for (let i = k - 2; i < j; i++) {
            if (prev[i] === Infinity) continue;
            const v = prev[i] + seg(k - 1, gaps[i].b, gaps[j].a);
            if (v < bv) { bv = v; bi = i; }
          }
          if (bi >= 0) { row[j] = bv + reward(gaps[j]); prow[j] = bi; }
        }
      }
      D.push(row);
      P.push(prow);
    }
    let bj = -1;
    let bv = Infinity;
    const lastRow = D[N - 2];
    for (let j = 0; j < G; j++) {
      if (lastRow[j] === Infinity) continue;
      const v = lastRow[j] + seg(N - 1, gaps[j].b, t1);
      if (v < bv) { bv = v; bj = j; }
    }
    if (bj < 0) return { times: even(), method: "even", t0, t1 };
    const pick = new Array(N - 1);
    for (let k = N - 1; k >= 1; k--) {
      pick[k - 1] = bj;
      bj = P[k - 1][bj];
    }
    const times = [];
    for (let i = 0; i < N; i++) {
      const a = i === 0 ? t0 : gaps[pick[i - 1]].b;
      const b = i === N - 1 ? t1 : gaps[pick[i]].a;
      times.push({ start: a, end: b });
    }
    best = times;
    const spoken = times.reduce((x, s) => x + (s.end - s.start), 0);
    rate = totalW / Math.max(0.5, spoken);
  }
  return { times: best, method: "pauses", t0, t1 };
}

// ------------------------------------------------------------------------------------------------ pictures

function hasAlpha(img) {
  const c = canvas(64, 64);
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, 64, 64);
  const d = x.getImageData(0, 0, 64, 64).data;
  let clear = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) clear++;
  return clear > 64 * 64 * 0.04;
}

/**
 * A character picture ready to draw: transparent background (a flat green or white background is removed) and
 * trimmed to the figure. Returns { canvas, keyed: "none"|"green"|"flat" }.
 */
export function cutOut(img, maxH = 1400) {
  const sc = Math.min(1, maxH / img.height);
  const w = Math.round(img.width * sc);
  const h = Math.round(img.height * sc);
  const c = canvas(w, h);
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, w, h);
  let keyed = "none";
  if (!hasAlpha(img)) {
    const id = x.getImageData(0, 0, w, h);
    const d = id.data;
    // background colour = median of the border pixels
    const border = [];
    for (let i = 0; i < w; i += 3) border.push(i, (h - 1) * w + i);
    for (let j = 0; j < h; j += 3) border.push(j * w, j * w + w - 1);
    const med = (k) => {
      const v = border.map((p) => d[p * 4 + k]).sort((p, q) => p - q);
      return v[v.length >> 1];
    };
    const br = med(0), bg = med(1), bb = med(2);
    const green = bg > 120 && bg > br * 1.4 && bg > bb * 1.4;
    keyed = green ? "green" : "flat";
    const tol = green ? 95 : 42;
    const dist = (p) => {
      const r = d[p * 4] - br, g = d[p * 4 + 1] - bg, b = d[p * 4 + 2] - bb;
      return Math.sqrt(r * r + g * g + b * b);
    };
    const alpha = new Uint8Array(w * h).fill(255);
    const stack = [];
    for (const p of border) if (dist(p) < tol) { alpha[p] = 0; stack.push(p); }
    while (stack.length) {
      const p = stack.pop();
      const px = p % w;
      const nb = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, p - w, p + w];
      for (const q of nb) {
        if (q < 0 || q >= w * h || alpha[q] === 0) continue;
        if (dist(q) < tol) { alpha[q] = 0; stack.push(q); }
      }
    }
    if (green) {
      // green holes enclosed by the figure (between an arm and the body) and green fringes
      for (let p = 0; p < w * h; p++) {
        const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
        if (g > 110 && g > r * 1.55 && g > b * 1.55) alpha[p] = 0;
      }
    }
    for (let p = 0; p < w * h; p++) {
      d[p * 4 + 3] = alpha[p];
      if (green && alpha[p]) {
        // despill: pull green fringes (fur, hair, soft edges) back to neutral and make strongly green ones see-through
        const r = d[p * 4], b = d[p * 4 + 2];
        const m = Math.max(r, b);
        const ex = d[p * 4 + 1] - m;
        if (ex > 0) {
          d[p * 4 + 1] = m + ex * 0.1;
          if (ex > 40) d[p * 4 + 3] = Math.round(alpha[p] * Math.max(0, 1 - (ex - 40) / 110));
        }
      }
    }
    // soften the edge by one pixel
    for (let y = 1; y < h - 1; y++) {
      for (let xx = 1; xx < w - 1; xx++) {
        const p = y * w + xx;
        if (!alpha[p]) continue;
        const n = alpha[p - 1] + alpha[p + 1] + alpha[p - w] + alpha[p + w];
        if (n < 1020) d[p * 4 + 3] = Math.min(d[p * 4 + 3], Math.round((alpha[p] * 2 + n) / 6));
      }
    }
    x.putImageData(id, 0, 0);
  }
  // drop near-invisible alpha (< 16), then trim to the figure
  const idc = x.getImageData(0, 0, w, h);
  for (let i = 3; i < idc.data.length; i += 4) if (idc.data[i] < 16) idc.data[i] = 0;
  x.putImageData(idc, 0, 0);
  const id2 = idc.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 2) {
    for (let xx = 0; xx < w; xx += 2) {
      if (id2[(y * w + xx) * 4 + 3] > 24) {
        if (xx < x0) x0 = xx;
        if (xx > x1) x1 = xx;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { canvas: c, keyed };
  x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(w - 1, x1 + 7); y1 = Math.min(h - 1, y1 + 7);
  const out = canvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return { canvas: out, keyed };
}

/** a set picture, scaled to cover the frame with room for the camera */
export function setPlate(img) {
  const s = Math.max((W * 1.08) / img.width, (H * 1.08) / img.height);
  const c = canvas(img.width * Math.min(1, s * 1.25), img.height * Math.min(1, s * 1.25));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const LOOKS = {
  normal: { b: 1, s: 1, warm: 0 },
  bright: { b: 1.0, s: 1.08, warm: 0 },
  dim: { b: 0.42, s: 0.75, warm: 0 },
  dark: { b: 0.28, s: 0.6, warm: 0 },
  dusk: { b: 0.72, s: 0.85, warm: 0.12 },
  warm: { b: 0.95, s: 1, warm: 0.22 },
  night: { b: 0.5, s: 0.7, warm: -0.15 },
};

function toned(src, look, cache, key) {
  const L = LOOKS[look] || LOOKS.normal;
  if (L === LOOKS.normal) return src;
  const k = key + "|" + look;
  if (cache.has(k)) return cache.get(k);
  const c = canvas(src.width, src.height);
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-atop";
  if (L.s < 1) {
    x.globalCompositeOperation = "saturation";
    x.globalAlpha = 1 - L.s;
    x.fillStyle = "#808080";
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in";
    x.globalAlpha = 1;
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = "source-atop";
  }
  if (L.warm) {
    x.globalAlpha = Math.abs(L.warm);
    x.globalCompositeOperation = "color";
    x.fillStyle = L.warm > 0 ? "#b4782f" : "#3c5a9a";
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in";
    x.globalAlpha = 1;
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = "source-atop";
  }
  if (L.b < 1) {
    x.globalAlpha = 1 - L.b;
    x.fillStyle = "#000";
    x.fillRect(0, 0, c.width, c.height);
  }
  cache.set(k, c);
  return c;
}

/** the figure's solid shape (alpha >= 128) in black, used to cast the shadow and rim light */
function solidMask(src) {
  const c = canvas(src.width, src.height);
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(src, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 3; i < d.length; i += 4) {
    d[i - 3] = d[i - 2] = d[i - 1] = 0;
    d[i] = d[i] >= 128 ? 255 : 0;
  }
  x.putImageData(id, 0, 0);
  return c;
}

/** the cut-out with its light rim and soft drop shadow baked in (drawn once, reused every frame). The shadow and rim are
 * cast from the solid shape only, and the picture itself is drawn once, so faint painted glows stay faint. */
function baked(src, look, cache, key) {
  const k = key + "|baked|" + look;
  if (cache.has(k)) return cache.get(k);
  const h = src.height;
  const pad = Math.ceil(h * 0.06);
  const c = canvas(src.width + pad * 2, src.height + pad * 2);
  const x = c.getContext("2d");
  if (look === "shadow") {
    // a soft black silhouette (a shadow on the wall)
    const small = canvas(src.width / 10, src.height / 10);
    const sx = small.getContext("2d");
    sx.drawImage(src, 0, 0, small.width, small.height);
    sx.globalCompositeOperation = "source-in";
    sx.fillStyle = "#000";
    sx.fillRect(0, 0, small.width, small.height);
    x.imageSmoothingQuality = "high";
    x.drawImage(small, pad, pad, src.width, src.height);
    cache.set(k, { canvas: c, pad });
    return { canvas: c, pad };
  }
  const img = toned(src, look, cache, key);
  const mk = key + "|mask";
  if (!cache.has(mk)) cache.set(mk, solidMask(src));
  const mask = cache.get(mk);
  const OFF = 30000;
  x.save();
  x.shadowColor = "rgba(0,0,0,0.42)";
  x.shadowBlur = h * 0.016;
  x.shadowOffsetX = OFF;
  x.shadowOffsetY = h * 0.014;
  x.drawImage(mask, pad - OFF, pad);
  x.restore();
  x.save();
  x.shadowColor = "rgba(255,250,235,0.85)";
  x.shadowBlur = Math.max(1.5, h * 0.0022);
  x.shadowOffsetX = OFF;
  x.drawImage(mask, pad - OFF, pad);
  x.restore();
  x.drawImage(img, pad, pad);
  cache.set(k, { canvas: c, pad });
  return { canvas: c, pad };
}

/** the folded-paper texture, multiplied over every frame */
export function makePaper(seed = 7) {
  const w = W, h = H;
  const c = canvas(w, h);
  const x = c.getContext("2d");
  const id = x.createImageData(w, h);
  const d = id.data;
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  // low-frequency blotches on a coarse grid
  const gw = Math.ceil(w / 60) + 2, gh = Math.ceil(h / 60) + 2;
  const grid = new Float32Array(gw * gh).map(() => rand());
  const low = (px, py) => {
    const gx = px / 60, gy = py / 60;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = gx - ix, fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (a, b) => grid[Math.min(gh - 1, b) * gw + Math.min(gw - 1, a)];
    return mix(mix(g(ix, iy), g(ix + 1, iy), sx), mix(g(ix, iy + 1), g(ix + 1, iy + 1), sx), sy);
  };
  const crease = (p, pos, strength) => {
    const dd = p - pos;
    return -strength * Math.exp(-(dd * dd) / (2 * 1.6 * 1.6)) + 0.6 * strength * Math.exp(-((dd - 4) * (dd - 4)) / (2 * 2.5 * 2.5)) - 0.25 * strength * Math.exp(-(dd * dd) / (2 * 40 * 40));
  };
  const colC = new Float32Array(w);
  for (let i = 0; i < w; i++) colC[i] = crease(i, w / 3, 0.06) + crease(i, (2 * w) / 3, 0.06);
  const rowC = new Float32Array(h);
  for (let j = 0; j < h; j++) rowC[j] = crease(j, h / 2, 0.035);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let v = 1 - (rand() - 0.5) * 0.06 - 0.025 * low(i, j) + colC[i] + rowC[j];
      const rx = (i - w / 2) / (w / 2), ry = (j - h / 2) / (h / 2);
      const r = Math.sqrt(rx * rx + ry * ry);
      if (r > 0.55) v -= 0.1 * Math.pow(r - 0.55, 1.6);
      v = Math.max(0, Math.min(1, v));
      const p = (j * w + i) * 4;
      d[p] = v * 0.985 * 255;
      d[p + 1] = v * 0.975 * 255;
      d[p + 2] = v * 0.95 * 255;
      d[p + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  // short fibres
  x.strokeStyle = "rgba(60,45,30,0.06)";
  x.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    const px = rand() * w, py = rand() * h, ang = rand() * Math.PI, ln = 6 + rand() * 20;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(ang) * ln, py + Math.sin(ang) * ln);
    x.stroke();
  }
  return c;
}

// ------------------------------------------------------------------------------------------------ the reel

const TRANS_D = { cut: 0, fade: 0.5, slide: 0.6, "slide-back": 0.6, slideback: 0.6, iris: 0.8, zoom: 0.6, drop: 0.5 };

const CAMERAS = {
  push: [{ s: 1.0, x: 0, y: 0 }, { s: 1.1, x: 0, y: -20 }],
  "push-in": [{ s: 1.0, x: 0, y: 0 }, { s: 1.1, x: 0, y: -20 }],
  pull: [{ s: 1.12, x: 0, y: -10 }, { s: 1.0, x: 0, y: 0 }],
  "pull-out": [{ s: 1.12, x: 0, y: -10 }, { s: 1.0, x: 0, y: 0 }],
  left: [{ s: 1.08, x: 50, y: 0 }, { s: 1.08, x: -50, y: 0 }],
  right: [{ s: 1.08, x: -50, y: 0 }, { s: 1.08, x: 50, y: 0 }],
  up: [{ s: 1.08, x: 0, y: 60 }, { s: 1.08, x: 0, y: -40 }],
  down: [{ s: 1.08, x: 0, y: -40 }, { s: 1.08, x: 0, y: 60 }],
  still: [{ s: 1.02, x: 0, y: 0 }, { s: 1.04, x: 0, y: 0 }],
  close: [{ s: 1.16, x: 0, y: 40 }, { s: 1.26, x: 0, y: 70 }],
  face: [{ s: 1.0, x: 0, y: 0 }, { s: 1.3, x: 0, y: -240 }],
};

/**
 * Build the reel: every scene, character, headline, note, stamp and sound cue placed in time.
 * story: from parseStory; times: alignSentences(...).times; pics: Map id -> HTMLImageElement/ImageBitmap/canvas;
 * duration: seconds (the voice-over length plus a short tail).
 */
export function buildReel(story, times, pics, duration, opts = {}) {
  const N = story.sentences.length;
  const sStart = (k) => times[Math.max(0, Math.min(N - 1, k - 1))].start;
  const cue = (v, dflt) => {
    if (Array.isArray(v)) {
      const s = Math.round(num(v[0], 1));
      const f = clamp01(num(v[1], 0));
      const t = times[Math.max(0, Math.min(N - 1, s - 1))];
      return t.start + f * (t.end - t.start);
    }
    const x = num(v, NaN);
    if (!isFinite(x)) return dflt;
    const s = Math.floor(x);
    const f = clamp01(x - s);
    const t = times[Math.max(0, Math.min(N - 1, s - 1))];
    return t.start + f * (t.end - t.start);
  };
  const cache = new Map();
  const sets = new Map();
  const cuts = new Map();
  for (const p of story.pictures) {
    const img = pics.get(p.id);
    if (!img) continue;
    if (p.type === "set") sets.set(p.id, setPlate(img));
    else cuts.set(p.id, cutOut(img).canvas);
  }
  const scenes = story.scenes.map((s, i) => {
    const start = i === 0 ? 0 : Math.max(0, sStart(s.from) - 0.12);
    const kind = (s.transition || "fade").replace("_", "-");
    const tin = { kind: TRANS_D[kind] === undefined ? "fade" : kind, d: i === 0 ? 0 : TRANS_D[kind] ?? 0.5 };
    if (i === 0) tin.kind = "cut";
    return { ...s, i, start, tin, end: 0, toutD: 0 };
  });
  scenes.forEach((s, i) => {
    s.end = i < scenes.length - 1 ? scenes[i + 1].start : duration;
    s.toutD = i < scenes.length - 1 ? scenes[i + 1].tin.d : 0;
    s.tout = i < scenes.length - 1 ? scenes[i + 1].tin : null;
    s.cams = CAMERAS[s.camera] || CAMERAS.push;
    const holdEnd = s.end + s.toutD;
    s.chars = s.characters.map((c, k) => {
      const enter = str(c.enter || "none").toLowerCase();
      const exit = str(c.exit || "none").toLowerCase();
      const at = cue(c.at, enter === "none" ? s.start - 1 : s.start + 0.05);
      const until = cue(c.until, holdEnd + 1);
      const hh = (H * clamp01(num(c.size, 42) / 100)) || 800;
      const x0 = (W * num(c.x, 50)) / 100;
      const walkTo = c.walk_to !== undefined ? (W * num(c.walk_to, 50)) / 100 : null;
      return {
        id: c.id, x: x0, y: (H * num(c.y, 90)) / 100, h: hh, flip: !!c.flip, enter, exit, at, until,
        dur: num(c.speed, 0.6), look: str(c.look || "normal").toLowerCase(),
        walk: walkTo === null ? null : { x0, x1: walkTo, t0: at, t1: cue(c.walk_until, Math.min(until, holdEnd) - 0.1) },
        tag: str(c.tag), tagAt: cue(c.tag_at, Math.max(at, s.start) + 0.45), tagUntil: Math.min(until, holdEnd, cue(c.tag_until, Infinity)),
        tagY: c.tag_y !== undefined ? (H * num(c.tag_y, 50)) / 100 : null,
        shadow: c.shadow !== false && str(c.look).toLowerCase() !== "shadow", seed: i * 7 + k * 3 + 1,
      };
    });
    s.notesL = s.notes.map((n, k) => ({
      text: str(n.text), check: !!n.check, at: cue(n.at, s.start + 0.6 + k * 0.8), until: cue(n.until, s.end),
      x: n.x !== undefined ? (W * num(n.x, 50)) / 100 : W * (0.5 + (k % 2 ? 0.05 : -0.04)),
      y: n.y !== undefined ? (H * num(n.y, 60)) / 100 : H * (0.6 + k * 0.085), rot: [-4, 3, -2, 4][k % 4], seed: i * 11 + k * 2 + 3,
    }));
    s.stampsL = s.stamps.map((n, k) => ({
      text: str(n.text), color: STAMP[str(n.color).toLowerCase()] || STAMP.red, at: cue(n.at, s.start + 1), until: cue(n.until, s.end),
      x: n.x !== undefined ? (W * num(n.x, 60)) / 100 : W * (k % 2 ? 0.4 : 0.62), y: n.y !== undefined ? (H * num(n.y, 55)) / 100 : H * (0.55 + k * 0.1),
      rot: num(n.rot, k % 2 ? 8 : -11),
    }));
    if (s.counter) {
      const c = s.counter;
      const at = cue(c.at, s.start + 0.3);
      s.counterL = {
        label: str(c.label || "COUNT").toUpperCase(), at, until: cue(c.until, s.end), x: (W * num(c.x, 50)) / 100, y: (H * num(c.y, 34)) / 100,
        values: [[at, str(c.from ?? "0")], ...(c.to !== undefined ? [[cue(c.change_at, at + 1.5), str(c.to)]] : [])],
      };
    }
  });
  // headlines run one after another across the whole reel
  const heads = [];
  scenes.forEach((s) => {
    s.headlines.forEach((h) => {
      const at = cue(h.at, s.start + 0.05);
      const white = str(h.white || h.text || h.line1);
      const color = str(h.color || h.line2);
      const tone = TONES[str(h.tone).toLowerCase()] || RED;
      const lines = [];
      if (white) lines.push({ text: white, color: "#ffffff", at: at - 0.05 });
      if (color) lines.push({ text: color, color: tone, at: h.color_at !== undefined ? cue(h.color_at, at + 0.4) : at + (white ? 0.25 + 0.1 * white.split(/\s+/).length : 0) });
      if (lines.length) heads.push({ at, lines });
    });
  });
  heads.sort((p, q) => p.at - q.at);
  if (heads.length && heads[0].at < 0.8) {
    // hook rule: words are already on screen at frame 0
    heads[0].at = Math.min(heads[0].at, 0);
    heads[0].lines[0].at = -0.32;
  }
  heads.forEach((h, i) => (h.until = i < heads.length - 1 ? heads[i + 1].at : duration + 1));
  // sound cues
  const events = [];
  scenes.forEach((s) => {
    if (["slide", "slide-back", "slideback", "zoom", "drop"].includes(s.tin.kind)) events.push({ t: s.start, kind: "whoosh" });
    if (s.tin.kind === "iris") events.push({ t: s.start, kind: "whoosh", soft: true });
    s.notesL.forEach((n) => events.push({ t: n.at, kind: "paper" }));
    s.stampsL.forEach((n) => events.push({ t: n.at + 0.1, kind: "stamp" }));
    s.chars.forEach((c) => c.tag && events.push({ t: c.tagAt, kind: "tick" }));
    if (s.counterL) s.counterL.values.forEach((v) => events.push({ t: v[0], kind: "tick" }));
  });
  const follow = story.follow ? { at: Math.max(0, cue(story.followAt, sStart(N) + 0.1)), y: H * 0.47 } : null;
  if (follow) events.push({ t: follow.at, kind: "pop" });
  return {
    story, times, duration, scenes, heads, events, follow, sets, cuts, cache,
    text: opts.text !== false && story.text !== false,
    paper: makePaper(7),
    bufA: null, bufB: null,
  };
}

// ------------------------------------------------------------------------------------------------ drawing

function spaced(x, text, px, py, spacing, align = "left") {
  const chars = [...text];
  const widths = chars.map((ch) => x.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === "right" ? px - total : align === "center" ? px - total / 2 : px;
  chars.forEach((ch, i) => {
    x.fillText(ch, cx, py);
    cx += widths[i] + spacing;
  });
  return total;
}

function spacedWidth(x, text, spacing) {
  const chars = [...text];
  return chars.reduce((a, ch) => a + x.measureText(ch).width, 0) + spacing * Math.max(0, chars.length - 1);
}

function camAt(s, t) {
  const [a, b] = s.cams;
  const k = easeInOut(lin(t, s.start, s.end + s.toutD));
  return { s: mix(a.s, b.s, k), x: mix(a.x, b.x, k), y: mix(a.y, b.y, k) };
}

function drawSet(x, R, s) {
  const src = R.sets.get(s.set);
  if (!src) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#3a2c1e");
    g.addColorStop(1, "#140f0a");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    return;
  }
  const img = toned(src, s.look, R.cache, "set:" + s.set);
  const sc = Math.max(W / img.width, H / img.height) * 1.06;
  const w = img.width * sc, h = img.height * sc;
  x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function drawChar(x, R, c, t) {
  if (t < c.at || t > c.until) return;
  const src = R.cuts.get(c.id);
  if (!src) return;
  let px = c.x, py = c.y;
  let walking = false;
  if (c.walk) {
    const k = easeOut(lin(t, c.walk.t0, c.walk.t1));
    px = mix(c.walk.x0, c.walk.x1, k);
    walking = t > c.walk.t0 && t < c.walk.t1;
  }
  const ki = easeOut(lin(t, c.at, c.at + c.dur));
  const ko = lin(t, c.until - c.dur, c.until);
  let ox = 0, oy = 0, sc = 1, op = 1;
  if (c.enter === "left") ox -= (1 - ki) * 900;
  if (c.enter === "right") ox += (1 - ki) * 900;
  if (c.enter === "up") oy += (1 - ki) * 420;
  if (c.enter === "pop") sc *= 0.55 + 0.45 * back(lin(t, c.at, c.at + c.dur * 0.8));
  if (c.enter === "fade" || c.enter === "pop") op *= lin(t, c.at, c.at + c.dur * 0.6);
  if (c.until < 9e3) {
    if (c.exit === "left") ox -= easeInOut(ko) * 900;
    if (c.exit === "right") ox += easeInOut(ko) * 900;
    if (c.exit === "fade") op *= 1 - ko;
  }
  if (op <= 0.001) return;
  let rot = 0, sy = 1, bob = 0;
  if (walking) {
    bob = -Math.abs(Math.sin(t * Math.PI * 2.2)) * c.h * 0.012;
    rot += 1.3 * Math.sin(t * Math.PI * 2.2);
  } else if (c.look !== "shadow") {
    sy = 1 + 0.007 * Math.sin((t * 2 * Math.PI) / 3.4 + c.seed);
    rot += 0.35 * Math.sin((t * 2 * Math.PI) / 4.3 + c.seed * 1.7);
  }
  const b = baked(src, c.look, R.cache, "cut:" + c.id);
  const k = c.h / src.height;
  const fx = px + ox, fy = py + oy;
  x.save();
  x.globalAlpha = op * (c.look === "shadow" ? 0.55 : 1);
  if (c.shadow) {
    const sw = Math.min(src.width * k * 0.9, c.h * 0.75);
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, sw / 2);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.save();
    x.translate(fx, fy);
    x.scale(1, 0.14);
    x.translate(-fx, -fy);
    x.fillStyle = g;
    x.beginPath();
    x.arc(fx, fy, sw / 2, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  x.translate(fx, fy + bob);
  x.rotate((rot * Math.PI) / 180);
  x.scale(sc * (c.flip ? -1 : 1), sc * sy);
  const bw = b.canvas.width * k, bh = b.canvas.height * k;
  const pad = b.pad * k;
  x.drawImage(b.canvas, -bw / 2, -(bh - pad), bw, bh);
  x.restore();
}

function chip(x, text, cx, cy, light, size, k, o) {
  x.save();
  x.font = `700 ${size}px ${MONO}`;
  const tw = spacedWidth(x, text, 2);
  const w = tw + 28, h = size + 14;
  x.globalAlpha = o * clamp01(k * 2);
  x.translate(cx, cy);
  x.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  x.shadowColor = "rgba(0,0,0,0.35)";
  x.shadowBlur = 12;
  x.shadowOffsetY = 4;
  x.fillStyle = light ? CREAM : "rgba(18,15,12,0.9)";
  x.fillRect(-w / 2, -h / 2, w, h);
  x.shadowColor = "transparent";
  x.fillStyle = light ? INK : "#f3ead8";
  x.textBaseline = "middle";
  spaced(x, text, -tw / 2, 1, 2);
  x.restore();
}

function drawTag(x, c, t) {
  if (!c.tag || t < c.tagAt || t > c.tagUntil) return;
  const k = back(lin(t, c.tagAt, c.tagAt + 0.22));
  const o = 1 - lin(t, c.tagUntil - 0.2, c.tagUntil);
  let px = c.walk ? mix(c.walk.x0, c.walk.x1, easeOut(lin(t, c.walk.t0, c.walk.t1))) : c.x;
  const y = c.tagY ?? Math.max(c.y - c.h - 40, 500);
  px = Math.max(170, Math.min(W - 170, px));
  chip(x, c.tag.toUpperCase(), px, y, false, 23, k, o);
}

function tornPath(x, w, h, seed) {
  const n = 18;
  x.beginPath();
  for (let i = 0; i <= n; i++) x.lineTo((i / n) * w, h * (0.02 + rnd(seed + i) * 0.07));
  for (let i = 0; i <= n; i++) x.lineTo(w - (i / n) * w, h * (0.91 + rnd(seed * 3 + i) * 0.08));
  x.closePath();
}

function wrap2(text, maxChars = 18) {
  const words = text.split(/\s+/);
  if (text.length <= maxChars || words.length < 2) return [text];
  let best = 1, bd = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length, b = words.slice(i).join(" ").length;
    if (Math.abs(a - b) < bd) { bd = Math.abs(a - b); best = i; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function drawNote(x, n, t) {
  if (t < n.at || t > n.until) return;
  const k = back(lin(t, n.at, n.at + 0.28));
  const o = 1 - lin(t, n.until - 0.2, n.until);
  const lines = wrap2(n.text.toUpperCase());
  let size = 50;
  x.save();
  x.font = `${size}px ${ANTON}`;
  const chk = n.check ? size * 1.0 : 0;
  let tw = Math.max(...lines.map((l) => x.measureText(l).width)) + chk;
  if (tw > 820) {
    size = Math.floor((size * 820) / tw);
    x.font = `${size}px ${ANTON}`;
    tw = Math.max(...lines.map((l) => x.measureText(l).width)) + (n.check ? size : 0);
  }
  const w = tw + 68, h = lines.length * size * 1.1 + 56;
  x.globalAlpha = o * clamp01(k * 2);
  x.translate(n.x, n.y);
  x.rotate(((n.rot + (1 - k) * 8) * Math.PI) / 180);
  x.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  x.translate(-w / 2, -h / 2);
  x.shadowColor = "rgba(0,0,0,0.4)";
  x.shadowBlur = 14;
  x.shadowOffsetY = 8;
  x.fillStyle = CREAM;
  tornPath(x, w, h, n.seed);
  x.fill();
  x.shadowColor = "transparent";
  x.fillStyle = INK;
  x.textBaseline = "middle";
  x.textAlign = "left";
  lines.forEach((l, i) => {
    const lw = x.measureText(l).width + (n.check && i === 0 ? size : 0);
    let lx = (w - lw) / 2;
    const ly = 30 + size * 0.55 + i * size * 1.1;
    if (n.check && i === 0) {
      const p = lin(t, n.at + 0.15, n.at + 0.45);
      x.save();
      x.strokeStyle = "#d42a2a";
      x.lineWidth = size * 0.13;
      x.lineCap = "round";
      x.lineJoin = "round";
      x.beginPath();
      const s = size * 0.8 / 24;
      const pts = [[3, 13], [9, 19], [21, 5]].map(([a, b]) => [lx + a * s, ly - size * 0.42 + b * s]);
      const seg1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      const seg2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      const L = (seg1 + seg2) * p;
      x.moveTo(pts[0][0], pts[0][1]);
      if (L <= seg1) x.lineTo(mix(pts[0][0], pts[1][0], L / seg1), mix(pts[0][1], pts[1][1], L / seg1));
      else {
        x.lineTo(pts[1][0], pts[1][1]);
        const q = (L - seg1) / seg2;
        x.lineTo(mix(pts[1][0], pts[2][0], q), mix(pts[1][1], pts[2][1], q));
      }
      if (p > 0) x.stroke();
      x.restore();
      lx += size;
    }
    x.fillText(l, lx, ly);
  });
  x.restore();
}

function drawStamp(x, n, t) {
  if (t < n.at || t > n.until) return;
  const k = lin(t, n.at, n.at + 0.16);
  const s = 2.1 - 1.1 * easeOut(k);
  const shake = k >= 1 ? Math.sin((t - n.at) * 90) * 6 * (1 - lin(t, n.at + 0.16, n.at + 0.32)) : 0;
  const o = 1 - lin(t, n.until - 0.2, n.until);
  const text = n.text.toUpperCase();
  x.save();
  let size = 92;
  x.font = `${size}px ${ANTON}`;
  let tw = spacedWidth(x, text, 3);
  if (tw > 760) {
    size = Math.floor((size * 760) / tw);
    x.font = `${size}px ${ANTON}`;
    tw = spacedWidth(x, text, 3);
  }
  const w = tw + 56, h = size * 1.1 + 22;
  x.globalAlpha = o * clamp01(k * 1.5) * 0.9;
  x.translate(n.x + shake, n.y);
  x.rotate((n.rot * Math.PI) / 180);
  x.scale(s, s);
  x.strokeStyle = n.color;
  x.lineWidth = 8;
  const r = 12;
  x.beginPath();
  x.moveTo(-w / 2 + r, -h / 2);
  x.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  x.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  x.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  x.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  x.closePath();
  x.stroke();
  x.fillStyle = n.color;
  x.textBaseline = "middle";
  spaced(x, text, -tw / 2, 4, 3);
  x.restore();
}

function drawCounter(x, c, t) {
  if (!c || t < c.at || t > c.until) return;
  const k = back(lin(t, c.at, c.at + 0.3));
  const o = 1 - lin(t, c.until - 0.2, c.until);
  let cur = c.values[0];
  for (const v of c.values) if (t >= v[0]) cur = v;
  const flip = lin(t, cur[0], cur[0] + 0.25);
  x.save();
  x.globalAlpha = o * clamp01(k * 2);
  x.translate(c.x, c.y);
  x.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  x.font = `700 22px ${MONO}`;
  const lw = spacedWidth(x, c.label, 3);
  x.font = `150px ${ANTON}`;
  const nw = x.measureText(cur[1]).width;
  const w = Math.max(380, lw + 56, nw + 56), h = 230;
  x.shadowColor = "rgba(0,0,0,0.45)";
  x.shadowBlur = 24;
  x.shadowOffsetY = 10;
  x.fillStyle = CREAM;
  x.fillRect(-w / 2, -h / 2, w, h);
  x.shadowColor = "transparent";
  x.fillStyle = INK;
  x.textBaseline = "top";
  x.font = `700 22px ${MONO}`;
  spaced(x, c.label, -lw / 2, -h / 2 + 18, 3);
  x.save();
  x.translate(0, -h / 2 + 62);
  x.scale(1, 0.3 + 0.7 * easeOut(flip));
  x.font = `150px ${ANTON}`;
  x.fillStyle = cur === c.values[0] ? INK : RED;
  x.textAlign = "center";
  x.fillText(cur[1], 0, -8);
  x.restore();
  x.restore();
}

function drawMotes(x, kind, t, seed) {
  const n = kind === "petals" ? 30 : kind === "embers" ? 24 : 22;
  const ay = kind === "embers" ? 900 : 260, ah = kind === "embers" ? 900 : H - 520;
  x.save();
  for (let i = 0; i < n; i++) {
    const sp = kind === "dust" ? 10 : kind === "embers" ? 60 : 90;
    const dir = kind === "petals" ? 1 : -1;
    const y0 = ay + rnd(seed + i * 3) * ah;
    const yy = ay + ((((y0 - ay) + dir * t * sp * (0.5 + rnd(i))) % ah) + ah) % ah;
    const xx = rnd(seed * 5 + i) * W + Math.sin(t * (0.6 + rnd(i * 7)) + i) * 26;
    const r = (kind === "petals" ? 7 : kind === "embers" ? 4 : 5) * (0.5 + rnd(i * 11));
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
    if (kind === "petals") {
      x.save();
      x.translate(xx, yy);
      x.rotate(((t * 90 + i * 40) % 360) * (Math.PI / 180));
      x.fillStyle = i % 3 ? "#f29a1e" : "#f4c430";
      x.globalAlpha = 0.9;
      x.beginPath();
      x.ellipse(0, 0, r * 1.6, r * 0.8, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    } else {
      x.globalAlpha = (kind === "embers" ? tw : 0.4 + 0.6 * tw) * 0.7;
      x.fillStyle = kind === "embers" ? "#ffc56a" : "#fff3c4";
      x.beginPath();
      x.arc(xx, yy, r, 0, Math.PI * 2);
      x.fill();
    }
  }
  x.restore();
}

function drawClouds(x, t, seed) {
  x.save();
  for (let i = 0; i < 4; i++) {
    const w = 220 + rnd(seed + i) * 260;
    const span = W + w * 2;
    const px = ((rnd(seed * 7 + i) * span + t * 14 * (0.6 + rnd(i + seed) * 0.8)) % span) - w;
    const py = 120 + rnd(seed * 3 + i * 2) * 160;
    const s = w / 100;
    x.save();
    x.translate(px, py);
    x.scale(s, s);
    x.shadowColor = "rgba(0,0,0,0.18)";
    x.shadowBlur = 6;
    x.shadowOffsetY = 6 / s;
    x.fillStyle = "#f4eee2";
    x.globalAlpha = 0.95;
    x.fill(new Path2D("M6 38 Q2 38 4 31 Q6 24 15 25 Q15 13 28 13 Q34 3 48 7 Q58 0 67 9 Q80 7 82 19 Q96 19 95 30 Q97 38 90 38 Z"));
    x.restore();
  }
  x.restore();
}

function drawBeam(x, cx, w, op) {
  x.save();
  x.globalCompositeOperation = "screen";
  x.globalAlpha = op;
  x.translate(cx, -200);
  x.rotate((14 * Math.PI) / 180);
  const g = x.createLinearGradient(0, 0, 0, H + 400);
  g.addColorStop(0, "rgba(255,236,180,0.9)");
  g.addColorStop(1, "rgba(255,236,180,0)");
  x.fillStyle = g;
  x.fillRect(-w / 2, 0, w, H + 400);
  x.restore();
}

function drawFollow(x, f, t) {
  if (!f || t < f.at) return;
  const k = back(lin(t, f.at, f.at + 0.3));
  const pulse = 1 + 0.04 * Math.sin((t - f.at) * 6);
  x.save();
  x.globalAlpha = Math.min(1, k * 2);
  x.translate(W / 2, f.y);
  x.scale((0.6 + 0.4 * k) * pulse, (0.6 + 0.4 * k) * pulse);
  x.font = `64px ${ANTON}`;
  const tw = spacedWidth(x, "FOLLOW", 2);
  const w = tw + 52 * 2 + 66, h = 104;
  x.shadowColor = "rgba(0,0,0,0.45)";
  x.shadowBlur = 26;
  x.shadowOffsetY = 12;
  x.fillStyle = "#d42a2a";
  x.beginPath();
  x.moveTo(-w / 2 + h / 2, -h / 2);
  x.arc(w / 2 - h / 2, 0, h / 2, -Math.PI / 2, Math.PI / 2);
  x.arc(-w / 2 + h / 2, 0, h / 2, Math.PI / 2, -Math.PI / 2);
  x.closePath();
  x.fill();
  x.shadowColor = "transparent";
  x.fillStyle = "#fff";
  x.textBaseline = "middle";
  spaced(x, "FOLLOW", -w / 2 + 52, 4, 2);
  x.strokeStyle = "#fff";
  x.lineWidth = 7;
  x.lineCap = "round";
  x.lineJoin = "round";
  const ax = w / 2 - 52 - 40;
  x.beginPath();
  x.moveTo(ax - 4, 0);
  x.lineTo(ax + 34, 0);
  x.moveTo(ax + 18, -16);
  x.lineTo(ax + 34, 0);
  x.lineTo(ax + 18, 16);
  x.stroke();
  x.restore();
}

/** everything inside one scene (it moves with the scene's transition) */
function drawScene(x, R, s, t) {
  const c = camAt(s, t);
  x.save();
  x.translate(-c.x, -c.y);
  x.translate(W / 2, H / 2);
  x.scale(c.s, c.s);
  x.translate(-W / 2, -H / 2);
  drawSet(x, R, s);
  if (s.effects.includes("light") || s.effects.includes("beam")) {
    drawBeam(x, 420, 260, 0.22);
    drawBeam(x, 760, 200, 0.16);
  }
  if (s.effects.includes("clouds")) drawClouds(x, t, s.i + 3);
  for (const ch of s.chars) drawChar(x, R, ch, t);
  for (const e of ["dust", "embers", "petals"]) if (s.effects.includes(e)) drawMotes(x, e, t, s.i * 5 + 2);
  if (R.text) for (const ch of s.chars) drawTag(x, ch, t);
  x.restore();
  if (s.shade > 0) {
    const g = x.createLinearGradient(0, 0, 0, 560);
    g.addColorStop(0, `rgba(10,8,6,${s.shade})`);
    g.addColorStop(1, "rgba(10,8,6,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, W, 560);
  }
  drawCounter(x, s.counterL, t);
  if (R.text) {
    for (const n of s.notesL) drawNote(x, n, t);
    for (const n of s.stampsL) drawStamp(x, n, t);
  }
  if (s.i === R.scenes.length - 1) drawFollow(x, R.follow, t);
}

function drawHeadline(x, h, t) {
  if (t < h.at || t > h.until) return;
  const out = lin(t, h.until - 0.2, h.until);
  x.save();
  x.globalAlpha = 1 - out;
  x.translate(0, -12 * out);
  let y = 150;
  for (const ln of h.lines) {
    const text = ln.text.toUpperCase();
    const fs = Math.min(112, (W - 108) / Math.max(1, text.length * 0.47));
    x.font = `${fs}px ${ANTON}`;
    x.textBaseline = "top";
    const words = text.split(/\s+/);
    let px = 54;
    words.forEach((w, wi) => {
      const k = lin(t, ln.at + wi * 0.1, ln.at + wi * 0.1 + 0.2);
      const ww = x.measureText(w).width;
      if (k > 0) {
        const b = back(k);
        x.save();
        x.globalAlpha = (1 - out) * k;
        x.translate(px + ww / 2, y + fs * 0.5 + (1 - b) * 26);
        x.scale(0.9 + 0.1 * b, 0.9 + 0.1 * b);
        x.shadowColor = "rgba(0,0,0,0.5)";
        x.shadowBlur = 26;
        x.shadowOffsetY = 8;
        x.fillStyle = "rgba(0,0,0,0.35)";
        x.fillText(w, -ww / 2, -fs * 0.5 + 3);
        x.shadowColor = "transparent";
        x.fillStyle = ln.color;
        x.fillText(w, -ww / 2, -fs * 0.5);
        x.restore();
      }
      px += ww + fs * 0.22;
    });
    y += fs * 1.04;
  }
  x.restore();
}

function drawHeader(x, R, t) {
  let i = 0;
  while (i < R.scenes.length - 1 && t >= R.scenes[i + 1].start) i++;
  let place = "";
  for (let k = i; k >= 0 && !place; k--) place = R.scenes[k].place;
  x.save();
  x.textBaseline = "top";
  if (place) {
    x.font = `400 21px ${MONO}`;
    x.fillStyle = "rgba(255,255,255,0.8)";
    x.shadowColor = "rgba(0,0,0,0.7)";
    x.shadowBlur = 6;
    x.shadowOffsetY = 2;
    spaced(x, place.toUpperCase(), 56, 66, 2.5);
  }
  if (R.story.series) {
    x.font = `700 21px ${MONO}`;
    const tw = spacedWidth(x, R.story.series.toUpperCase(), 2);
    x.shadowColor = "rgba(0,0,0,0.35)";
    x.shadowBlur = 10;
    x.shadowOffsetY = 3;
    x.fillStyle = "#efe6d2";
    x.fillRect(W - 56 - tw - 24, 56, tw + 24, 36);
    x.shadowColor = "transparent";
    x.fillStyle = INK;
    spaced(x, R.story.series.toUpperCase(), W - 56 - 12, 62, 2, "right");
    x.font = `400 19px ${MONO}`;
    x.fillStyle = "rgba(255,255,255,0.72)";
    x.shadowColor = "rgba(0,0,0,0.7)";
    x.shadowBlur = 6;
    x.shadowOffsetY = 2;
    spaced(x, `FIG. ${i + 1}`, W - 58, 106, 2, "right");
  }
  x.restore();
}

/** draw the frame at time t (seconds) on a 2D context whose canvas is any size with a 9:16 shape */
export function drawFrame(ctx, R, t) {
  const S = ctx.canvas.width / W;
  const base = (x) => x.setTransform(S, 0, 0, S, 0, 0);
  base(ctx);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#120e0a";
  ctx.fillRect(0, 0, W, H);
  if (!R.bufA || R.bufA.width !== ctx.canvas.width) {
    R.bufA = canvas(ctx.canvas.width, ctx.canvas.height);
    R.bufB = canvas(ctx.canvas.width, ctx.canvas.height);
  }
  const active = R.scenes.filter((s) => t >= s.start - 1e-6 && t <= s.end + s.toutD);
  for (const s of active) {
    let alpha = 1, tx = 0, ty = 0, sc = 1, iris = null;
    if (s.tin.kind !== "cut" && t < s.start + s.tin.d) {
      const u = easeInOut(lin(t, s.start, s.start + s.tin.d));
      const k = s.tin.kind;
      if (k === "fade") alpha = u;
      if (k === "slide") tx = (1 - u) * W;
      if (k === "slide-back" || k === "slideback") tx = -(1 - u) * W;
      if (k === "drop") ty = -(1 - u) * H;
      if (k === "zoom") { alpha = u; sc = 1.18 - 0.18 * u; }
      if (k === "iris" && u < 1) {
        const at = s.irisAt || [50, 55];
        iris = { cx: (W * num(at[0], 50)) / 100, cy: (H * num(at[1], 55)) / 100, r: u * 2300 };
      }
    }
    if (s.tout && s.tout.kind !== "cut" && t > s.end) {
      const u = easeInOut(lin(t, s.end, s.end + s.toutD));
      const k = s.tout.kind;
      if (k === "slide") tx = -u * W;
      if (k === "slide-back" || k === "slideback") tx = u * W;
      if (k === "drop") ty = u * H * 0.6;
      if (k === "zoom") { sc = 1 + 0.35 * u; alpha = 1 - u; }
    }
    if (alpha <= 0.002) continue;
    if (alpha < 0.999) {
      const b = R.bufA;
      const bx = b.getContext("2d");
      base(bx);
      bx.globalAlpha = 1;
      bx.globalCompositeOperation = "source-over";
      bx.clearRect(0, 0, W, H);
      drawScene(bx, R, s, t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate((W / 2) * S, (H / 2) * S);
      ctx.scale(sc, sc);
      ctx.translate((-W / 2) * S, (-H / 2) * S);
      ctx.drawImage(b, 0, 0);
      ctx.restore();
      base(ctx);
    } else {
      ctx.save();
      if (iris) {
        ctx.beginPath();
        ctx.arc(iris.cx, iris.cy, iris.r, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.translate(tx, ty);
      if (sc !== 1) {
        ctx.translate(W / 2, H / 2);
        ctx.scale(sc, sc);
        ctx.translate(-W / 2, -H / 2);
      }
      drawScene(ctx, R, s, t);
      ctx.restore();
    }
  }
  if (R.text) for (const h of R.heads) drawHeadline(ctx, h, t);
  drawHeader(ctx, R, t);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(R.paper, 0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ sound

function noise(n, seed = 1) {
  const a = new Float32Array(n);
  let s = seed * 16807 % 2147483647 || 1;
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647;
    a[i] = (s / 2147483647) * 2 - 1;
  }
  return a;
}

/** simple state-variable band-pass over a signal with a changing centre frequency */
function bandpass(x, sr, fAt, q = 1.2) {
  const y = new Float32Array(x.length);
  let low = 0, band = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(fAt(i / sr), sr / 6)) / sr);
    low += f * band;
    const high = x[i] - low - band / q;
    band += f * high;
    y[i] = band;
  }
  return y;
}

function sfx(kind, sr, seed) {
  const env = (n, a, d) => (i) => {
    const t = i / sr;
    return t < a ? t / a : Math.exp(-(t - a) / d);
  };
  if (kind === "whoosh") {
    const n = Math.round(sr * 0.6);
    const x = noise(n, seed);
    const y = bandpass(x, sr, (t) => 300 + 2400 * Math.sin(Math.PI * Math.min(1, t / 0.6)), 1.4);
    const e = (i) => Math.sin(Math.PI * Math.min(1, i / n)) ** 2;
    for (let i = 0; i < n; i++) y[i] *= e(i) * 0.9;
    return y;
  }
  if (kind === "paper") {
    const n = Math.round(sr * 0.4);
    const y = new Float32Array(n);
    const x = noise(n, seed);
    const hp = bandpass(x, sr, () => 4200, 0.8);
    for (let b = 0; b < 4; b++) {
      const o = Math.round(sr * (0.02 + b * 0.075 + rnd(seed + b) * 0.03));
      const L = Math.round(sr * (0.03 + rnd(seed * 2 + b) * 0.05));
      for (let i = 0; i < L && o + i < n; i++) y[o + i] += hp[o + i] * Math.sin((Math.PI * i) / L) * (0.9 - b * 0.15);
    }
    return y;
  }
  if (kind === "stamp") {
    const n = Math.round(sr * 0.4);
    const y = new Float32Array(n);
    const x = noise(n, seed);
    const e1 = env(n, 0.002, 0.09);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      ph += (2 * Math.PI * (95 - 50 * Math.min(1, t / 0.15))) / sr;
      y[i] = Math.sin(ph) * e1(i) * 0.9 + x[i] * Math.exp(-t / 0.012) * 0.5;
    }
    return y;
  }
  if (kind === "tick") {
    const n = Math.round(sr * 0.05);
    const y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = Math.sin((2 * Math.PI * 1900 * i) / sr) * Math.exp(-i / (sr * 0.008)) * 0.5;
    return y;
  }
  if (kind === "pop") {
    const n = Math.round(sr * 0.14);
    const y = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      ph += (2 * Math.PI * (350 + 650 * (i / n))) / sr;
      y[i] = Math.sin(ph) * Math.sin((Math.PI * i) / n) * 0.6;
    }
    return y;
  }
  return new Float32Array(1);
}

/** a soft tanpura drone (Pa, Sa, Sa, low Sa), a quiet bed under the voice when there is no music file */
function tanpura(sr, seconds) {
  const n = Math.round(sr * seconds);
  const out = new Float32Array(n);
  const sa = 138.6;
  const notes = [sa * 0.75, sa, sa, sa / 2];
  const pluckLen = Math.round(sr * 4.2);
  const plucks = notes.map((f, k) => {
    const y = new Float32Array(pluckLen);
    const p = Math.max(2, Math.round(sr / f));
    const buf = noise(p, 7 + k);
    // soften the attack
    for (let i = 1; i < p; i++) buf[i] = 0.6 * buf[i] + 0.4 * buf[i - 1];
    let idx = 0;
    for (let i = 0; i < pluckLen; i++) {
      const a = buf[idx], b = buf[(idx + 1) % p];
      const v = 0.997 * 0.5 * (a + b);
      buf[idx] = v;
      y[i] = a;
      idx = (idx + 1) % p;
    }
    for (let i = 0; i < Math.min(pluckLen, sr * 0.01); i++) y[i] *= i / (sr * 0.01);
    return y;
  });
  const cycle = 3.2;
  const offs = [0, 0.55, 1.1, 1.65];
  for (let c = 0; c * cycle < seconds + cycle; c++) {
    notes.forEach((_, k) => {
      const o = Math.round(sr * (c * cycle + offs[k]));
      const y = plucks[k];
      for (let i = 0; i < pluckLen && o + i < n; i++) if (o + i >= 0) out[o + i] += y[i];
    });
  }
  // gentle low-pass
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += 0.22 * (out[i] - lp);
    out[i] = lp;
  }
  let peak = 0;
  for (let i = 0; i < n; i += 7) peak = Math.max(peak, Math.abs(out[i]));
  const g = peak > 0 ? 1 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= g;
  return out;
}

/**
 * Mix the reel's sound: the voice, a ducked music bed (the user's music file, the built-in tanpura, or none) and the
 * paper/stamp/whoosh effects at their cues. Returns a stereo AudioBuffer at the voice's sample rate.
 */
export function mixAudio({ voice, music, musicMode = "tanpura", events = [], duration, sfxOn = true }) {
  const sr = voice.sampleRate;
  const n = Math.ceil(duration * sr);
  const L = new Float32Array(n), Rr = new Float32Array(n);
  const vL = voice.getChannelData(0);
  const vR = voice.numberOfChannels > 1 ? voice.getChannelData(1) : vL;
  const vn = Math.min(n, voice.length);
  for (let i = 0; i < vn; i++) { L[i] = vL[i]; Rr[i] = vR[i]; }
  // voice envelope (for ducking and loudness)
  const hop = Math.round(sr * 0.02);
  const envN = Math.ceil(n / hop);
  const env = new Float32Array(envN);
  for (let f = 0; f < envN; f++) {
    let s = 0, c = 0;
    for (let i = f * hop; i < Math.min(n, f * hop + hop); i += 4) { s += L[i] * L[i]; c++; }
    env[f] = Math.sqrt(s / Math.max(1, c));
  }
  let peakEnv = 0;
  for (const e of env) peakEnv = Math.max(peakEnv, e);
  const sm = new Float32Array(envN);
  let level = 0;
  for (let f = 0; f < envN; f++) {
    const target = Math.min(1, env[f] / (peakEnv * 0.25 + 1e-9));
    level += (target - level) * (target > level ? 0.5 : 0.06);
    sm[f] = level;
  }
  let bed = null;
  let bedGain = 0;
  if (musicMode === "file" && music) {
    const m0 = music.getChannelData(0);
    const m1 = music.numberOfChannels > 1 ? music.getChannelData(1) : m0;
    bed = [m0, m1];
    bedGain = 0.16;
  } else if (musicMode === "tanpura") {
    const d = tanpura(sr, duration);
    bed = [d, d];
    bedGain = 0.1;
  }
  if (bed) {
    const mlen = bed[0].length;
    for (let i = 0; i < n; i++) {
      const duck = 1 - 0.55 * sm[Math.min(envN - 1, Math.floor(i / hop))];
      const fadeIn = Math.min(1, i / (sr * 0.8));
      const fadeOut = Math.min(1, (n - i) / (sr * 1.2));
      const j = mlen ? i % mlen : 0;
      const g = bedGain * duck * fadeIn * fadeOut;
      L[i] += bed[0][j] * g;
      Rr[i] += bed[1][j] * g;
    }
  }
  if (sfxOn) {
    const made = new Map();
    events.forEach((e, k) => {
      const key = e.kind + (k % 3);
      if (!made.has(key)) made.set(key, sfx(e.kind, sr, 11 + k % 3));
      const y = made.get(key);
      const o = Math.round(e.t * sr);
      const g = (e.soft ? 0.5 : 1) * (e.kind === "whoosh" ? 0.32 : e.kind === "stamp" ? 0.55 : e.kind === "paper" ? 0.35 : 0.3);
      const pan = e.kind === "whoosh" ? -0.6 : 0;
      for (let i = 0; i < y.length && o + i < n; i++) {
        if (o + i < 0) continue;
        const p = e.kind === "whoosh" ? mix(pan, -pan, i / y.length) : 0;
        L[o + i] += y[i] * g * (1 - Math.max(0, p));
        Rr[o + i] += y[i] * g * (1 + Math.min(0, p));
      }
    });
  }
  // loudness: bring the spoken parts to about -17 dBFS RMS (about -14 LUFS), then a soft limiter
  let s = 0, c = 0;
  for (let f = 0; f < envN; f++) if (sm[f] > 0.4) { s += env[f] * env[f]; c++; }
  const rms = Math.sqrt(s / Math.max(1, c)) || 0.1;
  const gain = Math.min(8, Math.pow(10, -17 / 20) / rms);
  const lim = (v) => {
    const a = Math.abs(v);
    if (a < 0.8) return v;
    return Math.sign(v) * (0.8 + 0.15 * Math.tanh((a - 0.8) / 0.15));
  };
  const out = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: sr });
  const o0 = out.getChannelData(0), o1 = out.getChannelData(1);
  for (let i = 0; i < n; i++) { o0[i] = lim(L[i] * gain); o1[i] = lim(Rr[i] * gain); }
  return out;
}
