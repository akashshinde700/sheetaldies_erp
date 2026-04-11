const parseCookies = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};

  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (!name) return cookies;
    cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
    return cookies;
  }, {});
};

module.exports = {
  parseCookies,
};
