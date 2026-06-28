const { request } = require('../../utils/api');

const errorText = {
  CODE_NOT_FOUND: '兑换码不存在',
  CODE_USED: '兑换码已使用',
  CODE_VOID: '兑换码已作废',
  USER_ALREADY_HAS_PET: '你已经唤醒过小鸟了',
};

Page({
  data: {
    code: '',
    loading: false,
  },
  onInput(event) {
    this.setData({ code: String(event.detail.value || '').replace(/\D/g, '').slice(0, 4) });
  },
  async redeem() {
    if (this.data.loading) return;
    const code = this.data.code.trim();
    if (!code) {
      wx.showToast({ title: '请先输入兑换码', icon: 'none' });
      return;
    }
    if (code.length !== 4) {
      wx.showToast({ title: '请输入 4 位兑换码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await request('/api/redeem', {
        method: 'POST',
        data: { code },
      });
      getApp().globalData.pet = res.pet;
      wx.redirectTo({ url: '/pages/awakening/index' });
    } catch (error) {
      wx.showToast({ title: errorText[error.error] || '兑换失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
