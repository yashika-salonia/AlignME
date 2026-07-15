const mongoose = require("mongoose");

const blacklistTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "token is required to added in blacklist"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

blacklistTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const tokenBlacklistModel = mongoose.model(
  "blacklistToken",
  blacklistTokenSchema,
);

module.exports = tokenBlacklistModel;
