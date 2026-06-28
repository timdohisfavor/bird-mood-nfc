const { assetUrl, errorMessage, request } = require('../../utils/api');

Page({
  data: {
    loading: true,
    saving: false,
    ready: false,
    errorText: '',
    pet: null,
    birdImage: '',
    draftName: '',
    draftPersona: '',
    personaLength: 0,
  },
  onShow() {
    this.loadPet();
  },
  async loadPet() {
    try {
      const res = await request('/api/pet/me');
      const pet = res.pet;
      if (!pet || !pet.bird) {
        this.setData({ loading: false, ready: false, errorText: '还没有可唤醒的小鸟，请先完成兑换。' });
        return;
      }
      this.setData({
        loading: false,
        ready: true,
        errorText: '',
        pet,
        draftName: pet?.name || '',
        draftPersona: pet?.persona_prompt || '',
        personaLength: (pet?.persona_prompt || '').length,
        birdImage: assetUrl(pet?.bird?.image || pet?.bird?.fallbackImage),
      });
    } catch (error) {
      this.setData({ loading: false, ready: false, errorText: errorMessage(error, '读取宠物失败') });
    }
  },
  onNameInput(event) {
    this.setData({ draftName: event.detail.value });
  },
  onPersonaInput(event) {
    const value = event.detail.value;
    this.setData({ draftPersona: value, personaLength: value.length });
  },
  async saveProfile() {
    if (this.data.saving || !this.data.draftName.trim()) return;
    this.setData({ saving: true });
    try {
      const res = await request('/api/pet/me', {
        method: 'PATCH',
        data: {
          name: this.data.draftName.trim(),
          persona_prompt: this.data.draftPersona.trim(),
        },
      });
      if (!res.pet || !res.pet.bird) throw new Error('保存后宠物数据异常');
      getApp().globalData.pet = res.pet;
      wx.showToast({ title: '已保存', icon: 'success' });
      this.setData({
        pet: res.pet,
        draftName: res.pet.name,
        draftPersona: res.pet.persona_prompt || '',
        personaLength: (res.pet.persona_prompt || '').length,
        birdImage: assetUrl(res.pet?.bird?.image || res.pet?.bird?.fallbackImage),
      });
    } catch (error) {
      wx.showToast({ title: errorMessage(error, '保存失败'), icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
  enterHome() {
    wx.reLaunch({ url: '/pages/home/index' });
  },
});
