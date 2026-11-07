import { W, H, FPS, parseStory, alignSentences, buildReel, drawFrame, mixAudio, loadFonts, slug } from "./engine.js";

const $ = (id) => document.getElementById(id);
const S = { story: null, voice: null, voiceName: "", music: null, pics: new Map(), files: new Map(), times: null, method: "", reel: null, mix: null, dirty: true };
const say = (id, html, cls = "") => { $(id).className = "status " + cls; $(id).innerHTML = html; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

async function decodeAudio(buf) {
  const ctx = new OfflineAudioContext(2, 1, 48000);
  return await ctx.decodeAudioData(buf.slice(0));
}

function loadImage(blob) {
  return new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => bad(new Error("This picture could not be opened."));
    img.src = URL.createObjectURL(blob);
  });
}

// ------------------------------------------------------------------ story code

function setStory(text, quiet) {
  try {
    const st = parseStory(text);
    S.story = st;
    S.dirty = true;
    store.set("paper-studio-code", text);
    const sets = st.pictures.filter((p) => p.type === "set").length;
    let html = `<span class="ok">✓ ${st.sentences.length} sentences, ${st.scenes.length} scenes, ${st.pictures.length} pictures (${sets} sets, ${st.pictures.length - sets} characters).</span>`;
    if (st.warnings.length) html += `<br><span class="warn">${st.warnings.map(esc).join("<br>")}</span>`;
    say("codeStatus", html);
    renderSlots();
    refresh();
    return true;
  } catch (e) {
    S.story = null;
    if (!quiet) say("codeStatus", esc(e.message), "bad");
    renderSlots();
    refresh();
    return false;
  }
}

$("check").onclick = () => setStory($("code").value);
$("code").addEventListener("paste", () => setTimeout(() => setStory($("code").value), 50));

// ------------------------------------------------------------------ voice

async function setVoice(file) {
  say("voiceStatus", "Reading the voice-over…");
  try {
    S.voice = await decodeAudio(await file.arrayBuffer());
    S.voiceName = file.name;
    S.dirty = true;
    say("voiceStatus", `<span class="ok">✓ ${esc(file.name)} · ${fmt(S.voice.duration)}</span>`);
    refresh();
  } catch (e) {
    S.voice = null;
    say("voiceStatus", "This audio file could not be read. Use an MP3, M4A or WAV file.", "bad");
  }
}
$("voice").onchange = (e) => e.target.files[0] && setVoice(e.target.files[0]);

// ------------------------------------------------------------------ pictures

let pickFor = null;
function renderSlots() {
  const box = $("slots");
  box.innerHTML = "";
  if (!S.story) {
    box.innerHTML = '<div class="hint" style="color:var(--muted);font-size:14px">The picture boxes appear after the story code is checked.</div>';
    return;
  }
  for (const p of S.story.pictures) {
    const d = document.createElement("div");
    const has = S.pics.has(p.id);
    d.className = "slot" + (has ? " has" : "");
    const th = document.createElement("div");
    th.className = "th" + (p.type === "set" ? " set" : "");
    if (has) th.style.backgroundImage = `url(${S.pics.get(p.id).src})`;
    d.appendChild(th);
    d.insertAdjacentHTML("beforeend", `<div class="nm">${esc(p.id)} · ${p.type === "set" ? "SET" : "CHARACTER"}</div><div class="wh">${esc(p.what || (has ? "" : "tap to choose"))}</div>`);
    d.onclick = () => { pickFor = p.id; $("one").value = ""; $("one").click(); };
    box.appendChild(d);
  }
  const n = S.story.pictures.filter((p) => S.pics.has(p.id)).length;
  say("picStatus", n === S.story.pictures.length ? `<span class="ok">✓ All ${n} pictures added.</span>` : `${n} of ${S.story.pictures.length} pictures added.`);
}

async function putPicture(id, file) {
  const img = await loadImage(file);
  S.pics.set(id, img);
  S.dirty = true;
}

$("one").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f || !pickFor) return;
  try { await putPicture(pickFor, f); } catch (x) { say("picStatus", esc(x.message), "bad"); }
  renderSlots();
  refresh();
};

