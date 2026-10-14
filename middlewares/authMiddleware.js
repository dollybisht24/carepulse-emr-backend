const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { User, Doctor } = require('../models');

/**
 * Authentication middleware: verifies short-lived JWT access token
 * and attaches verified user and doctor profile (if doctor) to req
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Authentication required. No access token provided.', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Access token expired. Please refresh your session.', 401));
      }
      return next(new AppError('Invalid access token.', 401));
    }

    const user = await User.findById(decoded.id).select('+isActive');
    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Contact hospital admin.', 403));
    }

    req.user = user;

    // If user is a doctor, resolve their Doctor profile document for scoping
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      req.doctor = doctorProfile;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
};
