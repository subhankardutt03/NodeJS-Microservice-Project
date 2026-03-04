const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const routes = require("./routes/identity-service");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 8001;

// connect to mongodb

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("Connected to mongoDB"))
  .catch((err) => logger.error("MongoDB connection failed", err));

const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

// DDos protection and rate limiting

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter.consume(req.ip).then(() =>
    next().catch((err) => {
      logger.warn(`Rate limit exceeded for IP : ${req.ip}`);
      res.status(409).json({
        success: false,
        message: "Too many requests!",
      });
    })
  );
});

// Ip based rate limiting for sensitive end points
const sensitiveEndpointsLimiter = rateLimit({
  max: 50,
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoints rate limit exceded for IP : ${req.ip}`);
    res.status(409).json({
      success: false,
      message: "Too many requests!",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// Apply this sensitiveEndpointlimiter to our routes
app.use("/api/auth/register", sensitiveEndpointsLimiter);

// Routes
app.use("/api/auth", routes);

// error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running at port : ${PORT}`);
});

// Unhandled promises rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
