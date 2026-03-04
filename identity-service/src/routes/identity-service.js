const express = require("express");
const {
  registerUser,
  loginUser,
  generateRefreshToken,
  logoutUser,
} = require("../controllers/identity-controller");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/generate-refreshtoken", generateRefreshToken);
router.post("/logout", logoutUser);

module.exports = router;
