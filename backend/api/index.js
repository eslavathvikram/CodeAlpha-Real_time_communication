const app = require('../server');

module.exports = async function handler(req, res) {
  // Prepend /api to the path if the serverless router strips it
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }

  return app(req, res);
};