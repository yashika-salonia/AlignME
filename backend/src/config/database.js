const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection failed:', err);
    process.exit(1);
  }
}

module.exports = connectToDB;
