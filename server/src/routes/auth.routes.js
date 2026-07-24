import { Router } from "express";
import { body } from "express-validator";
import {
  register,
  login,
  refreshTokens,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { detectTenant } from "../middleware/tenantMiddleware.js";

const router = Router();

// Apply tenant detection to all auth routes
router.use(detectTenant);

// Register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("fullName")
      .trim()
      .notEmpty()
      .withMessage("Full name is required"),
  ],
  register
);

// Login
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// Refresh token
router.post("/refresh", refreshTokens);

// Logout
router.post("/logout", logout);

// Get current user (protected)
router.get("/me", authenticate, getMe);

export default router;
