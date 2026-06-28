const { errorMessage, request } = require('../../utils/api');

Page({
  data: {
    loading: false,
  },
  onShow() {
    this.resumeSession();
  },
  routeAfterLogin(hasPet) {
    const targetUrl = hasPet ? '/pages/home/index' : '/pages/locked/index';
    wx.reLaunch({
      url: targetUrl,
      fail() {
        wx.redirectTo({ url: targetUrl });
      },
    });
  },
  async resumeSession() {
    const token = wx.getStorageSync('joyibird_token');
    if (!token || this.data.loading) return;
    getApp().globalData.token = token;
    this.setData({ loading: true });
    try {
      const res = await request('/api/me');
      getApp().globalData.user = res.user || null;
      getApp().globalData.pet = res.pet || null;
      this.routeAfterLogin(Boolean(res.pet));
    } catch {
      wx.removeStorageSync('joyibird_token');
      getApp().globalData.token = '';
      wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async login() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await request('/api/auth/wechat-login', {
        method: 'POST',
        data: { mockUser: 'joyi-beta' },
      });
      if (!res || typeof res !== 'object' || !res.token) {
        throw new Error('登录返回异常');
      }
      const app = getApp();
      app.globalData.token = res.token;
      app.globalData.user = res.user || null;
      app.globalData.pet = res.pet || null;
      wx.setStorageSync('joyibird_token', res.token);
      this.routeAfterLogin(Boolean(res.hasPet || res.pet));
    } catch (error) {
      wx.showToast({ title: errorMessage(error, '登录失败'), icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
