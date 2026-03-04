// User Registration
// User Login
// User logout
// Refresh Token

const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const RefreshToken = require("../models/RefreshToken");

// User Registration
const registerUser = async (req, res, next) => {
  logger.info("Call register method");
  try {
    // validate the schema
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validattion Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { username, email, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);
    const { accessToken, refreshToken } = await generateToken(user);
    return res.status(201).json({
      success: true,
      message: "User saved successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// User Login
const loginUser = async (req, res) => {
  logger.info("User login controller calling..");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validattion Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      logger.warn("Wrong Username!!");
      return res.status(400).json({
        success: false,
        message: "Email not matched",
      });
    }
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Wrong Password");
      return res.status(400).json({
        success: false,
        message: "Password not matched",
      });
    }

    const { accessToken, refreshToken } = await generateToken(user);

    return res.status(200).json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login error occured", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const generateRefreshToken = async (req, res) => {
  logger.info("generate refresh token calling!");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token not found",
      });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Refresh token missing");
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    // Deleted the old token
    await RefreshToken.deleteOne({ _id: storedToken._id });
    return res.status(200).json(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      200,
    );
  } catch (error) {
    logger.error("refresh token error occured", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Logout

const logoutUser = async (req, res) => {
  logger.info("logout user function calling!");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token not found",
      });
    }
    await RefreshToken.deleteOne({ token: refreshToken });

    return res.status(200).json({
      success: true,
      message: "Logout successfully!",
    });
  } catch (error) {
    logger.error("Logout user error occured", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { registerUser, loginUser, generateRefreshToken, logoutUser };
