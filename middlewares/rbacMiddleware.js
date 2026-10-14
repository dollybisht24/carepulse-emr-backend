const AppError = require('../utils/appError');

/**
 * Role-Based Access Control middleware
 * Usage: authorizeRoles('admin'), authorizeRoles('admin', 'receptionist')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthenticated request', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: user role '${req.user.role}' is not authorized to perform this action.`,
          403
        )
      );
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
