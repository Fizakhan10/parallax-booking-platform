import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    domain: { type: String, sparse: true },
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
  },
  { timestamps: true }
);

tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ domain: 1 }, { sparse: true });

const Tenant = mongoose.model("Tenant", tenantSchema);

// ── Query helpers ──────────────────────────────────────────

export const findTenantBySlug = (slug) =>
  Tenant.findOne({ slug, status: "active" }).lean();

export const findTenantById = (id) =>
  Tenant.findById(id).lean();

export const findTenantByDomain = (domain) =>
  Tenant.findOne({ domain, status: "active" }).lean();

export const createTenant = async ({ name, slug, plan = "free", settings = {} }) => {
  const tenant = new Tenant({ name, slug, plan, settings });
  return (await tenant.save()).toObject();
};

export const slugExists = (slug) =>
  Tenant.exists({ slug }).then(Boolean);

export default Tenant;
