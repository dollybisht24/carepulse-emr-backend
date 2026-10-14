const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await AuthService.login(email, password, ipAddress);

    setRefreshTokenCookie(res, result.refreshToken);

    return ApiResponse.success(res, 'Login successful', {
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await AuthService.refresh(refreshToken);

    setRefreshTokenCookie(res, result.refreshToken);

    return ApiResponse.success(res, 'Session refreshed successfully', {
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      await AuthService.logout(req.user._id, ipAddress);
    }
    res.clearCookie('refreshToken');
    return ApiResponse.success(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    return ApiResponse.success(res, 'Current user retrieved', {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        doctorId: req.doctor ? req.doctor._id : null,
        doctor: req.doctor || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  getMe,
};
