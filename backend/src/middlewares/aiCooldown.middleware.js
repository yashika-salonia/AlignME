const AI_REQUEST_COOLDOWN_MS = 1 * 60 * 1000; // 1 minutes
const cooldownMap = new Map();

function aiRequestCooldown(req, res, next) {
  const key = req.user?.id || req.ip;
  const now = Date.now();
  const nextAllowed = cooldownMap.get(key) || 0;

  if (now < nextAllowed) {
    const waitSeconds = Math.ceil((nextAllowed - now) / 1000);
    return res.status(429).json({
      message: `Too many AI requests. Please wait ${waitSeconds} seconds before trying again.`,
    });
  }

  cooldownMap.set(key, now + AI_REQUEST_COOLDOWN_MS);
  setTimeout(() => cooldownMap.delete(key), AI_REQUEST_COOLDOWN_MS + 1000);
  next();
}

module.exports = { aiRequestCooldown };
