const DAILY_KEY = "dailyBirdSign";
const UNLOCKED_KEY = "unlockedBirdIds";
const VISITOR_KEY = "birdSignVisitorId";
const RECOVERY_CODE_KEY = "birdSignRecoveryCode";
const DAILY_DRAWS_KEY = "birdSignDailyDraws";
const AMBIENT_AUDIO_SRC = "/assets/audio/ambient-rain-birds.mp3";
const BACKGROUND_PREVIEWS = {
  "1": "./assets/backgrounds/forest-bg-option-1.jpg",
  "2": "./assets/backgrounds/forest-bg-option-2.jpg",
  "3": "./assets/backgrounds/forest-bg-option-3.jpg",
  "4": "./assets/backgrounds/forest-bg-option-4.jpg",
  "5": "./assets/backgrounds/forest-bg-option-5.jpg",
  "6": "./assets/backgrounds/forest-bg-option-6.jpg"
};

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
  countdownTimer: null,
  visitorId: null,
  recoveryCode: null,
  dailyDraws: {},
  progressSyncAvailable: true,
  progressSyncing: false,
  ambientPlaying: false,
  ambientUserPaused: false
};

const els = {};
const embeddedBirds = Array.isArray(window.BIRD_SIGN_DATA) ? window.BIRD_SIGN_DATA : [];
// All birds have audio files — no callBirdIds filter needed.

const callAudio = new Audio();
let ambientAudio = null;
let pulseViz = null;
let toastTimer = null;
let deferredInstallPrompt = null;
let guideGridRendered = false;
const detailImageCache = new Map();
const SAVE_ICON_HTML = '<svg class="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>保存到相册</span>';
let html2CanvasPromise = null;
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

function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  if (!globalThis.AbortController) return fetch(url, options);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeout);
  });
}

function loadHtml2Canvas() {
  if (globalThis.html2canvas) return Promise.resolve(globalThis.html2canvas);
  if (html2CanvasPromise) return html2CanvasPromise;

  html2CanvasPromise = import("./assets/vendor/html2canvas.esm.js").then((module) => {
    const html2canvas = module.default || module.html2canvas;
    if (!html2canvas) throw new Error("html2canvas is unavailable");
    globalThis.html2canvas = html2canvas;
    return html2canvas;
  });

  return html2CanvasPromise;
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise(function(resolve, reject) {
    var timeout = window.setTimeout(function() {
      reject(new Error(message || "operation timed out"));
    }, timeoutMs);
    promise.then(function(value) {
      window.clearTimeout(timeout);
      resolve(value);
    }).catch(function(error) {
      window.clearTimeout(timeout);
      reject(error);
    });
  });
}

async function saveCanvasBlob(canvas, fileName, shareTitle) {
  var blob = await new Promise(function(resolve) {
    canvas.toBlob(resolve, "image/png", 1.0);
  });
  if (!blob) throw new Error("toBlob failed");

  var file = new File([blob], fileName, { type: "image/png" });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: shareTitle })
      .then(() => showToast("已准备好分享"))
      .catch(() => showToast("已取消分享"));
    showToast("已打开分享面板");
    return;
  }

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

