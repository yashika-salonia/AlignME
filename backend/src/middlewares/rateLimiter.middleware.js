const { rateLimit } = require('express-rate-limit');

const interviewGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // adds RateLimit-* headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait 15 minutes before trying again.' },
});

module.exports = { interviewGenerationLimiter };
