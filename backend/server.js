require("dotenv").config();
const app = require("./src/app");
const connectToDB = require("./src/config/database");
const logger = require("./src/utils/logger");

const REQUIRED_ENV_VARS = ["MONGO_URI", "JWT_SECRET", "GOOGLE_GENAI_API_KEY"];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    missing.forEach((key) => logger.error(`Missing required environment variable: ${key}`));
    process.exit(1);
  }
}

async function startServer() {
  validateEnv();
  await connectToDB();

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
    process.exit(1);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

startServer();