function drawRoundRect(ctx, x, y, width, height, radius) {
  var r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  var words = String(text || "").split("");
  var line = "";
  var lines = [];
  words.forEach((char) => {
    var testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
      return;
    }
    line = testLine;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((item, index) => {
    ctx.fillText(item, x, y + index * lineHeight);
  });
  return Math.min(lines.length, maxLines) * lineHeight;
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCanvasTexture(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "rgba(125, 105, 61, 0.12)";
  ctx.lineWidth = 1;
  for (var x = 28; x < width; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 5, height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCanvasBirdImage(ctx, image, width, y, size) {
  if (!image) return;
  var imgX = (width - size) / 2;
  ctx.drawImage(image, imgX, y, size, size);
}

function drawPosterTexture(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "rgba(125, 105, 61, 0.14)";
  ctx.lineWidth = 1;
  for (var x = 14; x < width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x * 0.17) * 3, height);
    ctx.stroke();
  }
  ctx.restore();
}

async function createPosterShareCanvas(bird) {
  var canvas = document.createElement("canvas");
  var width = 796;
  var height = 1388;
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext("2d");
  var quote = parseQuoteParts(bird?.quote);
  var image = await loadCanvasImage(bird?.image);
  var xhsLogo = await loadCanvasImage("./assets/icons/xhs-logo-badge.png");

  var bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#fffdf0");
  bg.addColorStop(0.54, "#f4f3df");
  bg.addColorStop(1, "#ede8cc");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  drawPosterTexture(ctx, width, height);

  var topHalo = ctx.createRadialGradient(width / 2, 365, 40, width / 2, 365, 300);
  topHalo.addColorStop(0, "rgba(255,255,255,0.86)");
  topHalo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = topHalo;
  ctx.fillRect(0, 120, width, 650);

  ctx.textAlign = "left";
  ctx.fillStyle = "#9c2c22";
  ctx.font = "800 28px sans-serif";
  ctx.fillText("BIRD MOOD CLUB", 48, 94);
  ctx.fillStyle = "#5f6e64";
  ctx.font = "800 26px sans-serif";
  ctx.fillText(todayText(), 48, 143);

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#9c2c22";
  ctx.font = "950 96px sans-serif";
  ctx.fillText("今日鸟签", 210, 180);
  ctx.restore();

  drawCanvasBirdImage(ctx, image, width, 246, 600);

  ctx.textAlign = "center";
  ctx.fillStyle = "#142019";
  ctx.font = "950 62px sans-serif";
  ctx.fillText(bird?.name || "今日鸟签", width / 2, 858);
  ctx.fillStyle = "#2f6f45";
  ctx.font = "850 28px sans-serif";
  drawWrappedText(ctx, bird?.look || "", width / 2, 908, width - 150, 36, 2);

  var quoteX = 70;
  var quoteY = 956;
  var quoteW = width - 140;
  var quoteH = 235;
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  drawRoundRect(ctx, quoteX, quoteY, quoteW, quoteH, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(130,108,64,0.14)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#123225";
  ctx.font = "900 26px sans-serif";
  ctx.fillText(quote.title || "今日鸟签", width / 2, quoteY + 72);
  ctx.font = "900 36px sans-serif";
  drawWrappedText(ctx, quote.body || "", width / 2, quoteY + 123, quoteW - 90, 48, 2);

  ctx.strokeStyle = "rgba(130,108,64,0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(48, 1264);
  ctx.lineTo(width - 48, 1264);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#53655b";
  ctx.font = "850 28px sans-serif";
  ctx.fillText("NFC鸟签", 48, 1335);
  if (xhsLogo) {
    ctx.drawImage(xhsLogo, 205, 1294, 96, 48);
  }
  ctx.fillStyle = "#5b655f";
  ctx.font = "800 24px sans-serif";
  ctx.fillText("@JOYI BIRD", 318, 1334);
  ctx.textAlign = "start";

  return canvas;
}

function drawSoundOrb(ctx, cx, cy) {
  for (var i = 0; i < 112; i++) {
    var angle = (Math.PI * 2 * i) / 112;
    var inner = 96;
    var outer = 170 + 22 * Math.sin(i * 0.53);
    ctx.strokeStyle = i % 3 === 0 ? "rgba(118, 190, 94, 0.3)" : "rgba(90, 139, 116, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }
  var soundGradient = ctx.createRadialGradient(cx, cy, 12, cx, cy, 116);
  soundGradient.addColorStop(0, "rgba(178, 246, 119, 0.88)");
  soundGradient.addColorStop(0.52, "rgba(178, 246, 119, 0.42)");
  soundGradient.addColorStop(1, "rgba(178, 246, 119, 0.08)");
  ctx.fillStyle = soundGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, 106, 0, Math.PI * 2);
  ctx.fill();
}

async function createDetailShareCanvas(bird) {
  var canvas = document.createElement("canvas");
  var width = 900;
  var height = 2200;
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext("2d");
  var quote = parseQuoteParts(bird?.quote);
  var conservation = bird?.conservation || {};
  var image = await loadCanvasImage(bird?.image);

  var bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#fbfbf3");
  bg.addColorStop(0.45, "#f3f5e8");
  bg.addColorStop(1, "#edf5e7");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  drawCanvasTexture(ctx, width, height);

  var halo = ctx.createRadialGradient(width / 2, 250, 30, width / 2, 250, 310);
  halo.addColorStop(0, "rgba(255,255,255,0.82)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, 620);

  drawCanvasBirdImage(ctx, image, width, 70, 460);
  ctx.fillStyle = "rgba(18, 50, 37, 0.1)";
  drawRoundRect(ctx, 323, 487, 254, 24, 12);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#66756b";
  ctx.font = "800 24px sans-serif";
  ctx.fillText("NO." + (bird?.rank || ""), width / 2, 615);
  ctx.fillStyle = "#142019";
  ctx.font = "900 64px sans-serif";
  ctx.fillText(bird?.name || "今日鸟签", width / 2, 700);
  ctx.fillStyle = "#2f6f45";
  ctx.font = "850 28px sans-serif";
  drawWrappedText(ctx, bird?.look || "", width / 2, 755, width - 220, 36, 2);

  var quoteX = 110;
  var quoteY = 830;
  var quoteW = width - 220;
  var quoteH = 190;
  ctx.fillStyle = "rgba(255,255,255,0.64)";
  drawRoundRect(ctx, quoteX, quoteY, quoteW, quoteH, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(130,108,64,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(156, 44, 34, 0.56)";
  ctx.font = "850 18px sans-serif";
  ctx.fillText("JOYI BIRD", width / 2, quoteY + 48);
  ctx.fillStyle = "#123225";
  ctx.font = "900 32px sans-serif";
  ctx.fillText(quote.title || "今日鸟签", width / 2, quoteY + 94);
  ctx.fillStyle = "#263a2e";
  ctx.font = "850 31px sans-serif";
  drawWrappedText(ctx, quote.body || "", width / 2, quoteY + 142, quoteW - 90, 42, 2);

  var fileY = 1135;
  ctx.textAlign = "left";
  ctx.fillStyle = "#123225";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("鸟类档案", 110, fileY);
  ctx.textAlign = "right";
  ctx.fillStyle = "#66756b";
  ctx.font = "800 24px sans-serif";
  ctx.fillText("BIRD FILE", width - 110, fileY);

  var items = [
    ["保护级别", conservation.protectionLevel || "-"],
    ["中国数量", conservation.chinaPopulation || "-"],
    ["IUCN", conservation.iucn || "-"],
    ["状态", conservation.chinaStatus || "-"]
  ];
  var cardW = 320;
  var cardH = 126;
  var gap = 26;
  var gridX = 110;
  var gridY = fileY + 36;
  items.forEach(function(item, index) {
    var col = index % 2;
    var row = Math.floor(index / 2);
    var x = gridX + col * (cardW + gap);
    var y = gridY + row * (cardH + 24);
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    drawRoundRect(ctx, x, y, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(130,108,64,0.13)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#66756b";
    ctx.font = "800 22px sans-serif";
    ctx.fillText(item[0], x + cardW / 2, y + 45);
    ctx.fillStyle = "#123225";
    ctx.font = "900 32px sans-serif";
    drawWrappedText(ctx, item[1], x + cardW / 2, y + 88, cardW - 40, 34, 1);
  });

  var habitatY = gridY + cardH * 2 + 120;
  ctx.textAlign = "center";
  ctx.fillStyle = "#66756b";
  ctx.font = "800 23px sans-serif";
  ctx.fillText("栖息地", width / 2, habitatY);
  ctx.fillStyle = "#123225";
  ctx.font = "900 34px sans-serif";
  ctx.fillText(bird?.habitat || "-", width / 2, habitatY + 52);
  ctx.fillStyle = "#66756b";
  ctx.font = "750 27px sans-serif";
  drawWrappedText(ctx, bird?.line || "", width / 2, habitatY + 104, width - 230, 42, 3);

  var callY = habitatY + 260;
  ctx.textAlign = "left";
  ctx.fillStyle = "#123225";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("彩虹鸟鸣", 110, callY);
  ctx.textAlign = "right";
  ctx.fillStyle = "#66756b";
  ctx.font = "800 24px sans-serif";
  ctx.fillText("MORNING CALL", width - 110, callY);
  drawSoundOrb(ctx, width / 2, callY + 270);

  ctx.textAlign = "start";
  return canvas;
}

async function createShareFallbackCanvas(bird, mode = "poster") {
  var canvas = document.createElement("canvas");
  var width = 900;
  var height = mode === "detail" ? 2200 : 1280;
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext("2d");
  var quote = parseQuoteParts(bird?.quote);
  var image = await loadCanvasImage(bird?.image);
  var conservation = bird?.conservation || {};

  var gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#eef3df");
  gradient.addColorStop(1, "#d9d0aa");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 253, 242, 0.92)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#9c2c22";
  ctx.font = "800 30px sans-serif";
  ctx.fillText("BIRD MOOD CLUB", 118, 132);
  ctx.fillStyle = "#66756b";
  ctx.font = "700 26px sans-serif";
  ctx.fillText(todayText(), 118, 180);

  if (image) {
    var imgSize = mode === "detail" ? 380 : 430;
    var imgX = (width - imgSize) / 2;
    var imgY = mode === "detail" ? 220 : 260;
    ctx.drawImage(image, imgX, imgY, imgSize, imgSize);
  }

  var nameY = mode === "detail" ? 680 : 760;
  ctx.fillStyle = "#142019";
  ctx.font = "900 64px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(bird?.name || "今日鸟签", width / 2, nameY);
  ctx.fillStyle = "#2f6f45";
  ctx.font = "800 28px sans-serif";
  ctx.fillText(bird?.look || "今天的鸟还在晨雾里", width / 2, nameY + 58);

  ctx.fillStyle = "rgba(255,255,255,0.68)";
  drawRoundRect(ctx, 145, nameY + 95, width - 290, 190, 30);
  ctx.fill();
  ctx.fillStyle = "#123225";
  ctx.font = "900 28px sans-serif";
  ctx.fillText(quote.title || "今日鸟签", width / 2, nameY + 148);
  ctx.font = "800 34px sans-serif";
  drawWrappedText(ctx, quote.body || "", width / 2, nameY + 206, width - 360, 48, 3);

  if (mode === "detail") {
    var y = nameY + 340;
    ctx.textAlign = "left";
    ctx.fillStyle = "#123225";
    ctx.font = "900 28px sans-serif";
    ctx.fillText("鸟类档案", 118, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#66756b";
    ctx.font = "800 24px sans-serif";
    ctx.fillText("BIRD FILE", width - 118, y);

    var items = [
      ["保护级别", conservation.protectionLevel || "-"],
      ["中国数量", conservation.chinaPopulation || "-"],
      ["IUCN", conservation.iucn || "-"],
      ["状态", conservation.chinaStatus || "-"]
    ];
    var cardW = 295;
    var cardH = 110;
    var gap = 22;
    var startX = 118;
    var startY = y + 38;
    items.forEach(function(item, index) {
      var col = index % 2;
      var row = Math.floor(index / 2);
      var x = startX + col * (cardW + gap);
      var cy = startY + row * (cardH + 20);
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      drawRoundRect(ctx, x, cy, cardW, cardH, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(130,108,64,0.14)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#66756b";
      ctx.font = "800 22px sans-serif";
      ctx.fillText(item[0], x + cardW / 2, cy + 40);
      ctx.fillStyle = "#123225";
      ctx.font = "900 30px sans-serif";
      drawWrappedText(ctx, item[1], x + cardW / 2, cy + 78, cardW - 36, 32, 1);
    });

    var habitatY = startY + 2 * (cardH + 20) + 70;
    ctx.textAlign = "center";
    ctx.fillStyle = "#66756b";
    ctx.font = "800 22px sans-serif";
    ctx.fillText("栖息地", width / 2, habitatY);
    ctx.fillStyle = "#123225";
    ctx.font = "900 32px sans-serif";
    ctx.fillText(bird?.habitat || "林地花园", width / 2, habitatY + 48);
    ctx.fillStyle = "#66756b";
    ctx.font = "700 25px sans-serif";
    drawWrappedText(ctx, bird?.line || "", width / 2, habitatY + 94, width - 260, 40, 3);

    var callY = habitatY + 240;
    ctx.textAlign = "left";
    ctx.fillStyle = "#123225";
    ctx.font = "900 28px sans-serif";
    ctx.fillText("彩虹鸟鸣", 118, callY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#66756b";
    ctx.font = "800 24px sans-serif";
    ctx.fillText("MORNING CALL", width - 118, callY);

    var cx = width / 2;
    var cy = callY + 250;
    for (var i = 0; i < 96; i++) {
      var angle = (Math.PI * 2 * i) / 96;
      var inner = 98;
      var outer = 168 + 20 * Math.sin(i * 0.57);
      ctx.strokeStyle = i % 3 === 0 ? "rgba(118, 190, 94, 0.28)" : "rgba(90, 139, 116, 0.16)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }
    var soundGradient = ctx.createRadialGradient(cx, cy, 12, cx, cy, 112);
    soundGradient.addColorStop(0, "rgba(175, 244, 118, 0.86)");
    soundGradient.addColorStop(1, "rgba(175, 244, 118, 0.12)");
    ctx.fillStyle = soundGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 102, 0, Math.PI * 2);
    ctx.fill();
  }

  if (mode !== "detail") {
    ctx.strokeStyle = "rgba(130,108,64,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(118, height - 165);
    ctx.lineTo(width - 118, height - 165);
    ctx.stroke();
    ctx.fillStyle = "#53655b";
    ctx.font = "800 28px sans-serif";
    ctx.fillText("NFC鸟签", 118, height - 105);
    ctx.fillText("@JOYI BIRD", 360, height - 105);
  }
  ctx.textAlign = "start";

  return canvas;
}

function makeVisitorId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "visitor-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function getVisitorId() {
  var saved = safeStorageGet(VISITOR_KEY);
  if (saved) return saved;
  var visitorId = makeVisitorId();
  safeStorageSet(VISITOR_KEY, visitorId);
  return visitorId;
}

function loadDailyDraws() {
  state.dailyDraws = parseJson(safeStorageGet(DAILY_DRAWS_KEY), {});
  var savedDaily = parseJson(safeStorageGet(DAILY_KEY), null);
  if (savedDaily?.date && savedDaily?.id && !state.dailyDraws[savedDaily.date]) {
    state.dailyDraws[savedDaily.date] = savedDaily.id;
  }
}

function saveDailyDraws() {
  safeStorageSet(DAILY_DRAWS_KEY, JSON.stringify(state.dailyDraws));
}

function getUnlockedEntries() {
  return [...state.unlockedBirdIds].map((id) => ({
    id,
    unlockedAt: state.unlockedBirdTimes.get(id) || Date.now()
  }));
}

function applyProgress(progress) {
  if (!progress || typeof progress !== "object") return;
  if (progress.visitorId) {
    state.visitorId = progress.visitorId;
    safeStorageSet(VISITOR_KEY, progress.visitorId);
  }
  if (progress.recoveryCode) {
    state.recoveryCode = progress.recoveryCode;
    safeStorageSet(RECOVERY_CODE_KEY, progress.recoveryCode);
  }
  if (progress.dailyDraws && typeof progress.dailyDraws === "object") {
    state.dailyDraws = { ...state.dailyDraws, ...progress.dailyDraws };
    saveDailyDraws();
  }

  var entries = Array.isArray(progress.unlockedBirds) ? progress.unlockedBirds : [];
  entries.forEach((entry) => {
    var id = typeof entry === "string" ? entry : entry?.id;
    if (!id || !state.birds.some((bird) => bird.id === id)) return;
    var unlockedAt = Number.isFinite(entry?.unlockedAt) ? entry.unlockedAt : Date.now();
    var currentTime = state.unlockedBirdTimes.get(id);
    state.unlockedBirdIds.add(id);
    state.unlockedBirdTimes.set(id, currentTime ? Math.min(currentTime, unlockedAt) : unlockedAt);
  });
  saveUnlockedBirdIds();

  var todayBirdId = state.dailyDraws[todayKey()];
  var todayBird = todayBirdId ? state.birds.find((bird) => bird.id === todayBirdId) : null;
  if (todayBird) {
    state.activeBird = todayBird;
    state.revealed = true;
    safeStorageSet(DAILY_KEY, JSON.stringify({ date: todayKey(), id: todayBird.id }));
  }
}

async function fetchProgressByVisitor(retries = 1) {
  if (!state.visitorId || !state.progressSyncAvailable) return null;
  try {
    var response = await fetchWithTimeout("/api/progress?visitorId=" + encodeURIComponent(state.visitorId), {}, 9000);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Progress API unavailable");
    var payload = await response.json();
    return payload.progress || null;
  } catch {
    if (retries > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      return fetchProgressByVisitor(retries - 1);
    }
    state.progressSyncAvailable = false;
    return null;
  }
}

async function syncProgress(retries = 1) {
  if (!state.visitorId || !state.progressSyncAvailable || state.progressSyncing) return;
  state.progressSyncing = true;
  try {
    var response = await fetchWithTimeout("/api/progress", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        visitorId: state.visitorId,
        unlockedBirds: getUnlockedEntries(),
        dailyDraws: state.dailyDraws,
        lastDrawDate: Object.keys(state.dailyDraws).sort().slice(-1)[0] || null
      })
    }, 9000);
    if (!response.ok) throw new Error("Progress API unavailable");
    var payload = await response.json();
    applyProgress(payload.progress);
    renderProgressTools();
  } catch {
    state.progressSyncing = false;
    if (retries > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      return syncProgress(retries - 1);
    }
    state.progressSyncAvailable = false;
    renderProgressTools();
    return;
  } finally {
    state.progressSyncing = false;
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

function sortBirdsByRank(birds) {
  return [...birds].sort((a, b) => Number(a.rank) - Number(b.rank));
}

async function loadBirds() {
  if (embeddedBirds.length) return embeddedBirds;
  try {
    const response = await fetch("./assets/meta/birds.json");
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

function applyBackgroundPreview() {
  const bg = new URLSearchParams(location.search).get("bg");
  const imageUrl = BACKGROUND_PREVIEWS[bg];
  if (!imageUrl) return;
  document.documentElement.style.setProperty("--forest-bg-image", `url('${imageUrl}')`);
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

function updateAmbientUi() {
  if (!els.ambientToggle || !els.ambientStatus) return;
  els.ambientToggle.classList.toggle("is-playing", state.ambientPlaying);
  els.ambientToggle.setAttribute("aria-pressed", state.ambientPlaying ? "true" : "false");
  els.ambientStatus.textContent = state.ambientPlaying ? "轻音乐播放中" : "轻音乐待播放";
}

function getInstallGuide() {
  var ua = navigator.userAgent || "";
  var isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isWechat = /MicroMessenger/i.test(ua);
  var isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  if (isWechat) {
    return {
      note: "如果当前在微信里，请先点右上角“...”并选择在 Safari 中打开，再按步骤添加。",
      steps: [
        "点右上角“...”打开更多操作。",
        "选择“在 Safari 中打开”。",
        "在 Safari 底部点“分享”按钮。",
        "选择“添加到主屏幕”，确认后点“添加”。"
      ]
    };
  }

  if (isIos || isSafari) {
    return {
      note: "iPhone 需要你在系统面板里手动点“添加”，网页不能代替你完成最后一步。",
      steps: [
        "在 Safari 底部工具栏点“分享”按钮。",
        "选择“添加到主屏幕”。",
        "确认名称为“今日鸟签”，打开“作为网页 App”。",
        "点右上角“添加”，以后从桌面图标进入。"
      ]
    };
  }

  return {
    note: "如果浏览器没有弹出安装提示，请从浏览器菜单里找“添加到主屏幕”或“安装应用”。",
    steps: [
      "打开浏览器菜单或分享菜单。",
      "选择“添加到主屏幕”或“安装应用”。",
      "确认名称为“今日鸟签”。",
      "添加后从桌面图标进入。"
    ]
  };
}

function setInstallGuideContent() {
  if (!els.installSteps) return;
  var guide = getInstallGuide();
  els.installSteps.innerHTML = guide.steps.map(function(step, index) {
    return `<li><span>${index + 1}</span><p>${step}</p></li>`;
  }).join("");
  if (els.installBrowserNote) {
    els.installBrowserNote.textContent = deferredInstallPrompt
      ? "当前浏览器支持安装提示，也可以点“让浏览器添加”并在系统弹窗中确认。"
      : guide.note;
  }
  if (els.installNativeButton) els.installNativeButton.hidden = !deferredInstallPrompt;
}

function toggleInstallGuide(open) {
  if (!els.installModal) return;
  if (open) setInstallGuideContent();
  els.installModal.classList.toggle("open", open);
  els.installModal.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("has-modal", open || document.body.classList.contains("has-detail-modal"));
}

async function handleInstallTip() {
  toggleInstallGuide(true);
}

async function handleNativeInstall() {
  if (deferredInstallPrompt) {
    var promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    promptEvent.prompt();
    var choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") {
      toggleInstallGuide(false);
      showToast("已开始添加到主屏幕");
      return;
    }
    setInstallGuideContent();
    return;
  }
  toggleInstallGuide(true);
}

function runAfterFirstPaint(callback, delay = 900) {
  window.setTimeout(function() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: 2200 });
      return;
    }
    callback();
  }, delay);
}

async function startAmbientMusic(fromGesture = false) {
  if (state.ambientUserPaused || !els.ambientToggle) return;
  try {
    if (!ambientAudio) {
      ambientAudio = new Audio(AMBIENT_AUDIO_SRC);
      ambientAudio.loop = true;
      ambientAudio.preload = "none";
      ambientAudio.volume = 0.42;
    }
    await ambientAudio.play();
    if (!state.ambientPlaying) {
      state.ambientPlaying = true;
      updateAmbientUi();
      if (fromGesture) showToast("轻音乐已开启");
    }
  } catch {
    state.ambientPlaying = false;
    updateAmbientUi();
  }
}

function stopAmbientMusic(userPaused = false) {
  state.ambientUserPaused = userPaused;
  state.ambientPlaying = false;
  if (ambientAudio) ambientAudio.pause();
  updateAmbientUi();
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
  var detailSrc = bird?.image || bird?.fallbackImage || "";
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

function waitForImages(root, timeoutMs = 2500) {
  var images = Array.from(root.querySelectorAll("img"));
  return Promise.all(images.map(function(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function(resolve) {
      var timeout = window.setTimeout(resolve, timeoutMs);
      var done = function() {
        window.clearTimeout(timeout);
        resolve();
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  }));
}

function chooseRandomBird() {
  const candidates = state.birds.filter((bird) => !state.unlockedBirdIds.has(bird.id));
  const pool = candidates.length ? candidates : state.birds;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

function getStoredDailyBird() {
  const saved = parseJson(safeStorageGet(DAILY_KEY), null);
  const today = todayKey();
  const id = state.dailyDraws[today] || (saved?.date === today ? saved.id : null);
  if (!id) return null;
  return state.birds.find((bird) => bird.id === id) || null;
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
  safeStorageSet(UNLOCKED_KEY, JSON.stringify(getUnlockedEntries()));
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
  const total = state.birds.length || 38;
  const percent = total ? Math.round((count / total) * 100) : 0;
  els.unlockCount.textContent = `${count} / ${total}`;
  els.guideCount.textContent = `${count}`;
  els.guideProgress.style.width = `${percent}%`;
  if (els.birdGrid) {
    els.birdGrid.setAttribute("aria-label", `${total} 只鸟图鉴`);
  }
}

function renderProgressTools() {
  const canUseCloudProgress = state.progressSyncAvailable;
  if (els.progressLabel) {
    els.progressLabel.textContent = canUseCloudProgress ? "云端记录" : "本地记录";
  }
  if (els.progressNote) {
    els.progressNote.textContent = canUseCloudProgress
      ? "每天固定一签，翻开过的鸟会自动收录。"
      : "每天固定一签，当前会先保存在这台设备。";
  }
}

function renderGrid() {
  var filteredBirds = state.birds.filter(function(bird) {
    var unlocked = state.unlockedBirdIds.has(bird.id);
    if (state.guideFilter === "unlocked") return unlocked;
    if (state.guideFilter === "locked") return !unlocked;
    if (state.guideFilter === "call") return unlocked && bird.call;
    return true;
  });
  const orderedBirds = sortBirdsByRank(filteredBirds);

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
            <img src="${bird.image}" data-fallback="${bird.fallbackImage || ""}" alt="${unlocked ? `${bird.name}插画` : "未收录鸟类剪影"}" loading="lazy" decoding="async" fetchpriority="low" />
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
  renderProgressTools();
  if (state.currentScreen === "nest" || guideGridRendered) {
    renderGuideFilters();
    renderGrid();
    guideGridRendered = true;
  }
  renderNfcSimulator();
  renderRoute();
}

function goScreen(screen) {
  if (!["home", "nest", "poster"].includes(screen)) return;
  closeBirdDetail();
  state.currentScreen = screen;
  location.hash = screen === "home" ? "" : screen;
  if (screen === "nest") {
    renderGuideFilters();
    renderGrid();
    guideGridRendered = true;
  }
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
  var exportWidth = Math.max(360, Math.min(430, Math.ceil(rect.width || 430)));
  var exportWrap = document.createElement("div");
  exportWrap.className = "detail-export-wrap";
  exportWrap.style.width = exportWidth + "px";
  exportWrap.appendChild(clone);
  document.body.appendChild(exportWrap);
  return { wrap: exportWrap, sheet: clone };
}

function createPosterExportNode(card) {
  var clone = card.cloneNode(true);
  clone.classList.add("poster-export-card");
  clone.querySelectorAll("[id]").forEach(function(node) {
    node.removeAttribute("id");
  });

  var rect = card.getBoundingClientRect();
  var exportWidth = Math.max(360, Math.min(420, Math.ceil(rect.width || 420)));
  var exportWrap = document.createElement("div");
  exportWrap.className = "poster-export-wrap";
  exportWrap.style.width = exportWidth + "px";
  exportWrap.appendChild(clone);
  document.body.appendChild(exportWrap);
  return { wrap: exportWrap, card: clone };
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
    state.dailyDraws[todayKey()] = state.activeBird.id;
    saveDailyDraws();
    safeStorageSet(DAILY_KEY, JSON.stringify({ date: todayKey(), id: state.activeBird.id }));
    syncProgress();
    renderAll();
    els.drawCard.classList.remove("is-drawing");
    showToast(`${state.activeBird.name}飞进了今天`);
  }, 520);
}

function resetPreviewState() {
  safeStorageRemove(DAILY_KEY);
  safeStorageRemove(UNLOCKED_KEY);
  safeStorageRemove(DAILY_DRAWS_KEY);
  state.activeBird = null;
  state.revealed = false;
  state.unlockedBirdIds = new Set();
  state.unlockedBirdTimes = new Map();
  state.dailyDraws = {};
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
  syncProgress();
  renderAll();
  showToast("已揭开全部 " + state.birds.length + " 只鸟");
}

async function savePosterImage() {
  if (!state.activeBird || !els.savePoster) {
    showToast("海报还没准备好");
    return;
  }

  var btn = els.savePoster;
  if (btn.disabled) return;
  btn.disabled = true;
  btn.innerHTML = SAVE_ICON_HTML.replace("保存到相册", "生成中…");

  try {
    var canvas = await createPosterShareCanvas(state.activeBird);
    await saveCanvasBlob(canvas, "bird-sign-" + new Date().toISOString().slice(0, 10) + ".png", "今日鸟签");
  } catch (e) {
    if (e.name !== "AbortError") {
      console.warn(e);
      try {
        var fallbackCanvas = await createShareFallbackCanvas(state.activeBird, "poster");
        await saveCanvasBlob(fallbackCanvas, "bird-sign-" + new Date().toISOString().slice(0, 10) + ".png", "今日鸟签");
      } catch {
        showToast("生成失败，请手动截图");
      }
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = SAVE_ICON_HTML;
  }
}

async function saveDetailImage() {
  if (!state.detailBird || !els.detailShotButton) {
    showToast("详情还没准备好");
    return;
  }

  var btn = els.detailShotButton;
  if (btn.disabled) return;
  btn.disabled = true;

  try {
    btn.innerHTML = '<span>生成中…</span>';
    var bird = state.detailBird;
    var canvas = await createDetailShareCanvas(bird);
    var name = bird ? bird.name : "bird";
    await saveCanvasBlob(canvas, "bird-sign-" + name + "-" + new Date().toISOString().slice(0, 10) + ".png", "今日鸟签");
  } catch (e) {
    if (e.name !== "AbortError") {
      console.warn(e);
      try {
        var fallbackBird = state.detailBird || state.activeBird;
        var fallbackCanvas = await createShareFallbackCanvas(fallbackBird, "detail");
        var fallbackName = fallbackBird ? fallbackBird.name : "bird";
        await saveCanvasBlob(fallbackCanvas, "bird-sign-" + fallbackName + "-" + new Date().toISOString().slice(0, 10) + ".png", "今日鸟签");
      } catch {
        showToast("生成失败，请手动截图");
      }
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = SAVE_ICON_HTML;
  }
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
  if (els.ambientToggle) els.ambientToggle.addEventListener("click", function() {
    if (state.ambientPlaying) {
      stopAmbientMusic(true);
      showToast("轻音乐已关闭");
      return;
    }
    state.ambientUserPaused = false;
    startAmbientMusic(true);
  });
  if (els.installTip) els.installTip.addEventListener("click", handleInstallTip);
  document.addEventListener("click", function(event) {
    if (event.target.closest("#install-tip")) handleInstallTip();
  });
  if (els.installNativeButton) els.installNativeButton.addEventListener("click", handleNativeInstall);
  if (els.installModalClose) els.installModalClose.addEventListener("click", function() { toggleInstallGuide(false); });
  if (els.installModalOk) els.installModalOk.addEventListener("click", function() { toggleInstallGuide(false); });
  if (els.installModal) els.installModal.addEventListener("click", function(event) {
    if (event.target === els.installModal) toggleInstallGuide(false);
  });
  if (els.savePoster) els.savePoster.addEventListener("click", savePosterImage);
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
  if (els.detailShotButton) els.detailShotButton.addEventListener("click", saveDetailImage);
  document.addEventListener("click", function(event) {
    if (event.target.closest("#save-poster")) savePosterImage();
    if (event.target.closest("#detail-shot-button")) saveDetailImage();
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
    ambientToggle: $("#ambient-toggle"),
    ambientStatus: $("#ambient-status"),
    drawCard: $("#draw-card"),
    activeBirdImage: $("#active-bird-image"),
    activeBirdName: $("#active-bird-name"),
    activeBirdLook: $("#active-bird-look"),
    activeBirdQuote: $("#active-bird-quote"),
    drawButton: $("#draw-button"),
    unlockCount: $("#unlock-count"),
    progressLabel: $("#progress-label"),
    progressNote: $("#progress-note"),
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
    installTip: $("#install-tip"),
    installModal: $("#install-modal"),
    installModalClose: $("#install-modal-close"),
    installModalOk: $("#install-modal-ok"),
    installNativeButton: $("#install-native-button"),
    installSteps: $("#install-steps"),
    installBrowserNote: $("#install-browser-note"),
    toast: $("#toast")
  });
}

async function init() {
  cacheElements();
  applyBackgroundPreview();
  document.body.classList.toggle("is-preview", isPreviewMode());
  els.todayText.textContent = todayText();

  state.birds = sortBirdsByRank((await loadBirds()).map(withBirdMeta));
  state.visitorId = getVisitorId();
  state.recoveryCode = safeStorageGet(RECOVERY_CODE_KEY);
  loadDailyDraws();
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
  updateAmbientUi();
  runAfterFirstPaint(function() {
    fetchProgressByVisitor().then((cloudProgress) => {
      if (!cloudProgress) return;
      applyProgress(cloudProgress);
      renderAll();
      syncProgress();
    });
    syncProgress();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

init().catch((error) => {
  document.body.innerHTML = `
    <main class="app-shell">
      <section class="error-state">
        <p class="eyebrow">页面加载失败</p>
        <h1>鸟签暂时没有落地</h1>
        <p>请刷新页面再试一次。</p>
      </section>
    </main>
  `;
});
