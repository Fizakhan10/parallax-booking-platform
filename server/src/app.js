import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import env from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

// ─── Security ──────────────────────────────────────────────
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use(limiter);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes("localhost")) return callback(null, true);
      if (origin === env.CLIENT_URL) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Slug"],
  })
);

// ─── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

// ─── Routes ────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Multi-Tenant SaaS API is running 🚀",
    db: "MongoDB",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bookings", bookingRoutes);

// ─── Errors ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
