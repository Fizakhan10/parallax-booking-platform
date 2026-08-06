import mongoose from "mongoose";

/**
 * BillingEvent — stores processed Stripe webhook events.
 * Used for idempotency (never process same event twice) and invoice history.
 */
const billingEventSchema = new mongoose.Schema(
  {
    tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    stripeEventId: { type: String, required: true, unique: true }, // idempotency key
    type:          { type: String, required: true },               // e.g. "invoice.payment_succeeded"
    payload:       { type: mongoose.Schema.Types.Mixed },          // raw Stripe event data object
    processed:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

billingEventSchema.index({ tenantId: 1, createdAt: -1 });

export const BillingEvent = mongoose.model("BillingEvent", billingEventSchema);

/**
 * Invoice — mirrors Stripe invoice data locally for fast UI rendering
 */
const invoiceSchema = new mongoose.Schema(
  {
    tenantId:         { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    stripeInvoiceId:  { type: String, required: true, unique: true },
    amountPaid:       { type: Number, required: true },  // cents
    amountDue:        { type: Number, default: 0 },
    currency:         { type: String, default: "usd" },
    status:           { type: String },                  // "paid", "open", "void", "uncollectible"
    invoiceUrl:       { type: String },
    invoicePdf:       { type: String },
    periodStart:      { type: Date },
    periodEnd:        { type: Date },
    plan:             { type: String },
    description:      { type: String },
  },
  { timestamps: true }
);

invoiceSchema.index({ tenantId: 1, createdAt: -1 });

export const Invoice = mongoose.model("Invoice", invoiceSchema);
