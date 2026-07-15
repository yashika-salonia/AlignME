const { body, validationResult } = require("express-validator");

const authRegisterValidator = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3, max: 30 }).withMessage("Username must be between 3 and 30 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address"),

  body("password")
    .trim()
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const authLoginValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address"),

  body("password")
    .trim()
    .notEmpty().withMessage("Password is required"),
];

const interviewValidator = [
  body("jobDescription")
    .optional()
    .isLength({ max: 5000 }).withMessage("Job description cannot exceed 5000 characters"),

  body("selfDescription")
    .optional()
    .isLength({ max: 2000 }).withMessage("Self description cannot exceed 2000 characters"),
];

const handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array();
    // "message" is the first human-readable error — used by toast notifications.
    // "errors" is the full list — available for per-field UI highlighting later.
    return res.status(422).json({
      message: errors[0].msg,
      errors,
    });
  }
  next();
};

module.exports = {
  authRegisterValidator,
  authLoginValidator,
  interviewValidator,
  handleValidationErrors,
};
