/**
 * Standard API response wrapper
 */
class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200, meta = null) {
    const response = {
      success: true,
      message,
      data,
    };
    if (meta !== null) {
      response.meta = meta;
    }
    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Resource created successfully', data = null, meta = null) {
    return ApiResponse.success(res, message, data, 201, meta);
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    const response = {
      success: false,
      message,
    };
    if (details) {
      response.details = details;
    }
    return res.status(statusCode).json(response);
  }
}

module.exports = ApiResponse;
