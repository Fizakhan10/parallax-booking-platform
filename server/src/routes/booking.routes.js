import { Router } from "express";
import { detectTenant } from "../middleware/tenantMiddleware.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validate } from "../utils/zodValidate.js";
import {
  createBookingSchema,
  updateBookingSchema,
  updateStatusSchema,
} from "../validators/booking.validator.js";
import {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  getBookingStats,
} from "../controllers/booking.controller.js";

const router = Router();

// All booking routes require tenant + auth
router.use(detectTenant);
router.use(authenticate);

// ── Stats (before :id to avoid param conflict) ─────────────
router.get("/stats", getBookingStats);

// ── CRUD ───────────────────────────────────────────────────
router.get("/",    listBookings);
router.post("/",   validate(createBookingSchema),  createBooking);
router.get("/:id", getBooking);
router.put("/:id", validate(updateBookingSchema),  updateBooking);
router.patch("/:id/status", validate(updateStatusSchema), updateBookingStatus);
router.delete("/:id", deleteBooking);

export default router;
