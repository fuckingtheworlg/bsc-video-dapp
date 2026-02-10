require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { initSettlerCron } = require("./services/settler");
const logger = require("./utils/logger");

const uploadRoutes = require("./routes/upload");
const coverRoutes = require("./routes/cover");
const moderationRoutes = require("./routes/moderation");
const healthRoutes = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - configure for cross-origin media access
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",");
    // In development, also allow localhost and 127.0.0.1 on any port
    if (process.env.NODE_ENV !== "production" && 
        (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"))) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-Wallet-Address", "X-Signature", "X-Message"],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: "5mb" }));

// Serve local uploads (dev mode IPFS fallback)
app.use("/api/local-ipfs", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/cover", coverRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/health", healthRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server only when run directly (not imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Backend server running on port ${PORT}`);

    // Initialize settler cron job (Chainlink Automation backup)
    if (process.env.SETTLER_PRIVATE_KEY && process.env.VIDEO_CONTRACT_ADDRESS) {
      initSettlerCron();
      logger.info("Settler cron job initialized");
    } else {
      logger.warn("Settler cron not started: missing SETTLER_PRIVATE_KEY or VIDEO_CONTRACT_ADDRESS");
    }
  });
}

module.exports = app;
