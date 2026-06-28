function app() {
  return getApp();
}

function request(path, options = {}) {
  const token = app().globalData.token || wx.getStorageSync('joyibird_token');
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app().globalData.apiBase}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data || { error: 'REQUEST_FAILED' });
        }
      },
      fail: reject,
    });
  });
}

function assetUrl(assetPath) {
  if (!assetPath) return '';
  if (/^https?:\/\//.test(assetPath)) return assetPath;
  return `${app().globalData.apiBase}/${assetPath.replace(/^\/+/, '')}`;
}

function getStoredToken() {
  return app().globalData.token || wx.getStorageSync('joyibird_token');
}

function errorMessage(error, fallback = '请求失败') {
  if (!error) return fallback;
  const message = error.message || error.error || error.errMsg || error;
  return typeof message === 'string' ? message : fallback;
}

module.exports = { assetUrl, errorMessage, getStoredToken, request };