const key = (name) => slug(name).replace(/_/g, "");
async function addMany(files) {
  if (!S.story) {
    say("picStatus", "Check the story code first, then add the pictures.", "warn");
    return;
  }
  const byKey = new Map(S.story.pictures.map((p) => [key(p.id), p.id]));
  const rest = [];
  for (const f of files) {
    const id = byKey.get(key(f.name));
    if (id) await putPicture(id, f).catch(() => {});
    else rest.push(f);
  }
  // pictures with other names fill the empty boxes in order
  const empty = S.story.pictures.filter((p) => !S.pics.has(p.id)).map((p) => p.id);
  for (let i = 0; i < rest.length && i < empty.length; i++) await putPicture(empty[i], rest[i]).catch(() => {});
  renderSlots();
  if (rest.length) say("picStatus", $("picStatus").innerHTML + `<br><span class="warn">${rest.length} picture(s) had other names and were put in the empty boxes in order: check each box and tap it to change.</span>`);
  refresh();
}
$("many").onchange = (e) => addMany([...e.target.files]);

// a reel folder (computer): story.json / story.txt, voice.*, music.*, pictures named by id
$("folder").onchange = async (e) => {
  const files = [...e.target.files].filter((f) => !f.name.startsWith("."));
  const storyF = files.find((f) => /^story(-code)?\.(json|txt)$/i.test(f.name)) || files.find((f) => /\.json$/i.test(f.name));
  if (storyF) {
    $("code").value = await storyF.text();
    setStory($("code").value);
  }
  const audio = files.filter((f) => /\.(mp3|m4a|wav|aac|ogg)$/i.test(f.name));
  const musicF = audio.find((f) => /^music/i.test(f.name));
  const voiceF = audio.find((f) => /^(voice|vo|voiceover)/i.test(f.name)) || audio.find((f) => f !== musicF);
  if (voiceF) await setVoice(voiceF);
  if (musicF) {
    S.music = await decodeAudio(await musicF.arrayBuffer()).catch(() => null);
    if (S.music) $("music").value = "file";
  }
  await addMany(files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name)));
};

// ------------------------------------------------------------------ music and options

$("music").onchange = () => {
  if ($("music").value === "file" && !S.music) $("musicFile").click();
  S.dirty = true;
  refresh();
};
$("musicFile").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  S.music = await decodeAudio(await f.arrayBuffer()).catch(() => null);
  if (!S.music) $("music").value = "tanpura";
  S.dirty = true;
  refresh();
};
$("text").onchange = $("sfx").onchange = () => { S.dirty = true; refresh(); };

// ------------------------------------------------------------------ build + preview

const view = $("view");
const vctx = view.getContext("2d");
let playing = null; // { ctx, src, t0, off }
let pos = 0;

