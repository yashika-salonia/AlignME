const winston = require('winston');

const { combine, colorize, simple, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? json()
        : combine(colorize(), simple()),
    }),
  ],
});

module.exports = logger;
