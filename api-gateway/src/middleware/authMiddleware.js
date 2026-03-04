const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("Access attempts with out valid token!");
    return res.status(401).json({
      success: false,
      message: "Authentication Required!",
    });
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error) {
      logger.warn("Invalid Token!");
      return res.status(401).json({
        success: false,
        message: "Invalid Token!",
      });
    }
    req.user = user;
    next();
  });
};

module.exports = { validateToken };
