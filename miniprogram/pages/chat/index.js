const { assetUrl, errorMessage, request } = require('../../utils/api');

function normalizeQuota(q) { return { free_limit: Number(q.free_limit ?? 5), used_count: Number(q.used_count ?? 0) }; }
function remainingQuota(q) { return Math.max(0, q.free_limit - q.used_count); }
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Default avatar fallbacks
const USER_AVATAR = '/assets/icons/default-avatar.png';

Page({
  data: {
    loading: true, sending: false, input: '',
    chatData: [],
    quota: { free_limit: 5, used_count: 0 },
    remainingQuota: 5, canSend: true,
    birdAvatar: '/assets/brand/joyi-logo.jpg',
    birdName: '小鸟',
    userName: '我',
    opening: null,
    bondFeedback: '',
  },

  onShow() {
    this.loadChat();
  },

  onHide() {
    this.clearTypingTimer();
  },

  onUnload() {
    this.clearTypingTimer();
  },

  clearTypingTimer() {
    if (this.replyTimer) {
      clearTimeout(this.replyTimer);
      this.replyTimer = null;
    }
  },

  async loadChat() {
    try {
      const [msgRes, quotaRes, petRes] = await Promise.all([
        request('/api/chat/messages'),
        request('/api/chat/quota'),
        request('/api/pet/me').catch(() => ({ pet: null })),
      ]);

      // Resolve bird identity
      const pet = petRes.pet;
      const birdName = pet?.name || '小鸟';
      let birdAvatar = this.data.birdAvatar;
      if (pet?.petAsset?.home) {
        birdAvatar = assetUrl(pet.petAsset.home);
      } else if (pet?.bird?.fallbackImage) {
        birdAvatar = assetUrl(pet.bird.fallbackImage);
      }

      const quota = normalizeQuota(quotaRes.quota || msgRes.quota);
      const chatData = (msgRes.messages || []).map(m => ({
        role: m.role,
        name: m.role === 'assistant' ? birdName : this.data.userName,
        avatar: m.role === 'assistant' ? birdAvatar : USER_AVATAR,
        datetime: fmtTime(m.created_at),
        content: [{ type: 'text', data: m.content }],
      }));

      this.setData({
        loading: false, chatData, birdAvatar, birdName,
        opening: msgRes.opening || petRes.chatOpening || null,
        quota, remainingQuota: remainingQuota(quota),
        canSend: remainingQuota(quota) > 0,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: errorMessage(err, '读取失败'), icon: 'none' });
    }
  },

  onSend(e) {
    const content = (e.detail?.value || '').trim();
    if (!content || this.data.sending) return;
    if (this.data.remainingQuota <= 0) {
      wx.showToast({ title: '今天次数用完了', icon: 'none' });
      return;
    }
    this.handleSend(content);
  },

  async handleSend(content) {
    const { birdAvatar, birdName, userName } = this.data;
    const now = new Date().toISOString();
    this.clearTypingTimer();
    this.setData({
      sending: true, input: '', canSend: false, bondFeedback: '',
      chatData: [...this.data.chatData,
        { role: 'user', name: userName, avatar: USER_AVATAR, datetime: fmtTime(now), content: [{ type: 'text', data: content }] },
        { role: 'assistant', name: birdName, avatar: birdAvatar, content: [{ type: 'text', data: '正在想...' }], status: 'pending' },
      ],
    });
    try {
      const res = await request('/api/chat/messages', { method: 'POST', data: { content } });
      const reply = res.message || {};
      const quota = normalizeQuota(res.quota || this.data.quota);
      this.typeAssistantReply(reply.content || '我在这里。', {
        datetime: fmtTime(reply.created_at || new Date().toISOString()),
        quota,
        bondFeedback: res.bond_feedback || '',
      });
    } catch (err) {
      this.setData({
        input: content,
        chatData: this.data.chatData.slice(0, -2),
        canSend: this.data.remainingQuota > 0,
        sending: false,
      });
      wx.showToast({ title: err.error === 'QUOTA_EXHAUSTED' ? '今天次数用完了' : errorMessage(err, '发送失败'), icon: 'none' });
    }
  },

  typeAssistantReply(fullText, meta) {
    const { birdAvatar, birdName } = this.data;
    let index = 0;
    const step = () => {
      const visible = fullText.slice(0, index);
      const chatData = [...this.data.chatData];
      if (!chatData.length) return;
      chatData[chatData.length - 1] = {
        role: 'assistant',
        name: birdName,
        avatar: birdAvatar,
        datetime: meta.datetime,
        content: [{ type: 'text', data: visible || '正在想...' }],
        status: index >= fullText.length ? 'complete' : 'pending',
      };
      this.setData({ chatData });
      if (index < fullText.length) {
        index += 1;
        this.replyTimer = setTimeout(step, 24);
        return;
      }
      this.replyTimer = null;
      this.setData({
        quota: meta.quota,
        remainingQuota: remainingQuota(meta.quota),
        canSend: remainingQuota(meta.quota) > 0,
        sending: false,
        bondFeedback: meta.bondFeedback,
      });
      if (meta.bondFeedback) {
        wx.showToast({ title: meta.bondFeedback, icon: 'none' });
      }
    };
    step();
  },

  onShareAppMessage() {
    return { title: '和我的小鸟聊聊', path: '/pages/visit/index' };
  },
});
