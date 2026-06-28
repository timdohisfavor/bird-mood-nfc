const { assetUrl, errorMessage, request } = require('../../utils/api');

function resolvePetImage(pet) {
  const localAsset = pet?.petAsset?.assetSet?.idle || pet?.petAsset?.home;
  if (localAsset) return localAsset;
  return assetUrl(pet?.bird?.image || pet?.bird?.fallbackImage);
}

function formatLastInteraction(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return sameDay ? `今天 ${time}` : `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

Page({
  data: {
    loading: true,
    pet: null,
    petImage: '',
    // V0.2 mood / bond / feather
    mood: 'quiet',
    moodText: '',
    moodLabel: '',
    moodStory: '',
    bondScore: 0,
    bondName: '刚认识',
    featherCount: 0,
    // daily care
    todayCare: { sign_opened: false, chat_done: false, care_done: false },
    todayEvent: null,
    todayNote: null,
    latestMemory: null,
    memoryCount: 0,
    lastInteractionText: '',
    recentVisits: [],
  },
  onShow() {
    this.loadHome();
  },
  async loadHome() {
    try {
      const res = await request('/api/pet/me');
      if (!res.pet || !res.pet.bird) {
        wx.showToast({ title: '请先唤醒小鸟', icon: 'none' });
        setTimeout(() => { wx.reLaunch({ url: '/pages/locked/index' }); }, 800);
        return;
      }
      this.setData({
        loading: false,
        pet: res.pet,
        petImage: resolvePetImage(res.pet),
        mood: res.mood || 'quiet',
        moodText: res.mood_text || '',
        moodLabel: res.mood_label || '安静',
        moodStory: res.mood_story || '',
        bondScore: res.bond_score || 0,
        bondName: res.bond_name || '刚认识',
        featherCount: res.feather_count || 0,
        todayCare: res.todayCare || { sign_opened: false, chat_done: false, care_done: false },
        todayEvent: res.todayEvent || null,
        todayNote: res.todayNote || null,
        latestMemory: res.latestMemory || null,
        memoryCount: (res.birdMemories || []).length,
        lastInteractionText: formatLastInteraction(res.last_interaction_at),
        recentVisits: res.recentVisits || [],
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: errorMessage(error, '读取主页失败'), icon: 'none' });
    }
  },
  goSign() {
    wx.navigateTo({ url: '/pages/sign/index' });
  },
  goChat() {
    wx.switchTab({ url: '/pages/chat/index' });
  },
  onPullDownRefresh() {
    this.loadHome().finally(() => { wx.stopPullDownRefresh(); });
  },
  onShareAppMessage() {
    const pet = this.data.pet;
    return {
      title: `${pet?.name || '我的小鸟'}邀请你来串门`,
      path: `/pages/visit/index?hostPetId=${pet?.id || ''}`,
    };
  },
});