function build() {
  if (!S.story || !S.voice) return false;
  if (!S.dirty && S.reel) return true;
  const al = alignSentences(S.voice, S.story.sentences);
  S.times = al.times;
  S.method = al.method;
  const duration = Math.max(S.voice.duration, al.t1) + 0.8;
  S.reel = buildReel(S.story, S.times, S.pics, duration, { text: $("text").checked });
  const mode = $("music").value === "file" && S.music ? "file" : $("music").value === "file" ? "tanpura" : $("music").value;
  S.mix = mixAudio({ voice: S.voice, music: S.music, musicMode: mode, events: S.reel.events, duration, sfxOn: $("sfx").checked });
  S.dirty = false;
  const ol = $("sents");
  ol.innerHTML = "";
  S.story.sentences.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${fmt(S.times[i].start)}.${String(Math.floor((S.times[i].start % 1) * 10))}</span>${esc(s)}`;
    li.onclick = () => { seekTo(S.times[i].start); };
    ol.appendChild(li);
  });
  if (S.method !== "pauses") say("voiceStatus", $("voiceStatus").innerHTML + '<br><span class="warn">Could not find clear pauses between sentences, so the timing is estimated. Check the preview.</span>');
  return true;
}

function refresh() {
  const ready = !!(S.story && S.voice);
  $("play").disabled = $("seek").disabled = $("make").disabled = !ready;
  if (!ready) {
    vctx.fillStyle = "#120e0a";
    vctx.fillRect(0, 0, view.width, view.height);
    return;
  }
  stop();
  build();
  pos = Math.min(pos, S.reel.duration);
  draw(pos);
}

function draw(t) {
  drawFrame(vctx, S.reel, t);
  $("time").textContent = `${fmt(t)} / ${fmt(S.reel.duration)}`;
  $("seek").value = Math.round((t / S.reel.duration) * 1000);
}

function stop() {
  if (!playing) return;
  try { playing.src.stop(); } catch {}
  playing.ctx.close();
  playing = null;
  $("play").textContent = "▶ Play";
}

function play() {
  if (!build()) return;
  const ctx = new AudioContext();
  const src = ctx.createBufferSource();
  src.buffer = S.mix;
  src.connect(ctx.destination);
  if (pos >= S.reel.duration - 0.05) pos = 0;
  src.start(0, pos);
  playing = { ctx, src, t0: ctx.currentTime, off: pos };
  $("play").textContent = "❚❚ Pause";
  src.onended = () => { if (playing && playing.src === src) { stop(); } };
  const loop = () => {
    if (!playing || playing.src !== src) return;
    pos = playing.off + (ctx.currentTime - playing.t0);
    draw(Math.min(pos, S.reel.duration));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function seekTo(t) {
  const was = !!playing;
  stop();
  pos = Math.max(0, Math.min(t, S.reel.duration));
  draw(pos);
  if (was) play();
}

$("play").onclick = () => (playing ? (pos = playing.off + (playing.ctx.currentTime - playing.t0), stop(), draw(pos)) : play());
$("seek").oninput = () => S.reel && seekTo(($("seek").value / 1000) * S.reel.duration);

// ------------------------------------------------------------------ make the MP4

let resultFile = null;
async function makeMp4() {
  if (!build()) return;
  stop();
  $("make").disabled = true;
  $("bar").hidden = false;
  $("saveRow").hidden = true;
  $("result").hidden = true;
  const fill = $("barFill");
  const R = S.reel;
  const frames = Math.ceil(R.duration * FPS);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const cx = cv.getContext("2d");
  const t0 = performance.now();
  try {
    const MB = await import("mediabunny");
    const videoOk = await MB.canEncodeVideo("avc", { width: W, height: H, bitrate: 6e6 }).catch(() => false);
    if (!videoOk) throw Object.assign(new Error("no-webcodecs"), { fallback: true });
    if (!(await MB.canEncodeAudio("aac").catch(() => false))) {
      const { registerAacEncoder } = await import("./mediabunny-aac-encoder.min.mjs");
      registerAacEncoder();
    }
    const output = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: "in-memory" }), target: new MB.BufferTarget() });
    const vs = new MB.CanvasSource(cv, { codec: "avc", bitrate: 6e6, keyFrameInterval: 2 });
    output.addVideoTrack(vs, { frameRate: FPS });
    const as = new MB.AudioBufferSource({ codec: "aac", bitrate: 192e3 });
    output.addAudioTrack(as);
    await output.start();
    await as.add(S.mix);
    as.close();
    for (let f = 0; f < frames; f++) {
      drawFrame(cx, R, f / FPS);
      await vs.add(f / FPS, 1 / FPS);
      if (f % 10 === 0) {
        fill.style.width = `${(100 * f) / frames}%`;
        const el = (performance.now() - t0) / 1000;
        const left = f > 30 ? (el / f) * (frames - f) : 0;
        say("makeStatus", `Making the video… ${Math.round((100 * f) / frames)}%${left ? ` · about ${Math.ceil(left / 60)} min left` : ""}`);
        if (f % 60 === 0) drawFrame(vctx, R, f / FPS);
      }
    }
    vs.close();
    await output.finalize();
    done(new Blob([output.target.buffer], { type: "video/mp4" }), "mp4");
  } catch (e) {
    if (e && e.fallback) return recordRealtime(cv, cx, frames);
    console.error(e);
    say("makeStatus", "The video could not be made here: " + esc(e.message || e) + ". Try Chrome on a computer or phone.", "bad");
    $("make").disabled = false;
  }
}

/** older browsers: record the canvas while it plays (takes as long as the reel) */
async function recordRealtime(cv, cx, frames) {
  const R = S.reel;
  const types = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
  const type = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!type) {
    say("makeStatus", "This browser cannot make videos. Open this page in Chrome (Android or computer) or Safari (iPhone).", "bad");
    $("make").disabled = false;
    return;
  }
  const actx = new AudioContext();
  const dest = actx.createMediaStreamDestination();
  const src = actx.createBufferSource();
  src.buffer = S.mix;
  src.connect(dest);
  const stream = cv.captureStream(FPS);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6e6, audioBitsPerSecond: 192e3 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const ended = new Promise((ok) => (rec.onstop = ok));
  say("makeStatus", "Recording the video in real time (keep the screen on)…");
  drawFrame(cx, R, 0);
  rec.start(1000);
  const t0 = actx.currentTime + 0.05;
  src.start(t0);
  await new Promise((ok) => {
    const loop = () => {
      const t = actx.currentTime - t0;
      if (t >= R.duration) return ok();
      drawFrame(cx, R, Math.max(0, t));
      $("barFill").style.width = `${(100 * Math.max(0, t)) / R.duration}%`;
      requestAnimationFrame(loop);
    };
    loop();
  });
  rec.stop();
  await ended;
  actx.close();
  done(new Blob(chunks, { type: type.split(";")[0] }), type.includes("mp4") ? "mp4" : "webm");
}

function done(blob, ext) {
  const name = `${slug(S.story.title) || "paper-reel"}.${ext}`;
  resultFile = new File([blob], name, { type: blob.type });
  const url = URL.createObjectURL(blob);
  $("download").href = url;
  $("download").download = name;
  $("result").src = url;
  $("result").hidden = false;
  $("barFill").style.width = "100%";
  $("saveRow").hidden = false;
  $("share").hidden = !(navigator.canShare && navigator.canShare({ files: [resultFile] }));
  say("makeStatus", `<span class="ok">✓ Ready: ${esc(name)} · ${fmt(S.reel.duration)} · ${(blob.size / 1048576).toFixed(0)} MB.</span>` +
    (ext === "webm" ? '<br><span class="warn">This browser made a WebM file. If Instagram does not take it, make it again in Chrome or Safari.</span>' : ""));
  $("make").disabled = false;
}

$("make").onclick = makeMp4;
$("share").onclick = async () => {
  try { await navigator.share({ files: [resultFile], title: resultFile.name }); } catch {}
};

// ------------------------------------------------------------------ example

$("example").onclick = async (e) => {
  e.preventDefault();
  say("codeStatus", "Loading the example…");
  try {
    const base = "example/";
    const code = await (await fetch(base + "story.json")).text();
    $("code").value = code;
    if (!setStory(code)) return;
    const vo = await (await fetch(base + "voice.mp3")).blob();
    await setVoice(new File([vo], "voice.mp3"));
    for (const p of S.story.pictures) {
      for (const ext of p.type === "set" ? ["jpg", "webp", "png"] : ["webp", "png", "jpg"]) {
        const r = await fetch(`${base}pictures/${p.id}.${ext}`);
        if (r.ok) { await putPicture(p.id, await r.blob()); break; }
      }
    }
    renderSlots();
    refresh();
    window.scrollTo({ top: document.querySelector(".stage").offsetTop - 20, behavior: "smooth" });
  } catch (x) {
    say("codeStatus", "The example could not be loaded: " + esc(x.message), "bad");
  }
};

// ------------------------------------------------------------------ start

window.paperStudio = { S, seekTo };

(async () => {
  await loadFonts();
  if (new URLSearchParams(location.search).has("example")) {
    renderSlots();
    $("example").click();
    return;
  }
  const saved = store.get("paper-studio-code");
  if (saved) {
    $("code").value = saved;
    setStory(saved, true);
  } else renderSlots();
  refresh();
})();
