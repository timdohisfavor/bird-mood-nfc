const rawBirds = [
  {
    id: "sparrow",
    rank: 1,
    name: "麻雀",
    heat: "8907万",
    rarity: "热榜 1",
    look: "褐背、黑喉、小圆身",
    palette: ["#8b6b45", "#d9c29e", "#2d2a24", "#c48a45", "#6d5639", "#f0dfc4"],
    featureClass: "sparrow small-bird streaked short-tail",
    line: "体型小，适应力强，常在城市和村落活动。",
    quote: "今天像麻雀：事很多，但每件都能啄两口。",
    fish: 3,
    social: 4,
    meeting: 2
  },
  {
    id: "egret",
    rank: 2,
    name: "大白鹭",
    heat: "6762万",
    rarity: "热榜 2",
    look: "白羽、黄嘴、黑脚",
    palette: ["#f8f7ef", "#ffffff", "#1f2020", "#d9b650", "#dbe9e8", "#f7f3e8"],
    featureClass: "egret wader long-neck long-leg",
    line: "常在浅水区缓步觅食，姿态轻盈优雅。",
    quote: "今天先站稳，再优雅处理所有乱流。",
    fish: 3,
    social: 2,
    meeting: 4
  },
  {
    id: "zebra-dove",
    rank: 3,
    name: "珠颈斑鸠",
    heat: "2828万",
    rarity: "热榜 3",
    look: "灰褐羽、珠点颈斑",
    palette: ["#9b8878", "#c9b8a6", "#2b2d2f", "#6f6258", "#efe1d0", "#ffffff"],
    featureClass: "dove speckled-neck rounded",
    line: "颈侧有黑底白点的珠状斑，鸣声低柔。",
    quote: "今天不急着解释，咕咕两声就算到位。",
    fish: 4,
    social: 2,
    meeting: 3
  },
  {
    id: "moorhen",
    rank: 4,
    name: "红嘴鸥",
    heat: "2364万",
    rarity: "热榜 4",
    look: "白灰羽、红嘴、红脚",
    palette: ["#f8f8f2", "#cfd5d9", "#1f2020", "#9f2a24", "#8c969d", "#ffffff"],
    featureClass: "gull waterbird red-bill red-leg",
    line: "常在海岸、湖泊和河流附近活动，白灰羽色与红嘴红脚很醒目。",
    quote: "今天适合顺风滑翔，别把小浪花都当成大风浪。",
    fish: 2,
    social: 3,
    meeting: 4
  },
  {
    id: "falco-subbuteo",
    rank: 5,
    name: "游隼",
    heat: "2237万",
    rarity: "热榜 5",
    look: "灰背、黑须纹、尖翼",
    palette: ["#55616c", "#d8d2c1", "#1e2328", "#f2b447", "#8b3f32", "#ffffff"],
    featureClass: "falcon raptor moustache pointed-wing",
    line: "高速飞行能力极强，常从高处俯冲捕猎。",
    quote: "今天别铺垫太久，瞄准重点直接俯冲。",
    fish: 1,
    social: 2,
    meeting: 5
  },
  {
    id: "long-tailed-tit",
    rank: 6,
    name: "北长尾山雀",
    heat: "1892万",
    rarity: "热榜 6",
    look: "白圆脸、粉褐身、超长尾",
    palette: ["#fff7ec", "#e8b7a6", "#1f2326", "#b86f79", "#6b5f5b", "#ffffff"],
    featureClass: "tit fluffy long-tail tiny",
    image: "/assets/birds/long-tailed-tit.png",
    line: "体型小而圆，尾巴细长，常成群穿梭枝间。",
    quote: "今天小小一只，但待办清单拖得很长。",
    fish: 4,
    social: 5,
    meeting: 1
  },
  {
    id: "snowy-owl",
    rank: 7,
    name: "雪鸮",
    heat: "1708万",
    rarity: "热榜 7",
    look: "白羽、金眼、黑斑",
    palette: ["#f4f1e8", "#ffffff", "#2d2d2d", "#e5b83e", "#bfc7c9", "#ffffff"],
    featureClass: "owl round-face spotted white-bird",
    line: "通体偏白，羽上有黑褐斑点，眼睛金黄。",
    quote: "今天看起来冷静，其实眼神已经把全场看穿。",
    fish: 3,
    social: 1,
    meeting: 4
  },
  {
    id: "red-billed-leiothrix",
    rank: 8,
    name: "红隼",
    heat: "1610万",
    rarity: "热榜 8",
    look: "栗背斑点、灰头、钩喙",
    palette: ["#b46b3c", "#d6b987", "#27313b", "#f0b13f", "#6e4a31", "#ffffff"],
    featureClass: "kestrel raptor spotted pointed-wing",
    line: "常悬停搜寻猎物，背部栗色并带黑色斑点。",
    quote: "今天先悬停观察，再决定值不值得出手。",
    fish: 2,
    social: 2,
    meeting: 4
  },
  {
    id: "golden-eagle",
    rank: 9,
    name: "金雕",
    heat: "1402万",
    rarity: "热榜 9",
    look: "深褐身、金色后颈、强钩喙",
    palette: ["#3a2d22", "#8f6a33", "#171717", "#d29c3e", "#5a4631", "#ffffff"],
    featureClass: "eagle raptor golden-nape broad-wing",
    line: "大型猛禽，后颈金褐色，飞行时翼展很有压迫感。",
    quote: "今天格局放大一点，别和地面小事缠斗。",
    fish: 1,
    social: 2,
    meeting: 5
  },
  {
    id: "night-heron",
    rank: 10,
    name: "夜鹭",
    heat: "1303万",
    rarity: "热榜 10",
    look: "黑冠、灰翼、白腹",
    palette: ["#20242a", "#8b97a1", "#f2efe5", "#27313a", "#d7c34a", "#ffffff"],
    featureClass: "heron night long-neck crest",
    line: "常在黄昏和夜间活动，黑色头冠很醒目。",
    quote: "今天适合夜间回血，白天先省点电。",
    fish: 4,
    social: 1,
    meeting: 3
  },
  {
    id: "swan",
    rank: 11,
    name: "白鹤",
    heat: "1095万",
    rarity: "热榜 11",
    look: "通体白、红脸、黑翼端",
    palette: ["#ffffff", "#f4f1e8", "#d43f35", "#1f2020", "#d7dde0", "#ffffff"],
    featureClass: "crane white-bird long-neck long-leg red-face",
    line: "大型涉禽，通体白色，面部裸露区域偏红。",
    quote: "今天不用急着证明，站在那里就很有分量。",
    fish: 2,
    social: 2,
    meeting: 5
  },
  {
    id: "blackbird",
    rank: 12,
    name: "乌鸫",
    heat: "922万",
    rarity: "热榜 12",
    look: "黑羽、黄嘴、黄眼圈",
    palette: ["#1b1d22", "#2f3138", "#111111", "#f2b63d", "#4a4a4a", "#ffffff"],
    featureClass: "blackbird black-bird yellow-bill",
    line: "雄鸟通体黑色，黄色嘴和眼圈非常醒目。",
    quote: "今天低调到发亮，但重点一开口就很明显。",
    fish: 4,
    social: 1,
    meeting: 2
  },
  {
    id: "white-headed-duck",
    rank: 13,
    name: "白头鹎",
    heat: "750万",
    rarity: "热榜 13",
    look: "白头、黑脸、橄榄翼",
    palette: ["#8a7660", "#d8c7aa", "#171716", "#747447", "#4b512c", "#ffffff"],
    featureClass: "bulbul white-head black-mask olive-wing",
    line: "头顶白色、脸部黑色，背翼偏橄榄褐，常在树木和灌丛间活动。",
    quote: "今天脑袋很亮，别被嘈杂枝叶挡住判断。",
    fish: 5,
    social: 2,
    meeting: 1
  },
  {
    id: "large-billed-crow",
    rank: 14,
    name: "大嘴乌鸦",
    heat: "690万",
    rarity: "热榜 14",
    look: "黑羽、厚重大嘴、强壮体型",
    palette: ["#151515", "#2d2d2d", "#080808", "#1b1b1b", "#3a3a3a", "#ffffff"],
    featureClass: "crow black-bird thick-beak huge-bill",
    line: "全身乌黑，嘴形比普通乌鸦更厚重有力。",
    quote: "今天气场很足，少说也像已经发表意见。",
    fish: 2,
    social: 5,
    meeting: 3
  },
  {
    id: "red-eared-bulbul",
    rank: 15,
    name: "红耳鹎",
    heat: "452万",
    rarity: "热榜 15",
    look: "黑冠、白脸、红耳斑",
    palette: ["#2a2b2c", "#f4eee0", "#d94a45", "#8b7c6a", "#ffffff", "#ffffff"],
    featureClass: "bulbul crest red-ear white-cheek",
    line: "头顶有黑色冠羽，耳侧红斑非常醒目。",
    quote: "今天把情绪挂在耳边，但不必谁都解释。",
    fish: 3,
    social: 4,
    meeting: 2
  },
  {
    id: "scarlet-ibis",
    rank: 16,
    name: "朱鹮",
    heat: "644万",
    rarity: "热榜 16",
    look: "粉白翼、红脸、弯长嘴",
    palette: ["#f8ddd6", "#ffffff", "#d94a45", "#1f2020", "#e6a3a0", "#ffffff"],
    featureClass: "ibis long-bill red-face long-leg",
    line: "羽色淡粉，脸部红色，长而下弯的嘴适合觅食。",
    quote: "今天温柔一点，但边界要像长嘴一样清楚。",
    fish: 3,
    social: 2,
    meeting: 4
  },
  {
    id: "red-headed-tit",
    rank: 17,
    name: "红头长尾山雀",
    heat: "310万",
    rarity: "热榜 17",
    look: "红褐头、白脸、长尾",
    palette: ["#b95d38", "#f6efe4", "#1f2326", "#d8b09d", "#6b5f5b", "#ffffff"],
    featureClass: "tit red-head long-tail tiny",
    image: "/assets/birds/red-headed-tit.png",
    line: "头部红褐，体型小巧，长尾让轮廓很灵动。",
    quote: "今天脑袋很热，但行动可以轻一点。",
    fish: 4,
    social: 5,
    meeting: 1
  },
  {
    id: "silver-throated-tit",
    rank: 18,
    name: "银喉长尾山雀",
    heat: "302万",
    rarity: "热榜 18",
    look: "银白喉、黑眉、长尾",
    palette: ["#f3f0e8", "#c9c9c2", "#1f2326", "#b58f78", "#6b5f5b", "#ffffff"],
    featureClass: "tit silver-throat long-tail tiny",
    image: "/assets/birds/tit-front.png",
    line: "喉部银白，头侧线条清晰，尾巴细长。",
    quote: "今天保持清爽，不把别人的混乱背上身。",
    fish: 4,
    social: 4,
    meeting: 2
  },
  {
    id: "goshawk",
    rank: 19,
    name: "苍鹰",
    heat: "279万",
    rarity: "热榜 19",
    look: "灰背、白眉、横斑腹",
    palette: ["#5f6b73", "#e7dfcf", "#1f252a", "#d6aa45", "#8d7d6d", "#ffffff"],
    featureClass: "hawk raptor barred-belly white-brow",
    line: "森林型猛禽，目光锐利，腹部常见细密横斑。",
    quote: "今天别被噪音带跑，盯住真正会动的目标。",
    fish: 1,
    social: 2,
    meeting: 5
  },
  {
    id: "common-kingfisher",
    rank: 20,
    name: "普通翠鸟",
    heat: "275万",
    rarity: "热榜 20",
    look: "蓝绿背、橙腹、长直嘴",
    palette: ["#147f9f", "#f08a36", "#202023", "#0f5f7e", "#ffffff", "#ffffff"],
    featureClass: "kingfisher bright long-bill short-tail",
    image: "/assets/birds/common-kingfisher-side.png",
    line: "背部蓝绿、腹部橙色，常停在水边等待俯冲。",
    quote: "今天别什么都管，选一个水面，扎进去。",
    fish: 2,
    social: 3,
    meeting: 1
  },
  {
    id: "cockatoo",
    rank: 21,
    name: "白鹦鹉",
    heat: "229万",
    rarity: "热榜 21",
    look: "白羽、黄冠、弯喙",
    palette: ["#ffffff", "#f3efdf", "#202023", "#f0c84b", "#d8d8d0", "#ffffff"],
    featureClass: "parrot crest yellow-crest curved-beak white-bird",
    line: "常见白色鹦鹉形象，头顶冠羽会竖起。",
    quote: "今天可以高调一点，但别把音量开满。",
    fish: 2,
    social: 5,
    meeting: 2
  },
  {
    id: "bee-eater",
    rank: 22,
    name: "凤头蜂鹰",
    heat: "217万",
    rarity: "热榜 22",
    look: "褐身、短冠、宽翼",
    palette: ["#7a5b3c", "#d8c0a4", "#2b2b2b", "#c28b45", "#594633", "#ffffff"],
    featureClass: "honey-buzzard raptor crest broad-wing",
    line: "头部可见短冠羽，常以蜂类和蜂巢为食。",
    quote: "今天绕开刺人的话题，专心取甜头。",
    fish: 2,
    social: 2,
    meeting: 4
  },
  {
    id: "dai-sheng",
    rank: 23,
    name: "戴胜",
    heat: "176万",
    rarity: "热榜 23",
    look: "橙冠、黑白翼、长弯嘴",
    palette: ["#d89345", "#f3c17b", "#161616", "#ffffff", "#5a3724", "#ffffff"],
    featureClass: "hoopoe tall-crest striped-wing long-bill",
    line: "头顶扇形冠羽，翅膀黑白横纹，非常有辨识度。",
    quote: "今天发型先赢，气势就不会输。",
    fish: 3,
    social: 4,
    meeting: 3
  },
  {
    id: "white-wagtail",
    rank: 24,
    name: "白鹡鸰",
    heat: "165万",
    rarity: "热榜 24",
    look: "黑白身、细长尾、爱摆尾",
    palette: ["#1f2020", "#ffffff", "#2d2d2d", "#d3a64b", "#707070", "#ffffff"],
    featureClass: "wagtail black-white long-tail slender",
    line: "黑白配色清爽，常在地面快速行走并摆动尾巴。",
    quote: "今天脚步轻一点，情绪也跟着摆过去。",
    fish: 3,
    social: 3,
    meeting: 2
  },
  {
    id: "mallard",
    rank: 25,
    name: "赤麻鸭",
    heat: "116万",
    rarity: "热榜 25",
    look: "橙褐身、浅色头、水鸟身形",
    palette: ["#c9783f", "#f1d6a8", "#2d2d2d", "#6b4d37", "#ffffff", "#ffffff"],
    featureClass: "duck ruddy waterbird",
    line: "全身多为橙褐色，常见于湖泊、河流和湿地。",
    quote: "今天适合顺水推舟，不适合硬拧方向。",
    fish: 5,
    social: 3,
    meeting: 1
  },
  {
    id: "red-tailed-shrike",
    rank: 26,
    name: "红尾水鸲",
    heat: "96万",
    rarity: "热榜 26",
    look: "蓝莓色身体、红橙尾",
    palette: ["#334f78", "#2f466d", "#182238", "#d05b37", "#243452", "#ffffff"],
    featureClass: "redstart red-tail small-bird white-wing",
    image: "/assets/birds/redstart-front.png",
    line: "常在溪流附近活动，蓝灰身体和红橙尾羽很醒目。",
    quote: "今天把不爽甩在身后，尾巴负责漂亮收场。",
    fish: 4,
    social: 2,
    meeting: 2
  },
  {
    id: "sparrowhawk",
    rank: 27,
    name: "雀鹰",
    heat: "93万",
    rarity: "热榜 27",
    look: "灰背、橙横斑腹、锐眼",
    palette: ["#69757d", "#d59a6b", "#20252a", "#d4a03d", "#8a7766", "#ffffff"],
    featureClass: "hawk raptor barred-belly sharp-eye",
    line: "体型较小的猛禽，飞行灵活，捕食小鸟。",
    quote: "今天小体量也能有强压迫感。",
    fish: 1,
    social: 2,
    meeting: 5
  },
  {
    id: "spotted-owlet",
    rank: 28,
    name: "斑头鸺鹠",
    heat: "83万",
    rarity: "热榜 28",
    look: "圆头、黄眼、白斑",
    palette: ["#6b5a44", "#d8c7a6", "#202023", "#e5b83e", "#ffffff", "#ffffff"],
    featureClass: "owl spotted round-face tiny",
    line: "小型鸮类，头部和背部有明显白色斑点。",
    quote: "今天小小一只，但观察力大到离谱。",
    fish: 3,
    social: 1,
    meeting: 4
  },
  {
    id: "horned-lark",
    rank: 29,
    name: "双角犀鸟",
    heat: "79万",
    rarity: "热榜 29",
    look: "巨大黄盔、黑白身、长喙",
    palette: ["#151515", "#ffffff", "#e7b93f", "#d27d2f", "#4b3628", "#ffffff"],
    featureClass: "hornbill huge-bill casque black-white",
    line: "大型犀鸟有显著盔突和巨大嘴形，轮廓非常戏剧化。",
    quote: "今天气场很大，进门之前存在感已经到了。",
    fish: 2,
    social: 4,
    meeting: 4
  },
  {
    id: "brown-headed-bunting",
    rank: 30,
    name: "棕头鸦雀",
    heat: "74万",
    rarity: "热榜 30",
    look: "棕红头翼、短粗喙、长尾",
    palette: ["#8f5b34", "#dbc19d", "#2d2a24", "#b9834b", "#6e5b48", "#ffffff"],
    featureClass: "bunting brown-head long-tail small-bird",
    line: "粉棕褐身体、棕红头翼和长尾，让它在灌丛间很有辨识度。",
    quote: "今天别太显眼，稳定输出也很可爱。",
    fish: 4,
    social: 3,
    meeting: 2
  }
];

