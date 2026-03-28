// Load environment variables from file only in development
import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env" });
}

import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import connectDB from "./config/db.js";
import adminRoutes from "./routes/admin.js";
import publicRoutes from "./routes/public.js";
import { restartChangeStreams, stopChangeStreams } from "./utils/changeStreamManager.js";
import { startShipmentSyncJob, stopShipmentSyncJob } from "./jobs/shipmentSync.job.js";

const app = express();
const server = http.createServer(app);

//   CORS origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [];

//   Express middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

//   Static assets (logo, etc.) — publicly accessible, no auth required
app.use("/static", express.static(path.join(__dirname, "static")));

//   Routes
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", publicRoutes);

//   Health check
app.get("/", (req, res) => {
  res.json({ message: "UrbanNook Admin API is running" });
});

//   Global error handler
app.use((err, _req, res, _next) => {
  const origin = _req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({ statusCode, message, data: null, success: false });
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  restartChangeStreams();
  startShipmentSyncJob();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

process.on("SIGTERM", () => {
  stopChangeStreams();
  stopShipmentSyncJob();
  server.close(() => process.exit(0));
});
