const DAILY_KEY = "dailyBirdSign";
const UNLOCKED_KEY = "unlockedBirdIds";

const state = {
  birds: [],
  activeBird: null,
  revealed: false,
  currentScreen: "home",
  unlockedBirdIds: new Set(),
  unlockedBirdTimes: new Map(),
  playingCallId: null,
  callProgressFrame: null,
  detailBird: null,
  guideFilter: "all",
  countdownTimer: null
};

const els = {};
const embeddedBirds = Array.isArray(window.BIRD_SIGN_DATA) ? window.BIRD_SIGN_DATA : [];
// All 34 birds have audio files — no callBirdIds filter needed.

const callAudio = new Audio();
let pulseViz = null;
let toastTimer = null;
const detailImageCache = new Map();
const SAVE_ICON_HTML = '<svg class="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>保存到相册</span>';
/* ── Pulse Ring Visualizer (Web Audio API + Canvas) ── */
class PulseVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.freqData = null;
    this.timeData = null;
    this.rafId = null;
    this.isPlaying = false;
    this.time = 0;
    this._boundDraw = this._draw.bind(this);
  }

  _ensureAudioCtx(audioEl) {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.78;
    this.source = this.audioCtx.createMediaElementSource(audioEl);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);
  }

  start(audioEl) {
    this._ensureAudioCtx(audioEl);
    if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    this.isPlaying = true;
    if (!this.rafId) this._draw();
  }

  startIdle() {
    this.isPlaying = false;
    if (!this.rafId) this._draw();
  }

  stop() {
    this.isPlaying = false;
  }

  pause() {
    this.isPlaying = false;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  _draw() {
    var c = this.canvas;
    var ctx = this.ctx;
    var dpr = window.devicePixelRatio || 1;
    var displayW = c.clientWidth * dpr;
    var displayH = c.clientHeight * dpr;
    if (c.width !== displayW || c.height !== displayH) {
      c.width = displayW; c.height = displayH;
    }
    var w = c.width, h = c.height;
    var cx = w / 2, cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    this.time += 0.016;

    if (this.isPlaying && this.analyser) {
      this.analyser.getByteFrequencyData(this.freqData);
      this.analyser.getByteTimeDomainData(this.timeData);

      var maxR = Math.min(cx, cy) * 0.92;
      var innerR = maxR * 0.28;
      var usable = Math.floor(this.freqData.length * 0.7);
      var n = 180;

      /* Average energy for core pulse */
      var totalEnergy = 0;
      for (var i = 0; i < usable; i++) totalEnergy += this.freqData[i];
      var avgEnergy = totalEnergy / usable / 255;
      var pulseR = innerR * (1 + avgEnergy * 0.35);

      /* Central glowing core */
      var coreGrad = ctx.createRadialGradient(cx, cy, pulseR * 0.15, cx, cy, pulseR);
      coreGrad.addColorStop(0, "hsla(" + (avgEnergy * 50) + ",80%,65%,0.55)");
      coreGrad.addColorStop(0.6, "hsla(" + (avgEnergy * 50 + 30) + ",70%,50%,0.15)");
      coreGrad.addColorStop(1, "hsla(" + (avgEnergy * 50) + ",60%,40%,0.02)");
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      /* 180 rainbow frequency bars radiating outward */
      for (var j = 0; j < n; j++) {
        var angle = (j / n) * Math.PI * 2 - Math.PI / 2;
        var fi = Math.floor(j * usable / n);
        var val = this.freqData[fi] / 255;
        var barLen = val * (maxR - innerR) * 1.6;
        var x1 = cx + Math.cos(angle) * pulseR;
        var y1 = cy + Math.sin(angle) * pulseR;
        var x2 = cx + Math.cos(angle) * (pulseR + barLen);
        var y2 = cy + Math.sin(angle) * (pulseR + barLen);

        var hue = (j / n) * 300 + avgEnergy * 60;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "hsl(" + (hue % 360) + ",75%,55%)";
        ctx.globalAlpha = 0.65 + val * 0.35;
        ctx.lineWidth = 2.2 * dpr / 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* White waveform ring (time domain) */
      ctx.beginPath();
      for (var k = 0; k < this.timeData.length; k++) {
        var a = (k / this.timeData.length) * Math.PI * 2 - Math.PI / 2;
        var v = (this.timeData[k] - 128) / 128;
        var r = pulseR + v * 14 * dpr / 2;
        var px = cx + Math.cos(a) * r;
        var py = cy + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2 * dpr / 2;
      ctx.stroke();

    } else {
      /* Idle breathing animation — vivid rainbow pulse */
      var breath = Math.sin(this.time * 1.2) * 0.08 + 1;
      var idleR = Math.min(cx, cy) * 0.28 * breath;
      var hue = (this.time * 25) % 360;

      /* Outer soft glow */
      var idleGlow = ctx.createRadialGradient(cx, cy, idleR * 0.3, cx, cy, idleR * 2.2);
      idleGlow.addColorStop(0, "hsla(" + hue + ",70%,60%,0.35)");
      idleGlow.addColorStop(0.5, "hsla(" + (hue + 40) + ",65%,50%,0.12)");
      idleGlow.addColorStop(1, "hsla(" + hue + ",60%,40%,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, idleR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = idleGlow;
      ctx.fill();

      /* Inner core */
      var coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, idleR);
      coreGlow.addColorStop(0, "hsla(" + hue + ",75%,65%,0.5)");
      coreGlow.addColorStop(1, "hsla(" + (hue + 30) + ",65%,50%,0.08)");
      ctx.beginPath();
      ctx.arc(cx, cy, idleR, 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.fill();

      /* Breathing outer ring */
      var ringAlpha = 0.25 + Math.sin(this.time * 1.2) * 0.12;
      ctx.beginPath();
      ctx.arc(cx, cy, idleR * 1.6, 0, Math.PI * 2);
      ctx.strokeStyle = "hsla(" + hue + ",70%,60%," + ringAlpha + ")";
      ctx.lineWidth = 2 * dpr / 2;
      ctx.stroke();

      /* Quiet rainbow feathers keep the signature spectrum visible before playback */
      var featherCount = 96;
      var featherInner = idleR * 1.45;
      var featherBase = idleR * 1.85;
      for (var idleI = 0; idleI < featherCount; idleI++) {
        var idleA = (idleI / featherCount) * Math.PI * 2 - Math.PI / 2;
        var wave = Math.sin(this.time * 1.8 + idleI * 0.42) * 0.5 + 0.5;
        var featherOuter = featherBase + (8 + wave * 18) * dpr / 2;
        var ix1 = cx + Math.cos(idleA) * featherInner;
        var iy1 = cy + Math.sin(idleA) * featherInner;
        var ix2 = cx + Math.cos(idleA) * featherOuter;
        var iy2 = cy + Math.sin(idleA) * featherOuter;
        ctx.beginPath();
        ctx.moveTo(ix1, iy1);
        ctx.lineTo(ix2, iy2);
        ctx.strokeStyle = "hsla(" + ((idleI / featherCount) * 300 + hue * 0.18) % 360 + ",72%,58%," + (0.18 + wave * 0.2) + ")";
        ctx.lineWidth = 1.7 * dpr / 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      /* Inner accent ring */
      ctx.beginPath();
      ctx.arc(cx, cy, idleR + 6 * dpr / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "hsla(" + ((hue + 120) % 360) + ",65%,55%," + (ringAlpha * 0.7) + ")";
      ctx.lineWidth = 1.5 * dpr / 2;
      ctx.stroke();
    }

    this.rafId = requestAnimationFrame(this._boundDraw);
  }
}


function $(selector) {
  return document.querySelector(selector);
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function todayText() {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const date = new Date();
  const lunar = lunarDateText(date);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}${lunar ? ` · ${lunar}` : ""}`;
}

function lunarDayName(day) {
  const numerals = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  if (day <= 0 || day > 30) return "";
  if (day < 10) return `初${numerals[day]}`;
  if (day === 10) return "初十";
  if (day < 20) return `十${numerals[day - 10]}`;
  if (day === 20) return "二十";
  if (day < 30) return `廿${numerals[day - 20]}`;
  return "三十";
}

function lunarDateText(date) {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "long",
      day: "numeric"
    }).formatToParts(date);
    const month = parts.find((part) => part.type === "month")?.value;
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const lunarDay = lunarDayName(day);
    return month && lunarDay ? `农历${month}${lunarDay}` : "";
  } catch {
    return "";
  }
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Some embedded browsers block storage; the experience should still render.
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Keep preview reset non-fatal when storage is unavailable.
  }
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getConservationStatusClass(status) {
  if (["安全"].includes(status)) return "status-safe";
  if (["罕见", "减少", "近危"].includes(status)) return "status-watch";
  if (["易危", "濒危", "极危"].includes(status)) return "status-danger";
  if (["人工", "非本地"].includes(status)) return "status-neutral";
  return "status-neutral";
}

function parseQuoteParts(quote) {
  var clean = String(quote || "").trim();
  var match = clean.match(/^【([^】]+)】\s*([\s\S]*)$/);
  if (!match) {
    return { title: "今日状态", body: clean || "今天的鸟签还在晨雾里。" };
  }
  return {
    title: match[1].trim() || "今日状态",
    body: match[2].trim() || clean
  };
}

function withBirdMeta(bird) {
  if (!bird.habitat) {
    throw new Error(`${bird.name} (${bird.id}) 缺少栖息地数据，请检查 export_h5_birds.mjs`);
  }
  return {
    ...bird,
    call: bird.call || `assets/bird-calls/${bird.id}.mp3`
  };
}

async function loadBirds() {
  if (embeddedBirds.length) return embeddedBirds;
  try {
    const response = await fetch("./web/assets/meta/birds.json");
    if (!response.ok) throw new Error("鸟签数据暂时飞丢了，请稍后再试。");
    return await response.json();
  } catch (error) {
    if (embeddedBirds.length) return embeddedBirds;
    return [];
  }
}

function isPreviewMode() {
  return ["localhost", "127.0.0.1", ""].includes(location.hostname) || location.protocol === "file:";
}



function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = midnight - now;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { hours, minutes, seconds, total: diff };
}

function renderNfcSimulator() {
  var container = document.getElementById("nfc-simulator");
  if (!container) return;
  if (!isPreviewMode()) { container.style.display = "none"; return; }
  container.style.display = "";
}

function renderGuideFilters() {
  var container = document.getElementById("guide-filters");
  if (!container) return;
  var filters = [
    { key: "all", label: "全部" },
    { key: "unlocked", label: "已收录" },
    { key: "locked", label: "未收录" }
  ];
  container.innerHTML = filters.map(function(f) {
    return '<button class="filter-btn' + (state.guideFilter === f.key ? " active" : "") + '" data-filter="' + f.key + '" type="button">' + f.label + '</button>';
  }).join("");
}

function renderDailyCountdown() {
  var countdownEl = document.getElementById("daily-countdown");
  if (!countdownEl) return;
  if (!state.revealed) { countdownEl.style.display = "none"; return; }
  countdownEl.style.display = "";
  var t = getTimeUntilMidnight();
  var pad = function(n) { return n < 10 ? "0" + n : "" + n; };
  countdownEl.innerHTML = '<span class="countdown-label">距离下一次鸟签</span><span class="countdown-time">' + pad(t.hours) + ":" + pad(t.minutes) + ":" + pad(t.seconds) + '</span>';
}

function startCountdownTimer() {
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(function() { renderDailyCountdown(); }, 1000);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1900);
}

function setImage(img, bird, label) {
  img.onerror = () => {
    if (bird?.fallbackImage && img.src !== bird.fallbackImage) {
      img.src = bird.fallbackImage;
    }
  };
  img.src = bird?.image || "";
  img.alt = bird ? `${bird.name}${label}` : "";
}

async function sanitizeTransparentEdge(src) {
  if (!src) return "";
  if (detailImageCache.has(src)) return detailImageCache.get(src);
  var promise = new Promise(function(resolve) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function() {
      try {
        var canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        var ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = image.data;
        var width = image.width;
        var height = image.height;
        var copy = new Uint8ClampedArray(data);
        var hasAlpha = function(x, y) {
          if (x < 0 || y < 0 || x >= width || y >= height) return false;
          return copy[(y * width + x) * 4 + 3] > 0;
        };
        for (var y = 0; y < height; y++) {
          for (var x = 0; x < width; x++) {
            var i = (y * width + x) * 4;
            if (copy[i + 3] !== 0) continue;
            var totalR = 0, totalG = 0, totalB = 0, count = 0;
            for (var dy = -2; dy <= 2; dy++) {
              for (var dx = -2; dx <= 2; dx++) {
                if (!dx && !dy) continue;
                if (!hasAlpha(x + dx, y + dy)) continue;
                var ni = ((y + dy) * width + (x + dx)) * 4;
                totalR += copy[ni];
                totalG += copy[ni + 1];
                totalB += copy[ni + 2];
                count++;
              }
            }
            if (count) {
              data[i] = Math.round(totalR / count);
              data[i + 1] = Math.round(totalG / count);
              data[i + 2] = Math.round(totalB / count);
            }
          }
        }
        ctx.putImageData(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(src);
      }
    };
    img.onerror = function() { resolve(src); };
    img.src = src;
  });
  detailImageCache.set(src, promise);
  return promise;
}

function setDetailImage(img, bird) {
  if (!img) return;
  var detailSrc = bird?.fallbackImage || bird?.image || "";
  img.onerror = () => {
    if (bird?.image && img.src !== bird.image) {
      img.src = bird.image;
    }
  };
  img.src = detailSrc;
  img.alt = bird ? `${bird.name}鸟签详情插画` : "";
  sanitizeTransparentEdge(detailSrc).then(function(cleanSrc) {
    if (state.detailBird?.id === bird?.id && cleanSrc) img.src = cleanSrc;
  });
}

function waitForImages(root) {
  var images = Array.from(root.querySelectorAll("img"));
  return Promise.all(images.map(function(img) {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(function(resolve) {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }));
}

function chooseRandomBird() {
  const index = Math.floor(Math.random() * state.birds.length);
  return state.birds[index];
}

function getStoredDailyBird() {
  const saved = parseJson(safeStorageGet(DAILY_KEY), null);
  if (!saved || saved.date !== todayKey()) return null;
  return state.birds.find((bird) => bird.id === saved.id) || null;
}

function loadUnlockedBirdIds() {
  const saved = parseJson(safeStorageGet(UNLOCKED_KEY), []);
  const entries = Array.isArray(saved) ? saved : [];
  const fallbackBaseTime = Date.now() - entries.length;

  state.unlockedBirdIds = new Set();
  state.unlockedBirdTimes = new Map();

  entries.forEach((entry, index) => {
    const id = typeof entry === "string" ? entry : entry?.id;
    if (!id) return;

    const unlockedAt =
      typeof entry === "object" && Number.isFinite(entry.unlockedAt)
        ? entry.unlockedAt
        : fallbackBaseTime + index;

    state.unlockedBirdIds.add(id);
    state.unlockedBirdTimes.set(id, unlockedAt);
  });
}

function saveUnlockedBirdIds() {
  const entries = [...state.unlockedBirdIds].map((id) => ({
    id,
    unlockedAt: state.unlockedBirdTimes.get(id) || Date.now()
  }));
  safeStorageSet(UNLOCKED_KEY, JSON.stringify(entries));
}

function unlockBird(bird) {
  if (!bird || state.unlockedBirdIds.has(bird.id)) return;
  state.unlockedBirdIds.add(bird.id);
  state.unlockedBirdTimes.set(bird.id, Date.now());
  saveUnlockedBirdIds();
}

function updateCallState() {
  document.querySelectorAll(".call-button").forEach((button) => {
    button.classList.toggle("playing", button.dataset.birdId === state.playingCallId);
  });
  updatePulseState();
}

async function playBirdCall(bird) {
  if (!bird?.call || !state.unlockedBirdIds.has(bird.id)) return;

  if (state.playingCallId === bird.id) {
    callAudio.pause();
    callAudio.currentTime = 0;
    state.playingCallId = null;
    updateCallState();
    return;
  }

  try {
    state.playingCallId = bird.id;
    updateCallState();
    callAudio.pause();
    callAudio.currentTime = 0;
    callAudio.src = bird.call;
    await callAudio.play();
  } catch {
    state.playingCallId = null;
    updateCallState();
    showToast(`${bird.name}的鸟鸣待补充`);
  }
}

function updateCallProgress() {
  document.querySelectorAll(".call-button").forEach(function(btn) {
    var ring = btn.querySelector(".call-ring-progress");
    if (!ring) return;
    var isActive = btn.dataset.birdId === state.playingCallId;
    if (isActive && callAudio.duration && !isNaN(callAudio.duration)) {
      var progress = callAudio.currentTime / callAudio.duration;
      var circumference = 2 * Math.PI * 16;
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = circumference * (1 - progress);
    } else {
      ring.style.strokeDasharray = "";
      ring.style.strokeDashoffset = "";
    }
  });
}

callAudio.addEventListener("ended", function() {
  state.playingCallId = null;
  updateCallState();
  updateCallProgress();
});

callAudio.addEventListener("timeupdate", updateCallProgress);

function renderActiveBird() {
  const bird = state.activeBird;

  els.drawCard.classList.toggle("revealed", state.revealed);
  els.drawCard.classList.toggle("unrevealed", !state.revealed);
  els.dailyStatus.textContent = state.revealed ? "今日已揭晓" : "轻点翻开";
  els.drawButton.textContent = state.revealed ? "已收录，查看图鉴" : "翻开今日鸟签";
  els.drawButton.disabled = false;

  var posterBtn = document.getElementById("share-poster-button");
  if (posterBtn) posterBtn.style.display = state.revealed ? "" : "none";
  renderDailyCountdown();

  if (!state.revealed || !bird) {
    els.activeBirdName.textContent = "鸟签待翻开";
    els.activeBirdLook.textContent = "先轻点翻开";
    renderActiveQuote("今日状态", "今天的鸟还在晨雾里，等你把它叫出来。");
    renderPoster(null);
    return;
  }

  setImage(els.activeBirdImage, bird, "鸟签插画");
  els.activeBirdName.textContent = bird.name;
  els.activeBirdLook.textContent = bird.look;
  var quoteParts = parseQuoteParts(bird.quote);
  renderActiveQuote(quoteParts.title, quoteParts.body);
  renderPoster(bird);
}

function renderActiveQuote(title, body) {
  if (!els.activeBirdQuote) return;
  els.activeBirdQuote.innerHTML = "";
  var titleEl = document.createElement("span");
  titleEl.className = "quote-title";
  titleEl.textContent = title || "今日状态";
  var bodyEl = document.createElement("span");
  bodyEl.className = "quote-body";
  bodyEl.textContent = body || "";
  els.activeBirdQuote.append(titleEl, bodyEl);
}

function renderPoster(bird) {
  els.posterDate.textContent = todayText();

  if (!bird || !state.revealed) {
    els.posterBirdImage.removeAttribute("src");
    els.posterBirdImage.alt = "";
    els.posterBirdName.textContent = "鸟签待翻开";
    els.posterBirdLook.textContent = "先翻开今日鸟签";
    renderPosterQuote("今日状态", "今天的鸟还在晨雾里。");
    return;
  }

  setImage(els.posterBirdImage, bird, "分享海报插画");
  els.posterBirdName.textContent = bird.name;
  els.posterBirdLook.textContent = bird.look;
  var quoteParts = parseQuoteParts(bird.quote);
  renderPosterQuote(quoteParts.title, quoteParts.body);
}

function renderPosterQuote(title, body) {
  if (!els.posterBirdQuote) return;
  els.posterBirdQuote.innerHTML = "";
  var titleEl = document.createElement("span");
  titleEl.className = "poster-quote-title";
  titleEl.textContent = title || "今日状态";
  var bodyEl = document.createElement("span");
  bodyEl.className = "poster-quote-body";
  bodyEl.textContent = body || "";
  els.posterBirdQuote.append(titleEl, bodyEl);
}

function renderProgress() {
  const count = state.unlockedBirdIds.size;
  const total = state.birds.length || 30;
  const percent = total ? Math.round((count / total) * 100) : 0;
  els.unlockCount.textContent = `${count} / ${total}`;
  els.guideCount.textContent = `${count}`;
  els.guideProgress.style.width = `${percent}%`;
}

function renderGrid() {
  var filteredBirds = state.birds.filter(function(bird) {
    var unlocked = state.unlockedBirdIds.has(bird.id);
    if (state.guideFilter === "unlocked") return unlocked;
    if (state.guideFilter === "locked") return !unlocked;
    if (state.guideFilter === "call") return unlocked && bird.call;
    return true;
  });
  const orderedBirds = [...filteredBirds].sort((a, b) => {
    const aUnlocked = state.unlockedBirdIds.has(a.id);
    const bUnlocked = state.unlockedBirdIds.has(b.id);

    if (aUnlocked && bUnlocked) {
      return (state.unlockedBirdTimes.get(b.id) || 0) - (state.unlockedBirdTimes.get(a.id) || 0);
    }

    if (aUnlocked) return -1;
    if (bUnlocked) return 1;
    return a.rank - b.rank;
  });

  els.birdGrid.innerHTML = orderedBirds
    .map((bird) => {
      const unlocked = state.unlockedBirdIds.has(bird.id);
      return `
        <article class="bird-tile ${unlocked ? "unlocked" : "locked"} ${bird.call && unlocked ? "has-call" : ""}" data-bird-id="${bird.id}">
          <div class="tile-topline">
            <span>${unlocked ? `No.${bird.rank}` : "未收录"}</span>
            ${
              bird.call && unlocked
                ? `<button class="call-button" type="button" data-bird-id="${bird.id}" aria-label="播放${bird.name}鸟鸣">
                    <svg class="call-ring" viewBox="0 0 36 36" aria-hidden="true">
                      <circle class="call-ring-bg" cx="18" cy="18" r="16" />
                      <circle class="call-ring-progress" cx="18" cy="18" r="16" />
                    </svg>
                    <svg class="call-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 9v6h4l5 4V5L8 9H4Z"></path>
                      <path d="M16 9.5c1.2 1.4 1.2 3.6 0 5"></path>
                      <path d="M18.5 7c2.4 2.9 2.4 7.1 0 10"></path>
                    </svg>
                  </button>`
                : ""
            }
          </div>
          <div class="tile-habitat">${unlocked ? bird.habitat : ""}</div>
          <div class="tile-art">
            <img src="${bird.image}" data-fallback="${bird.fallbackImage || ""}" alt="${unlocked ? `${bird.name}插画` : "未收录鸟类剪影"}" loading="lazy" decoding="async" />
          </div>
          <h2 class="tile-title">${unlocked ? bird.name : "栖息地剪影"}</h2>
          <p class="tile-look">${unlocked ? bird.look : "这只鸟还藏在晨雾里"}</p>
          <p class="tile-copy">${unlocked ? bird.quote : "继续翻鸟签，等它飞进鸟窝"}</p>
        </article>
      `;
    })
    .join("");
  updateCallState();
}

function renderRoute() {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `${state.currentScreen}-screen`);
  });
  document.body.classList.toggle("is-poster-screen", state.currentScreen === "poster");
  document.body.classList.toggle("is-home-revealed", state.currentScreen === "home" && state.revealed);
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.screen === state.currentScreen);
  });
}

function getScreenFromHash() {
  var route = location.hash.replace("#", "");
  return ["home", "nest", "poster"].includes(route) ? route : "home";
}

function renderAll() {
  renderActiveBird();
  renderProgress();
  renderGuideFilters();
  renderGrid();
  renderNfcSimulator();
  renderRoute();
}

function goScreen(screen) {
  if (!["home", "nest", "poster"].includes(screen)) return;
  closeBirdDetail();
  state.currentScreen = screen;
  location.hash = screen === "home" ? "" : screen;
  renderRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openBirdDetail(bird) {
  if (!bird || !state.unlockedBirdIds.has(bird.id)) return;
  state.detailBird = bird;
  renderDetailModal();
}

function closeBirdDetail() {
  state.detailBird = null;
  renderDetailModal();
}

function renderDetailModal() {
  var open = Boolean(state.detailBird);
  if (els.birdDetailModal) {
    els.birdDetailModal.classList.toggle("open", open);
    els.birdDetailModal.setAttribute("aria-hidden", open ? "false" : "true");
  }
  document.body.classList.toggle("has-modal", open);
  if (!open) {
    if (pulseViz) { pulseViz.pause(); }
    return;
  }
  var bird = state.detailBird;
  var quoteParts = parseQuoteParts(bird.quote);
  var conservation = bird.conservation || {};
  if (els.detailBirdRank) els.detailBirdRank.textContent = "No." + bird.rank;
  if (els.detailBirdHabitat) els.detailBirdHabitat.textContent = bird.habitat;
  setDetailImage(els.detailBirdImage, bird);
  if (els.detailBirdName) els.detailBirdName.textContent = bird.name;
  if (els.detailBirdLook) els.detailBirdLook.textContent = bird.look;
  if (els.detailQuoteTitle) els.detailQuoteTitle.textContent = quoteParts.title;
  if (els.detailBirdQuote) els.detailBirdQuote.textContent = quoteParts.body;
  if (els.detailBirdLine) els.detailBirdLine.textContent = bird.line || "";
  if (els.detailProtectionLevel) els.detailProtectionLevel.textContent = conservation.protectionLevel || "-";
  if (els.detailChinaPopulation) els.detailChinaPopulation.textContent = conservation.chinaPopulation || "-";
  if (els.detailIucnStatus) els.detailIucnStatus.textContent = conservation.iucn || "-";
  if (els.detailChinaStatus) {
    var status = conservation.chinaStatus || "-";
    els.detailChinaStatus.textContent = status;
    els.detailChinaStatus.className = "status-badge " + getConservationStatusClass(status);
  }
  updatePulseState();
}

function updatePulseState() {
  var btn = document.getElementById("detail-call-button");
  var playIcon = btn ? btn.querySelector(".pulse-play-icon") : null;
  var pauseIcon = btn ? btn.querySelector(".pulse-pause-icon") : null;
  var label = document.getElementById("pulse-label");
  var isPlayingThis = state.playingCallId && state.detailBird && state.playingCallId === state.detailBird.id;
  if (btn) btn.classList.toggle("is-playing", isPlayingThis);
  if (playIcon) playIcon.style.display = isPlayingThis ? "none" : "";
  if (pauseIcon) pauseIcon.style.display = isPlayingThis ? "" : "none";
  if (label) label.classList.toggle("hidden", isPlayingThis);
  if (pulseViz) {
    if (isPlayingThis) pulseViz.start(callAudio);
    else pulseViz.startIdle();
  }
}

function cloneCanvasPixels(sourceCanvas, targetCanvas) {
  if (!sourceCanvas || !targetCanvas) return;
  targetCanvas.width = sourceCanvas.width;
  targetCanvas.height = sourceCanvas.height;
  targetCanvas.style.width = sourceCanvas.clientWidth + "px";
  targetCanvas.style.height = sourceCanvas.clientHeight + "px";
  var ctx = targetCanvas.getContext("2d");
  if (ctx) ctx.drawImage(sourceCanvas, 0, 0);
}

function createDetailExportNode(sheet) {
  var clone = sheet.cloneNode(true);
  clone.classList.add("detail-export-sheet");
  clone.querySelector(".detail-close")?.remove();
  clone.querySelector("#detail-shot-button")?.remove();

  var sourceCanvas = sheet.querySelector("#pulse-canvas");
  var targetCanvas = clone.querySelector("#pulse-canvas");
  cloneCanvasPixels(sourceCanvas, targetCanvas);

  clone.querySelectorAll("[id]").forEach(function(node) {
    node.removeAttribute("id");
  });

  var rect = sheet.getBoundingClientRect();
  var exportWrap = document.createElement("div");
  exportWrap.className = "detail-export-wrap";
  exportWrap.style.width = Math.ceil(rect.width) + "px";
  exportWrap.appendChild(clone);
  document.body.appendChild(exportWrap);
  return { wrap: exportWrap, sheet: clone };
}

function drawBird() {
  if (state.revealed) {
    goScreen("nest");
    return;
  }

  els.drawCard.classList.add("is-drawing");
  window.setTimeout(() => {
    state.activeBird = chooseRandomBird();
    state.revealed = true;
    unlockBird(state.activeBird);
    safeStorageSet(DAILY_KEY, JSON.stringify({ date: todayKey(), id: state.activeBird.id }));
    renderAll();
    els.drawCard.classList.remove("is-drawing");
    showToast(`${state.activeBird.name}飞进了今天`);
  }, 520);
}

function resetPreviewState() {
  safeStorageRemove(DAILY_KEY);
  safeStorageRemove(UNLOCKED_KEY);
  state.activeBird = null;
  state.revealed = false;
  state.unlockedBirdIds = new Set();
  state.unlockedBirdTimes = new Map();
  state.playingCallId = null;
  callAudio.pause();
  callAudio.currentTime = 0;
  if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
  renderAll();
  goScreen("home");
  showToast("已回到未抽签预览状态");
}

function unlockAllBirds() {
  state.birds.forEach(function(bird) {
    if (!state.unlockedBirdIds.has(bird.id)) {
      state.unlockedBirdIds.add(bird.id);
      state.unlockedBirdTimes.set(bird.id, Date.now());
    }
  });
  saveUnlockedBirdIds();
  renderAll();
  showToast("已揭开全部 " + state.birds.length + " 只鸟");
}

function bindEvents() {
  els.drawButton.addEventListener("click", drawBird);
  els.dailyStatus.addEventListener("click", drawBird);
  els.drawCard.addEventListener("click", () => {
    if (!state.revealed) {
      drawBird();
    }
  });
  els.backHome.addEventListener("click", () => goScreen("home"));
  els.posterBackHome.addEventListener("click", () => goScreen("home"));
  els.savePoster.addEventListener("click", async function() {
    var card = document.querySelector(".poster-card");
    if (!card || typeof html2canvas === "undefined") {
      showToast("截图组件未加载，请手动截图");
      return;
    }
    var btn = els.savePoster;
    btn.disabled = true;
    btn.innerHTML = SAVE_ICON_HTML.replace("保存到相册", "生成中…");
    try {
      var canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f4f4e7",
        borderRadius: 30
      });
      var blob = await new Promise(function(resolve) {
        canvas.toBlob(resolve, "image/png", 1.0);
      });
      if (!blob) throw new Error("toBlob failed");
      var file = new File([blob], "bird-sign-" + new Date().toISOString().slice(0, 10) + ".png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "今日鸟签" });
        showToast("已准备好分享");
      } else {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("图片已保存");
      }
    } catch (e) {
      if (e.name !== "AbortError") showToast("生成失败，请手动截图");
    } finally {
      btn.disabled = false;
      btn.innerHTML = SAVE_ICON_HTML;
    }
  });
  els.resetPreviewButton.addEventListener("click", resetPreviewState);

  var unlockAllBtn = document.getElementById("unlock-all-button");
  if (unlockAllBtn) unlockAllBtn.addEventListener("click", unlockAllBirds);

  var posterBtn = document.getElementById("share-poster-button");
  if (posterBtn) posterBtn.addEventListener("click", function() { goScreen("poster"); });

  var guideFilters = document.getElementById("guide-filters");
  if (guideFilters) guideFilters.addEventListener("click", function(event) {
    var btn = event.target.closest(".filter-btn");
    if (!btn) return;
    state.guideFilter = btn.dataset.filter || "all";
    renderGuideFilters();
    renderGrid();
  });

  var nfcSimBtn = document.getElementById("nfc-sim-button");
  if (nfcSimBtn) nfcSimBtn.addEventListener("click", function() {
    var input = document.getElementById("nfc-sim-input");
    if (input && input.value.trim()) {
      var tag = input.value.trim();
      location.href = "?tag=" + encodeURIComponent(tag);
    }
  });
  els.birdGrid.addEventListener("click", (event) => {
    var callBtn = event.target.closest(".call-button");
    if (callBtn) {
      var bird = state.birds.find(function(item) { return item.id === callBtn.dataset.birdId; });
      playBirdCall(bird);
      return;
    }
    var tile = event.target.closest(".bird-tile");
    if (!tile) return;
    var bird = state.birds.find(function(item) { return item.id === tile.dataset.birdId; });
    if (!bird) return;
    if (!state.unlockedBirdIds.has(bird.id)) { showToast("这只鸟还没有收集到"); return; }
    openBirdDetail(bird);
  });
  els.birdGrid.addEventListener(
    "error",
    (event) => {
      const img = event.target.closest("img[data-fallback]");
      if (!img?.dataset.fallback || img.src.endsWith(img.dataset.fallback)) return;
      img.src = img.dataset.fallback;
    },
    true
  );
  if (els.detailClose) els.detailClose.addEventListener("click", closeBirdDetail);
  if (els.birdDetailBackdrop) els.birdDetailBackdrop.addEventListener("click", closeBirdDetail);
  if (els.detailShotButton) els.detailShotButton.addEventListener("click", async function() {
    var sheet = document.querySelector(".detail-sheet");
    if (!sheet || typeof html2canvas === "undefined") {
      showToast("截图组件未加载，请手动截图");
      return;
    }
    var btn = els.detailShotButton;
    btn.disabled = true;
    var exportNode = null;
    try {
      exportNode = createDetailExportNode(sheet);
      await waitForImages(exportNode.sheet);
      void exportNode.sheet.offsetHeight;
      btn.innerHTML = '<span>生成中…</span>';
      var canvas = await html2canvas(exportNode.sheet, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fbfbf3",
        width: exportNode.sheet.offsetWidth,
        height: exportNode.sheet.offsetHeight,
        windowWidth: exportNode.sheet.scrollWidth,
        windowHeight: exportNode.sheet.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });
      var blob = await new Promise(function(resolve) {
        canvas.toBlob(resolve, "image/png", 1.0);
      });
      if (!blob) throw new Error("toBlob failed");
      var bird = state.detailBird;
      var name = bird ? bird.name : "bird";
      var file = new File([blob], "bird-sign-" + name + "-" + new Date().toISOString().slice(0, 10) + ".png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "今日鸟签" });
        showToast("已准备好分享");
      } else {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("图片已保存");
      }
    } catch (e) {
      if (e.name !== "AbortError") showToast("生成失败，请手动截图");
    } finally {
      if (exportNode?.wrap) exportNode.wrap.remove();
      btn.disabled = false;
      btn.innerHTML = SAVE_ICON_HTML;
    }
  });
  if (els.detailCallButton) els.detailCallButton.addEventListener("click", function() {
    if (!state.detailBird) return;
    playBirdCall(state.detailBird);
  });
  var pulseCanvas = document.getElementById("pulse-canvas");
  if (pulseCanvas) pulseViz = new PulseVisualizer(pulseCanvas);
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => goScreen(tab.dataset.screen));
  });
  window.addEventListener("hashchange", () => {
    state.currentScreen = getScreenFromHash();
    renderRoute();
  });
}

function cacheElements() {
  Object.assign(els, {
    entryLabel: $("#entry-label"),
    todayText: $("#today-text"),
    dailyStatus: $("#daily-status"),
    drawCard: $("#draw-card"),
    activeBirdImage: $("#active-bird-image"),
    activeBirdName: $("#active-bird-name"),
    activeBirdLook: $("#active-bird-look"),
    activeBirdQuote: $("#active-bird-quote"),
    drawButton: $("#draw-button"),
    unlockCount: $("#unlock-count"),
    resetPreviewButton: $("#reset-preview-button"),
    backHome: $("#back-home"),
    guideCount: $("#guide-count"),
    guideProgress: $("#guide-progress"),
    birdGrid: $("#bird-grid"),
    posterBackHome: $("#poster-back-home"),
    posterDate: $("#poster-date"),
    posterBirdImage: $("#poster-bird-image"),
    posterBirdName: $("#poster-bird-name"),
    posterBirdLook: $("#poster-bird-look"),
    posterBirdQuote: $("#poster-bird-quote"),
    savePoster: $("#save-poster"),
    birdDetailModal: $("#bird-detail-modal"),
    birdDetailBackdrop: $("#bird-detail-backdrop"),
    detailClose: $("#detail-close"),
    detailBirdRank: $("#detail-bird-rank"),
    detailBirdHabitat: $("#detail-bird-habitat"),
    detailBirdImage: $("#detail-bird-image"),
    detailBirdName: $("#detail-bird-name"),
    detailBirdLook: $("#detail-bird-look"),
    detailQuoteTitle: $("#detail-quote-title"),
    detailBirdQuote: $("#detail-bird-quote"),
    detailCallButton: $("#detail-call-button"),
    detailShotButton: $("#detail-shot-button"),
    detailBirdLine: $("#detail-bird-line"),
    detailProtectionLevel: $("#detail-protection-level"),
    detailChinaPopulation: $("#detail-china-population"),
    detailIucnStatus: $("#detail-iucn-status"),
    detailChinaStatus: $("#detail-china-status"),
    toast: $("#toast")
  });
}

async function init() {
  cacheElements();
  document.body.classList.toggle("is-preview", isPreviewMode());
  els.todayText.textContent = todayText();

  state.birds = (await loadBirds()).map(withBirdMeta);
  loadUnlockedBirdIds();

  const storedBird = getStoredDailyBird();
  if (storedBird) {
    state.activeBird = storedBird;
    state.revealed = true;
    unlockBird(storedBird);
  }

  state.currentScreen = getScreenFromHash();

  const url = new URL(location.href);
  const tag = url.searchParams.get("tag") || url.pathname.match(/\/nfc\/([^/]+)/)?.[1] || (location.hash.match(/#\/nfc\/([^/]+)/) || location.hash.match(/#nfc\/([^/]+)/) || [])[1];
  if (tag) {
    els.entryLabel.textContent = `NFC 已唤醒 · ${tag}`;
  }

  renderAll();
  bindEvents();
  startCountdownTimer();
}

init().catch((error) => {
  document.body.innerHTML = `
    <main class="app-shell">
      <section class="error-state">
        <p class="eyebrow">页面加载失败</p>
        <h1>鸟签暂时没有落地</h1>
        <p>${error.message}</p>
      </section>
    </main>
  `;
});
