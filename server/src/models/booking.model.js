import mongoose from "mongoose";

/**
 * Booking Model — Multi-tenant, strictly scoped to tenantId
 *
 * Idempotency: clients send an idempotencyKey (e.g. UUID).
 * Duplicate POST with same key returns the existing booking instead of creating again.
 */
const bookingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Core fields ───────────────────────────────────
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },

    // ── Participants ──────────────────────────────────
    clientName: { type: String, required: true, trim: true, maxlength: 100 },
    clientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    clientPhone: { type: String, trim: true, default: "" },

    // ── Scheduling ────────────────────────────────────
    startTime: { type: Date, required: true },
    endTime:   { type: Date, required: true },
    timezone:  { type: String, default: "UTC" },
    location:  { type: String, trim: true, default: "" },

    // ── Status ────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending",
    },

    // ── Categorisation ────────────────────────────────
    serviceType: { type: String, trim: true, default: "" },
    notes:       { type: String, trim: true, maxlength: 2000, default: "" },

    // ── Idempotency ───────────────────────────────────
    idempotencyKey: {
      type: String,
      sparse: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────
// Tenant scoped lookups
bookingSchema.index({ tenantId: 1, startTime: -1 });
bookingSchema.index({ tenantId: 1, status: 1 });
bookingSchema.index({ tenantId: 1, clientEmail: 1 });
// Idempotency: unique per tenant (sparse so nulls are not indexed)
bookingSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
