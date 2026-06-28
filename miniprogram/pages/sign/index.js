const { assetUrl, errorMessage, request } = require('../../utils/api');

Page({
  data: {
    loading: true,
    ready: false,
    errorText: '',
    sign: null,
    pet: null,
    birdImage: '',
    opened: false,
    featherReward: 0,
  },
  onShow() {
    this.loadSign();
  },
  async loadSign() {
    try {
      const res = await request('/api/sign/today');
      if (!res.sign || !res.pet) {
        this.setData({ loading: false, ready: false, errorText: '今日鸟签数据不完整，请稍后再试。' });
        return;
      }
      this.setData({
        loading: false,
        ready: true,
        errorText: '',
        sign: res.sign,
        pet: res.pet,
        birdImage: assetUrl(res.pet?.bird?.image || res.pet?.bird?.fallbackImage),
      });
      this.openSign();
    } catch (error) {
      this.setData({ loading: false, ready: false, errorText: errorMessage(error, '读取鸟签失败') });
    }
  },
  async openSign() {
    try {
      const openRes = await request('/api/sign/today/open', { method: 'POST' });
      this.setData({
        opened: true,
        featherReward: openRes.feather_count || 0,
      });
    } catch {
      // open is best-effort; sign content already shown
    }
  },
  onPullDownRefresh() {
    this.loadSign().finally(() => { wx.stopPullDownRefresh(); });
  },
  onShareAppMessage() {
    return {
      title: `${this.data.pet?.name || '小鸟'}叼来了今日鸟签`,
      path: `/pages/visit/index?hostPetId=${this.data.pet?.id || ''}`,
    };
  },
});
