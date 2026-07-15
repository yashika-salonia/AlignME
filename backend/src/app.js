require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./utils/logger");
const globalErrorHandler = require("./middlewares/errorHandler.middleware");

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:4173",
  "https://align-me.vercel.app",
  "https://alignme.vercel.app",
];

// Allow configuring the frontend origin via environment variable (comma separated)
if (process.env.FRONTEND_URL) {
  const extra = process.env.FRONTEND_URL.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  allowedOrigins.push(...extra);
}

// Determine if we're in a deployed (production) environment
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER ||
  process.env.VERCEL ||
  process.env.RAILWAY ||
  process.env.HEROKU_APP_NAME;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow any localhost port in development
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn("CORS blocked for origin:", origin);
      callback(new Error("CORS blocked"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("AlignME API is running!");
});

/* require all the routes here */
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

/* using all the routes here */
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

/* Global error handler — must be last */
app.use(globalErrorHandler);

module.exports = app;
