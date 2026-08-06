import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // unique declared only once — via schema.index below, not inline
    slug: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    domain:  { type: String },
    logoUrl: { type: String },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Stripe billing ─────────────────────────────────
    stripeCustomerId:     { type: String },
    stripeSubscriptionId: { type: String },
    stripePriceId:        { type: String },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "unpaid", "incomplete", "none"],
      default: "none",
    },
    currentPeriodEnd:  { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// All indexes declared here only (no inline unique/sparse flags)
tenantSchema.index({ slug: 1 },             { unique: true });
tenantSchema.index({ domain: 1 },           { sparse: true });
tenantSchema.index({ stripeCustomerId: 1 }, { sparse: true });

const Tenant = mongoose.model("Tenant", tenantSchema);

export const findTenantBySlug = (slug) =>
  Tenant.findOne({ slug, status: "active" }).lean();

export const findTenantById = (id) =>
  Tenant.findById(id).lean();

export const findTenantByDomain = (domain) =>
  Tenant.findOne({ domain, status: "active" }).lean();

export const findTenantByStripeCustomerId = (stripeCustomerId) =>
  Tenant.findOne({ stripeCustomerId }).lean();

export const createTenant = async ({ name, slug, plan = "free", settings = {} }) => {
  const tenant = new Tenant({ name, slug, plan, settings });
  return (await tenant.save()).toObject();
};

export const slugExists = (slug) =>
  Tenant.exists({ slug }).then(Boolean);

export default Tenant;
