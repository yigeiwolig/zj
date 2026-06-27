const DEFAULT_TITLE = 'MT摩改社';
const DEFAULT_PATH = '/pages/index/index';

function getShareAppMessage(overrides) {
  const opts = overrides && typeof overrides === 'object' ? overrides : {};
  const path = opts.path || DEFAULT_PATH;
  return {
    title: opts.title || DEFAULT_TITLE,
    path: path.charAt(0) === '/' ? path : '/' + path
  };
}

function getShareTimeline(overrides) {
  const opts = overrides && typeof overrides === 'object' ? overrides : {};
  const path = opts.path || DEFAULT_PATH;
  const query = opts.query != null
    ? String(opts.query)
    : path.replace(/^\//, '').replace(/^package-app\//, 'package-app/').split('?')[1] || '';
  return {
    title: opts.title || DEFAULT_TITLE,
    query
  };
}

module.exports = {
  DEFAULT_TITLE,
  DEFAULT_PATH,
  getShareAppMessage,
  getShareTimeline
};
