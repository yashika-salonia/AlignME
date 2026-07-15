/**
 * Wraps an async Express route handler to forward any thrown errors to next().
 * Eliminates the need for try/catch boilerplate in every controller.
 *
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
