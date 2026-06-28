const ENV = typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'release'
  ? 'production'
  : 'development';

const API_BASES = {
  development: 'http://127.0.0.1:8099',
  // Set this to the HTTPS production API before release.
  production: 'https://api.joyibird.cn',
};

App({
  globalData: {
    apiBase: API_BASES[ENV],
    token: '',
    user: null,
    pet: null,
  },
  onLaunch() {
    const token = wx.getStorageSync('joyibird_token');
    if (token) this.globalData.token = token;
  },
});
