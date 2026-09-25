const connectDB = require('../utils/connectDB');

async function dbCheck(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err.message);
    return res.status(503).json({
      message: 'Database connection unavailable. Please check MONGO_URI configuration in backend environment settings.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

module.exports = dbCheck;
