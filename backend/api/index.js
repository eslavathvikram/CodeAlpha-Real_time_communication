const app = require('../server');

module.exports = async function handler(req, res) {
  // Vercel routes /api/* -> this handler. The req.url still contains
  // the full path (e.g. /api/auth/register), so no rewriting needed.
  // But if somehow the /api prefix is stripped, restore it.
  if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }

  return app(req, res);
};