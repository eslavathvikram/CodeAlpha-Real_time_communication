const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'rtc_app_connectly_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
}

// Also usable to authenticate a socket handshake using the same JWT
function verifySocketToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'rtc_app_connectly_jwt_secret_key_2026';
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

module.exports = { protect, verifySocketToken };