function stars(value) {
  return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
}

function decorateBird(bird) {
  return {
    ...bird,
    image: `/assets/birds-final/${bird.id}.png`,
    birdStyle: `--bird-main:${bird.palette[0]}; --bird-belly:${bird.palette[1]}; --bird-dark:${bird.palette[2]}; --bird-accent:${bird.palette[3]}; --bird-wing:${bird.palette[4]}; --bird-light:${bird.palette[5]};`,
    fishText: stars(bird.fish),
    socialText: stars(bird.social),
    meetingText: stars(bird.meeting)
  };
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

Page({
  data: {
    currentScreen: "home",
    birds: rawBirds.map(decorateBird),
    homeBird: decorateBird(rawBirds[0]),
    activeBird: decorateBird(rawBirds[0]),
    bound: false,
    todayText: todayText(),
    collection: [],
    collectionCards: [],
    collectionCount: 0,
    progressPercent: 0
  },

  onLoad() {
    const birds = rawBirds.map(decorateBird);
    const bound = wx.getStorageSync("birdNfcBound") === true;
    const savedCollection = wx.getStorageSync("birdCollection");
    const collection = Array.isArray(savedCollection) ? savedCollection : [birds[0].id];
    const daily = wx.getStorageSync("dailyBird");
    let activeBird = birds[0];

    if (daily && daily.date === todayKey()) {
      activeBird = birds.find((bird) => bird.id === daily.id) || birds[0];
    }

    this.setData({ birds, homeBird: birds[0], activeBird, bound, collection }, () => {
      this.renderCollection();
    });
  },

  goScreen(event) {
    this.setData({
      currentScreen: event.currentTarget.dataset.screen
    });
  },

  bindStand() {
    wx.setStorageSync("birdNfcBound", true);
    this.setData({ bound: true });
    wx.showToast({
      title: "已绑定 NFC 支架",
      icon: "none"
    });
  },

  drawBird() {
    const { birds } = this.data;
    const activeBird = birds[Math.floor(Math.random() * birds.length)];
    wx.setStorageSync("dailyBird", {
      date: todayKey(),
      id: activeBird.id
    });
    this.setData({ activeBird }, () => {
      this.collectBird(activeBird.id, false);
    });
    wx.showToast({
      title: `${activeBird.name}飞进了今天`,
      icon: "none"
    });
  },

  collectActiveBird() {
    this.collectBird(this.data.activeBird.id, true);
  },

  collectBird(id, showTip) {
    const collection = Array.from(new Set([...this.data.collection, id]));
    wx.setStorageSync("birdCollection", collection);
    this.setData({ collection }, () => {
      this.renderCollection();
    });

    if (showTip) {
      wx.showToast({
        title: "已收进鸟窝",
        icon: "none"
      });
    }
  },

  renderCollection() {
    const collectionSet = new Set(this.data.collection);
    const collectionCards = this.data.birds.map((bird) => ({
      ...bird,
      unlocked: collectionSet.has(bird.id)
    }));
    const collectionCount = collectionSet.size;
    this.setData({
      collectionCards,
      collectionCount,
      progressPercent: Math.round((collectionCount / this.data.birds.length) * 100)
    });
  },

  selectBird(event) {
    const id = event.currentTarget.dataset.id;
    const activeBird = this.data.birds.find((bird) => bird.id === id);
    if (!activeBird) return;
    this.setData({
      activeBird,
      currentScreen: "home"
    });
  },

  savePoster() {
    wx.showToast({
      title: "后续接入海报生成",
      icon: "none"
    });
  }
});
