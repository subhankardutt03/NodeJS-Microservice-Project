require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const Redis = require("ioredis");
const cors = require("cors");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitMq");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

const app = express();
const PORT = process.env.PORT || 8003;

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
app.use("/api/media/upload", sensitiveEndpointsLimiter);
app.use("/api/media/all-media", sensitiveEndpointsLimiter);

app.use(
  "/api/media",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  mediaRoutes,
);

// error handler
app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    // consume all the events
    await consumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT, () => {
      logger.info(`Media service running at port : ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to the server", error);
  }
}

startServer();

// Unhandled promises rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
