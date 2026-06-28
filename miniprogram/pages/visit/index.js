const { assetUrl, errorMessage, getStoredToken, request } = require('../../utils/api');

Page({
  data: {
    hostPetId: '',
    loading: true,
    isTabMode: false,
    hostPet: null,
    hostImage: '',
    result: null,
    loggedIn: false,
    errorText: '',
    pet: null,
    recentVisits: [],
  },

  onLoad(options) {
    const hostPetId = options.hostPetId || '';
    const hasToken = Boolean(getStoredToken());
    this.setData({ hostPetId, isTabMode: !hostPetId, loggedIn: hasToken });

    if (hostPetId) {
      this.loadVisit(hostPetId);
    } else {
      this.loadTabData();
    }
  },

  onShow() {
    // Refresh loggedIn status in case user logged in on another page
    if (!this.data.loggedIn && getStoredToken()) {
      this.setData({ loggedIn: true });
      if (this.data.hostPetId && !this.data.result) {
        this.recordVisit(this.data.hostPetId);
      }
    }
  },

  // ── Tab mode: load recent visits ──
  async loadTabData() {
    try {
      const res = await request('/api/pet/me');
      this.setData({
        loading: false,
        pet: res.pet,
        recentVisits: res.recentVisits || [],
      });
    } catch (error) {
      this.setData({
        loading: false,
        recentVisits: [],
      });
      // Tab mode is non-critical; just show empty state
    }
  },

  // ── Visit mode: load host pet + record visit ──
  async loadVisit(hostPetId) {
    try {
      const res = await request(`/api/share/pet?hostPetId=${hostPetId}`);
      const hostPet = res.hostPet;
      this.setData({
        loading: false,
        hostPet,
        hostImage: assetUrl(hostPet?.bird?.image || hostPet?.bird?.fallbackImage),
      });
      // Try to record the visit
      await this.recordVisit(hostPetId);
    } catch (error) {
      this.setData({
        loading: false,
        errorText: errorMessage(error, '找不到这只小鸟'),
      });
    }
  },

  async recordVisit(hostPetId) {
    if (!this.data.loggedIn) return;
    try {
      const res = await request('/api/share/visit', {
        method: 'POST',
        data: { hostPetId },
      });
      this.setData({ result: res });
    } catch (error) {
      this.setData({ errorText: errorMessage(error, '串门失败') });
    }
  },

  // ── Navigation ──
  goLogin() {
    wx.reLaunch({ url: '/pages/login/index' });
  },
  goRedeem() {
    wx.navigateTo({ url: '/pages/redeem/index' });
  },
  goHome() {
    wx.reLaunch({ url: '/pages/home/index' });
  },

  // ── Share ──
  onShareAppMessage() {
    const pet = this.data.pet || getApp().globalData.pet;
    return {
      title: (pet?.name || '我的小鸟') + '邀请你来串门',
      path: '/pages/visit/index?hostPetId=' + (pet?.id || ''),
    };
  },
});
