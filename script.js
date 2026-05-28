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
const callBirdIds = new Set(["sparrow", "egret", "zebra-dove", "moorhen", "white-headed-duck"]);
const habitatByBirdId = {
  sparrow: "城市与村落",
  egret: "湖泊浅滩",
  "zebra-dove": "城市绿地",
  moorhen: "湖泊海岸",
  "falco-subbuteo": "高楼峭壁",
  "long-tailed-tit": "林缘灌丛",
  "snowy-owl": "北方冻原",
  "red-billed-leiothrix": "开阔田野",
  "golden-eagle": "高山草原",
  "night-heron": "河岸湿地",
  swan: "湖泊湿地",
  blackbird: "林地公园",
  "white-headed-duck": "城市林缘",
  "large-billed-crow": "城市山林",
  "red-eared-bulbul": "灌丛果树",
  "scarlet-ibis": "稻田湿地",
  "red-headed-tit": "山地林缘",
  "silver-throated-tit": "山林灌丛",
  goshawk: "森林山地",
  "common-kingfisher": "溪流河岸",
  cockatoo: "林地树冠",
  "bee-eater": "林缘蜂巢",
  "dai-sheng": "草地林缘",
  "white-wagtail": "河岸地面",
  mallard: "湖泊河流",
  "red-tailed-shrike": "溪边岩地",
  sparrowhawk: "林地边缘",
  "spotted-owlet": "村落林地",
  "horned-lark": "开阔荒地",
  "brown-headed-bunting": "灌丛草地"
};

const callAudio = new Audio();
let toastTimer = null;

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
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
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

function withBirdMeta(bird) {
  return {
    ...bird,
    habitat: habitatByBirdId[bird.id] || "常见栖息地",
    call: callBirdIds.has(bird.id) ? `assets/bird-calls/${bird.id}.mp3` : ""
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
    { key: "locked", label: "未收录" },
    { key: "call", label: "有鸟鸣" }
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
}

async function playBirdCall(bird) {
  if (!bird?.call || !state.unlockedBirdIds.has(bird.id)) return;

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

callAudio.addEventListener("ended", () => {
  state.playingCallId = null;
  updateCallState();
});

function renderActiveBird() {
  const bird = state.activeBird;

  els.drawCard.classList.toggle("revealed", state.revealed);
  els.drawCard.classList.toggle("unrevealed", !state.revealed);
  els.dailyStatus.textContent = state.revealed ? "今日已揭晓" : "待翻开";
  els.drawButton.textContent = state.revealed ? "已收录，查看图鉴" : "翻开今日鸟签";
  els.drawButton.disabled = false;

  var posterBtn = document.getElementById("share-poster-button");
  if (posterBtn) posterBtn.style.display = state.revealed ? "" : "none";
  renderDailyCountdown();

  if (!state.revealed || !bird) {
    els.activeBirdName.textContent = "鸟签待翻开";
    els.activeBirdLook.textContent = "先轻点翻开";
    els.activeBirdQuote.textContent = "今天的鸟还在晨雾里，等你把它叫出来。";
    renderPoster(null);
    return;
  }

  setImage(els.activeBirdImage, bird, "鸟签插画");
  els.activeBirdName.textContent = bird.name;
  els.activeBirdLook.textContent = bird.look;
  els.activeBirdQuote.textContent = bird.quote;
  renderPoster(bird);
}

function renderPoster(bird) {
  els.posterDate.textContent = todayText();

  if (!bird || !state.revealed) {
    els.posterBirdImage.removeAttribute("src");
    els.posterBirdImage.alt = "";
    els.posterBirdName.textContent = "鸟签待翻开";
    els.posterBirdLook.textContent = "先翻开今日鸟签";
    els.posterBirdQuote.textContent = "今天的鸟还在晨雾里。";
    return;
  }

  setImage(els.posterBirdImage, bird, "分享海报插画");
  els.posterBirdName.textContent = bird.name;
  els.posterBirdLook.textContent = `No.${bird.rank} · ${bird.heat} · ${bird.look}`;
  els.posterBirdQuote.textContent = bird.quote;
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
            ${unlocked ? `<strong>${bird.habitat}</strong>` : ""}
          </div>
          ${
            bird.call && unlocked
              ? `<button class="call-button" type="button" data-bird-id="${bird.id}" aria-label="播放${bird.name}鸟鸣">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 9v6h4l5 4V5L8 9H4Z"></path>
                    <path d="M16 9.5c1.2 1.4 1.2 3.6 0 5"></path>
                    <path d="M18.5 7c2.4 2.9 2.4 7.1 0 10"></path>
                  </svg>
                </button>`
              : ""
          }
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
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.screen === state.currentScreen);
  });
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
  if (!["home", "nest"].includes(screen)) return;
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
  if (!open) return;
  var bird = state.detailBird;
  if (els.detailBirdRank) els.detailBirdRank.textContent = "No." + bird.rank;
  if (els.detailBirdHabitat) els.detailBirdHabitat.textContent = bird.habitat;
  if (els.detailBirdImage) { els.detailBirdImage.src = bird.image || ""; els.detailBirdImage.alt = bird.name + "鸟签详情插画"; }
  if (els.detailBirdName) els.detailBirdName.textContent = bird.name;
  if (els.detailBirdLook) els.detailBirdLook.textContent = bird.look;
  if (els.detailBirdQuote) els.detailBirdQuote.textContent = bird.quote;
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

function bindEvents() {
  els.drawButton.addEventListener("click", drawBird);
  els.drawCard.addEventListener("click", () => {
    if (!state.revealed) {
      drawBird();
    }
  });
  els.backHome.addEventListener("click", () => goScreen("home"));
  els.posterBackHome.addEventListener("click", () => goScreen("home"));
  els.savePoster.addEventListener("click", () => showToast("用系统截图保存这张海报"));
  els.resetPreviewButton.addEventListener("click", resetPreviewState);

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
  if (els.detailShotButton) els.detailShotButton.addEventListener("click", function() { showToast("用系统截图保存这张鸟签"); });
  if (els.detailCallButton) els.detailCallButton.addEventListener("click", function() {
    if (!state.detailBird) return;
    playBirdCall(state.detailBird);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => goScreen(tab.dataset.screen));
  });
  window.addEventListener("hashchange", () => {
    const route = location.hash.replace("#", "");
    state.currentScreen = route === "nest" ? "nest" : "home";
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
    detailBirdQuote: $("#detail-bird-quote"),
    detailCallButton: $("#detail-call-button"),
    detailShotButton: $("#detail-shot-button"),
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

  const route = location.hash.replace("#", "");
  state.currentScreen = route === "nest" ? "nest" : "home";

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
