const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { User, Doctor } = require('../models');
const AuditService = require('./auditService');

class AuthService {
  /**
   * Generates Access and Refresh Token pair
   */
  static generateTokens(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ id: user._id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Logs in a user, authenticates password, rotates refresh token
   */
  static async login(email, password, ipAddress = null) {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +refreshTokenHash +isActive');

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact an administrator.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    // Hash refresh token before saving in database
    const salt = await bcrypt.genSalt(10);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await user.save();

    // Fetch doctor profile if user is a doctor
    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findOne({ userId: user._id }).populate('departmentId');
    }

    // Record audit log
    await AuditService.log({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user._id,
      details: { role: user.role },
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorId: doctorProfile ? doctorProfile._id : null,
        doctor: doctorProfile,
      },
    };
  }

  /**
   * Refreshes access token with refresh token rotation
   */
  static async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
    }

    const user = await User.findById(decoded.id).select('+refreshTokenHash +isActive');
    if (!user || !user.isActive) {
      throw new AppError('User not found or account deactivated', 401);
    }

    if (!user.refreshTokenHash) {
      throw new AppError('Session has expired or was revoked. Please log in again.', 401);
    }

    const isTokenMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isTokenMatch) {
      // Possible token reuse detected: revoke session
      user.refreshTokenHash = null;
      await user.save();
      throw new AppError('Invalid session. Please log in again.', 401);
    }

    // Rotate refresh token
    const tokens = this.generateTokens(user);
    const salt = await bcrypt.genSalt(10);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, salt);
    await user.save();

    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findOne({ userId: user._id });
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorId: doctorProfile ? doctorProfile._id : null,
      },
    };
  }

  /**
   * Logs out user and revokes stored refresh token hash
   */
  static async logout(userId, ipAddress = null) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokenHash = null;
      await user.save();

      await AuditService.log({
        userId: user._id,
        userEmail: user.email,
        role: user.role,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: user._id,
        ipAddress,
      });
    }
    return true;
  }
}

module.exports = AuthService;
