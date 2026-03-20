// Load environment variables from file only in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env" });
}

const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");
const Order = require("./models/Order");
const InstagramOrder = require("./models/InstagramOrder");
const orderEventEmitter = require("./utils/orderEvents");

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
  res
    .status(statusCode)
    .json({ statusCode, message, data: null, success: false });
});

let changeStreamRetryTimer = null;

function setupOrderChangeStream() {
  if (changeStreamRetryTimer) {
    clearTimeout(changeStreamRetryTimer);
    changeStreamRetryTimer = null;
  }

  try {
    const changeStream = Order.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" },
    );

    changeStream.on("change", (change) => {
      if (change.fullDocument) {
        orderEventEmitter.emit("new_order", change.fullDocument);
        console.log(`[ChangeStream] New order: ${change.fullDocument.orderId}`);
      }
    });

    changeStream.on("error", (err) => {
      console.error(`[ChangeStream] Error: ${err.message}`);
      changeStream.close().catch(() => {});
      changeStreamRetryTimer = setTimeout(setupOrderChangeStream, 5000);
    });

    changeStream.on("close", () => {
      console.warn("[ChangeStream] Closed, restarting in 5s...");
      changeStreamRetryTimer = setTimeout(setupOrderChangeStream, 5000);
    });

    console.log("[ChangeStream] Watching Order collection for inserts");
  } catch (err) {
    console.warn(
      "[ChangeStream] Unavailable — real-time sync disabled.",
      `Reason: ${err.message}`,
    );
  }
}

let igChangeStreamRetryTimer = null;

function setupInstagramOrderChangeStream() {
  if (igChangeStreamRetryTimer) {
    clearTimeout(igChangeStreamRetryTimer);
    igChangeStreamRetryTimer = null;
  }

  try {
    const changeStream = InstagramOrder.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" },
    );

    changeStream.on("change", (change) => {
      if (change.fullDocument) {
        orderEventEmitter.emit("new_instagram_order", change.fullDocument);
        console.log(
          `[ChangeStream:Instagram] New order: ${change.fullDocument.orderId}`,
        );
      }
    });

    changeStream.on("error", (err) => {
      console.error(`[ChangeStream:Instagram] Error: ${err.message}`);
      changeStream.close().catch(() => {});
      igChangeStreamRetryTimer = setTimeout(
        setupInstagramOrderChangeStream,
        5000,
      );
    });

    changeStream.on("close", () => {
      console.warn("[ChangeStream:Instagram] Closed, restarting in 5s...");
      igChangeStreamRetryTimer = setTimeout(
        setupInstagramOrderChangeStream,
        5000,
      );
    });

    console.log(
      "[ChangeStream:Instagram] Watching InstagramOrder collection for inserts",
    );
  } catch (err) {
    console.warn(
      "[ChangeStream:Instagram] Unavailable — real-time sync disabled.",
      `Reason: ${err.message}`,
    );
  }
}

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  setupOrderChangeStream();
  setupInstagramOrderChangeStream();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

process.on("SIGTERM", () => {
  if (changeStreamRetryTimer) clearTimeout(changeStreamRetryTimer);
  if (igChangeStreamRetryTimer) clearTimeout(igChangeStreamRetryTimer);
  server.close(() => process.exit(0));
});

module.exports = app;
