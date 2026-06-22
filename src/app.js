const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { config } = require("./config");
const { errorHandler } = require("./middleware/errorHandler");
const { apiLimiter, claimLimiter } = require("./middleware/rateLimit");
const authRoutes = require("./routes/auth");
const campaignRoutes = require("./routes/campaigns");
const claimRoutes = require("./routes/claims");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const webhookRoutes = require("./routes/webhooks");

function createApp() {
  const app = express();

  // Standalone Web3 login demo page — served before helmet so the page can
  // load ethers/siwe from a CDN and run its inline module script (no CSP block).
  app.get("/login", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "login.html"));
  });

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin === "*" ? true : config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(apiLimiter);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "nft-airdrop-api" });
  });

  app.use("/auth", authRoutes);
  app.use("/campaigns", campaignRoutes);
  app.use("/claims", claimLimiter, claimRoutes);
  app.use("/users", userRoutes);
  app.use("/admin", adminRoutes);
  app.use("/webhooks", webhookRoutes);

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
