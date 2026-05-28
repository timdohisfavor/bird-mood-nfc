const state = {
  birds: [],
  homeBird: null,
  activeBird: null,
  revealed: false,
  currentScreen: "home",
  playingCallId: null
};

const els = {};
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
    // Local storage can be blocked in some embedded browsers; the page should still work.
  }
}

function withBirdCall(bird) {
  if (!bird.habitat) {
    throw new Error(`${bird.name} 缺少栖息地数据`);
  }

  return {
    ...bird,
    habitat: bird.habitat,
    call: bird.call || `assets/bird-calls/${bird.id}.mp3`
  };
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1800);
}

function updateCallState() {
  document.querySelectorAll(".call-button").forEach((button) => {
    button.classList.toggle("playing", button.dataset.birdId === state.playingCallId);
  });
  document.querySelectorAll(".call-enabled").forEach((node) => {
    node.classList.toggle("is-calling", node.dataset.birdId === state.playingCallId);
  });
}

async function playBirdCall(bird) {
  if (!bird?.call) return;

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

function getDailyBird() {
  const saved = safeStorageGet("dailyBirdSign");
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (parsed.date !== todayKey()) return null;
    return state.birds.find((bird) => bird.id === parsed.id) || null;
  } catch {
    return null;
  }
}

function chooseRandomBird() {
  const index = Math.floor(Math.random() * state.birds.length);
  return state.birds[index];
}

function setImage(img, bird, label) {
  img.src = bird.image;
  img.alt = `${bird.name}${label}`;
}

function renderHomeBird() {
  setImage(els.homeBirdImage, state.homeBird, "插画");
  els.homeBirdName.textContent = state.homeBird.name;
  els.homeBirdLine.textContent = state.homeBird.line;
  els.homeBirdButton.classList.toggle("call-enabled", Boolean(state.homeBird.call));
  els.homeBirdButton.dataset.birdId = state.homeBird.id;
  els.homeBirdButton.setAttribute("aria-label", state.homeBird.call ? `播放${state.homeBird.name}鸟鸣` : `${state.homeBird.name}插画`);
}

function renderActiveBird() {
  const bird = state.activeBird;
  setImage(els.activeBirdImage, bird, "鸟签插画");
  els.rarityPill.textContent = state.revealed ? bird.rarity : "待翻开";
  els.rankLabel.textContent = "栖息地";
  els.heatLabel.textContent = bird.habitat;
  els.activeBirdName.textContent = bird.name;
  els.activeBirdLook.textContent = bird.look;
  els.activeBirdQuote.textContent = bird.quote;
  els.fishMeter.textContent = bird.fishText;
  els.socialMeter.textContent = bird.socialText;
  els.meetingMeter.textContent = bird.meetingText;
  els.drawCard.classList.toggle("revealed", state.revealed);
  els.drawCard.classList.toggle("unrevealed", !state.revealed);
  els.drawCard.classList.toggle("call-enabled", state.revealed && Boolean(bird.call));
  els.drawCard.dataset.birdId = state.revealed ? bird.id : "";
  els.drawButton.textContent = state.revealed ? "再翻一张鸟签" : "翻开今日鸟签";
}

function renderGrid() {
  els.birdGrid.innerHTML = state.birds
    .map(
      (bird) => `
        <article class="bird-tile ${bird.call ? "has-call call-enabled" : ""}" data-bird-id="${bird.id}">
          <div class="tile-habitat">
            <span>栖息地</span>
            <strong>${bird.habitat}</strong>
          </div>
          ${
            bird.call
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
            <img src="${bird.image}" alt="${bird.name}插画" />
          </div>
          <h2 class="tile-title">${bird.name}</h2>
          <p class="tile-look">${bird.look}</p>
          <p class="tile-copy">${bird.quote}</p>
        </article>
      `
    )
    .join("");
}

function renderRoute() {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `${state.currentScreen}-screen`);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.screen === state.currentScreen);
  });
}

function goScreen(screen) {
  state.currentScreen = screen;
  location.hash = screen === "home" ? "" : screen;
  renderRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function drawBird() {
  els.drawCard.classList.add("is-drawing");
  window.setTimeout(() => {
    state.activeBird = chooseRandomBird();
    state.revealed = true;
    safeStorageSet("dailyBirdSign", JSON.stringify({ date: todayKey(), id: state.activeBird.id }));
    renderActiveBird();
    els.drawCard.classList.remove("is-drawing");
  }, 220);
}

function bindEvents() {
  els.drawButton.addEventListener("click", drawBird);
  els.drawCard.addEventListener("click", () => {
    if (!state.revealed) {
      drawBird();
      return;
    }
    playBirdCall(state.activeBird);
  });
  els.homeBirdButton.addEventListener("click", () => playBirdCall(state.homeBird));
  els.nestButton.addEventListener("click", () => goScreen("nest"));
  els.backHome.addEventListener("click", () => goScreen("home"));
  els.birdGrid.addEventListener("click", (event) => {
    const target = event.target.closest(".call-button, .tile-art");
    if (!target) return;

    const tile = event.target.closest(".bird-tile");
    const bird = state.birds.find((item) => item.id === tile?.dataset.birdId);
    playBirdCall(bird);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => goScreen(tab.dataset.screen));
  });
  window.addEventListener("hashchange", () => {
    state.currentScreen = location.hash.replace("#", "") === "nest" ? "nest" : "home";
    renderRoute();
  });
}

function cacheElements() {
  Object.assign(els, {
    entryLabel: $("#entry-label"),
    todayText: $("#today-text"),
    homeBirdImage: $("#home-bird-image"),
    homeBirdButton: $("#home-bird-button"),
    homeBirdName: $("#home-bird-name"),
    homeBirdLine: $("#home-bird-line"),
    rarityPill: $("#rarity-pill"),
    drawCard: $("#draw-card"),
    activeBirdImage: $("#active-bird-image"),
    rankLabel: $("#rank-label"),
    heatLabel: $("#heat-label"),
    activeBirdName: $("#active-bird-name"),
    activeBirdLook: $("#active-bird-look"),
    activeBirdQuote: $("#active-bird-quote"),
    fishMeter: $("#fish-meter"),
    socialMeter: $("#social-meter"),
    meetingMeter: $("#meeting-meter"),
    drawButton: $("#draw-button"),
    nestButton: $("#nest-button"),
    backHome: $("#back-home"),
    birdGrid: $("#bird-grid"),
    toast: $("#toast")
  });
}

async function init() {
  cacheElements();
  const response = await fetch("./assets/meta/birds.json");
  state.birds = (await response.json()).map(withBirdCall);
  state.homeBird = state.birds[0];
  state.activeBird = getDailyBird() || state.homeBird;
  state.revealed = Boolean(getDailyBird());
  state.currentScreen = location.hash.replace("#", "") === "nest" ? "nest" : "home";

  const url = new URL(location.href);
  const tag = url.searchParams.get("tag") || url.pathname.match(/\/nfc\/([^/]+)/)?.[1];
  if (tag) {
    els.entryLabel.textContent = `NFC 已唤醒 · ${tag}`;
  }

  els.todayText.textContent = todayText();
  renderHomeBird();
  renderActiveBird();
  renderGrid();
  renderRoute();
  bindEvents();
}

init().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><section class="draw-stage"><h1>页面加载失败</h1><p class="subcopy">${error.message}</p></section></main>`;
});
