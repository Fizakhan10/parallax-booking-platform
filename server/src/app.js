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
import billingRoutes from "./routes/billing.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

// ─── Security ──────────────────────────────────────────────
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
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

// ── IMPORTANT: Stripe webhook MUST be mounted BEFORE express.json()
// The webhook handler uses express.raw() internally for signature verification
app.use("/api/billing", billingRoutes);

// ─── Body parsing (after webhook route) ───────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

// ─── Routes ────────────────────────────────────────────────
// Health checks (must be before auth middleware for monitoring)
app.use(healthRoutes);

app.use("/api/auth",      authRoutes);
app.use("/api/tenants",   tenantRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bookings",  bookingRoutes);

// ─── Errors ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
