const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Global Express error handler — must be registered as the last middleware in app.js.
 * Catches all errors forwarded via next(err) or thrown inside asyncHandler-wrapped routes.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  logger.error(`${req.method} ${req.path} — ${err.message}`, err);

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = globalErrorHandler;
