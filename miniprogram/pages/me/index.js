const { assetUrl, errorMessage, request } = require('../../utils/api');

Page({
  data: {
    loading: true,
    user: null,
    pet: null,
    petImage: '',
    logoutVisible: false,
  },
  onShow() { this.loadMe(); },
  onPullDownRefresh() { this.loadMe().finally(() => wx.stopPullDownRefresh()); },
  async loadMe() {
    try {
      const res = await request('/api/me');
      const pet = res.pet || null;
      this.setData({
        loading: false,
        user: res.user || { nickname: '未知用户', openid: '' },
        pet,
        petImage: pet ? assetUrl(pet.bird?.image || pet.bird?.fallbackImage) : '',
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: errorMessage(error, '读取失败'), icon: 'none' });
    }
  },
  goEditPersona() { wx.navigateTo({ url: '/pages/awakening/index' }); },
  goRedeem() { wx.navigateTo({ url: '/pages/redeem/index' }); },
  logout() { this.setData({ logoutVisible: true }); },
  onLogoutConfirm() {
    wx.removeStorageSync('joyibird_token');
    getApp().globalData.token = '';
    getApp().globalData.user = null;
    getApp().globalData.pet = null;
    wx.reLaunch({ url: '/pages/login/index' });
  },
  onLogoutCancel() { this.setData({ logoutVisible: false }); },
  onShareAppMessage() {
    const pet = this.data.pet;
    return {
      title: (pet?.name || '我的小鸟') + '邀请你来串门',
      path: '/pages/visit/index?hostPetId=' + (pet?.id || ''),
    };
  },
});
