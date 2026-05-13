const multer = require("multer");

// ✅ Ensure you are using memoryStorage, NOT diskStorage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Optional: 5MB limit
  },
});

module.exports = upload;
