const connectDB = require('../utils/connectDB');
const app = require('../server');

module.exports = async function handler(req, res) {
	try {
		await connectDB();
	} catch (err) {
		console.error('Serverless DB Connection error:', err.message);
	}

	if (!req.url.startsWith('/api')) {
		req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
	}

	return app(req, res);
};
