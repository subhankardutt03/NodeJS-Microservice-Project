const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");
const Media = require("../models/Media");

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");
  try {
    if (!req.file) {
      logger.error("No file found. Please add a file and try again!");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again!",
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`File details : name=${originalname}, type=${mimetype}`);
    logger.info("Uploading to cloudinary starting...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successfully. Public Id: - ${cloudinaryUploadResult.public_id}`,
    );
    const createdMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await createdMedia.save();

    return res.status(201).json({
      success: true,
      url: createdMedia.url,
      mediaId: createdMedia._id,
      message: "Media uploaded successfully!",
    });
  } catch (error) {
    logger.error("Error creating media", error);
    return res.status(500).json({
      success: false,
      message: "Error creating media",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const results = await Media.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      results: results,
    });
  } catch (error) {
    logger.error("Error fetching all media", error);
  }
};

module.exports = { uploadMedia, getAllMedia };
