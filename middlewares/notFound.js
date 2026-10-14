const AppError = require('../utils/appError');

const notFound = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - endpoint does not exist on this server`, 404));
};

module.exports = notFound;
