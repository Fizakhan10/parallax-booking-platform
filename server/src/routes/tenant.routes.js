import { Router } from "express";
import { body } from "express-validator";
import {
  onboardTenant,
  checkSlugAvailability,
  getCurrentTenant,
} from "../controllers/tenant.controller.js";
import { detectTenant } from "../middleware/tenantMiddleware.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes (no tenant context needed)
router.post(
  "/onboard",
  [
    body("tenantName").trim().notEmpty().withMessage("Organization name is required"),
    body("slug")
      .trim()
      .notEmpty()
      .matches(/^[a-z0-9-]+$/)
      .withMessage("Slug must be lowercase letters, numbers, and hyphens only"),
    body("ownerEmail").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("ownerPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("ownerName").trim().notEmpty().withMessage("Your name is required"),
  ],
  onboardTenant
);

router.get("/check-slug/:slug", checkSlugAvailability);

// Tenant-scoped routes
router.get("/current", detectTenant, authenticate, getCurrentTenant);

export default router;
