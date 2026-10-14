const AppError = require('../utils/appError');

/**
 * Zod validation middleware
 * Validates req.body, req.query, or req.params against provided Zod schema
 */
const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Assign sanitized & validated properties back to req
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error.errors) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.').replace(/^(body|query|params)\./, ''),
        message: err.message,
      }));
      return next(new AppError('Validation failed', 400, details));
    }
    next(error);
  }
};

module.exports = validate;
