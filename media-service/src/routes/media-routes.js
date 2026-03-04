const express = require("express");
const multer = require("multer");
const { authenticateRequest } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");
const { uploadMedia, getAllMedia } = require("../controllers/media-controller");
const router = express.Router();

/// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        logger.error("Multer error while uploading file", error);
        return res.status(400).json({
          success: false,
          message: "Multer error while uploading file",
          error: error.message,
          stack: error.stack,
        });
      } else if (error) {
        logger.error("Unknown error occured while uploading", error);
        return res.status(500).json({
          success: false,
          message: "Unknown error occured while uploading",
          message: error.message,
          stack: error.stack,
        });
      }

      if (!req.file) {
        return res.status(404).json({
          success: false,
          message: "No file found!",
        });
      }
      next();
    });
  },
  uploadMedia,
);

router.get("/all-media", authenticateRequest, getAllMedia);
module.exports = router;
