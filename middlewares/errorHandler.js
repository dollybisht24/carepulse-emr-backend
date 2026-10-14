const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Mongoose / MongoDB duplicate key errors (code 11000)
  if (err.code === 11000) {
    statusCode = 409; // Conflict
    const keyPattern = err.keyPattern || {};

    if (keyPattern.doctorId && keyPattern.startAt) {
      message = 'This slot has already been reserved for the doctor at this time. Please select another slot.';
      details = { conflictField: 'slot', doctorId: err.keyValue?.doctorId, startAt: err.keyValue?.startAt };
    } else if (keyPattern.email) {
      statusCode = 400;
      message = 'An account with this email address already exists.';
      details = { conflictField: 'email' };
    } else if (keyPattern.patientId) {
      statusCode = 400;
      message = 'A patient with this patient ID already exists.';
      details = { conflictField: 'patientId' };
    } else if (keyPattern.userId) {
      statusCode = 400;
      message = 'A doctor profile for this user already exists.';
    } else {
      message = `Duplicate key error on field: ${Object.keys(keyPattern).join(', ')}`;
    }
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found or invalid identifier format for ${err.path}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error occurred';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle JSON Web Token errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please refresh your session.';
  }

  if (env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('[UNHANDLED ERROR STACK]:', err.stack);
  }

  return ApiResponse.error(res, message, statusCode, details);
};

module.exports = errorHandler;
