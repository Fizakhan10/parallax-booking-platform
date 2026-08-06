import { Router } from "express";
import express from "express";
import { detectTenant } from "../middleware/tenantMiddleware.js";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  getPlans,
  getBillingStatus,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  handleWebhook,
} from "../controllers/billing.controller.js";

const router = Router();

// ── Stripe webhook — MUST be raw body, NO auth, NO tenant ──
// This route is registered BEFORE express.json() in app.js
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// ── Public routes ──────────────────────────────────────────
router.get("/plans", getPlans);

// ── Authenticated + tenant-scoped routes ──────────────────
router.use(detectTenant);
router.use(authenticate);

router.get("/status",       getBillingStatus);
router.get("/invoices",     getInvoices);
router.post("/checkout",    createCheckoutSession);
router.post("/portal",      createPortalSession);
router.post("/cancel",      cancelSubscription);
router.post("/reactivate",  reactivateSubscription);

export default router;
