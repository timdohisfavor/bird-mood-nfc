Page({
  goRedeem() {
    wx.navigateTo({ url: '/pages/redeem/index' });
  },
  goLogin() {
    wx.reLaunch({ url: '/pages/login/index' });
  },
});
