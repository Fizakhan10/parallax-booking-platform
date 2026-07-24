import mongoose from "mongoose";

// ── User schema ────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Unique email per tenant (RBAC/multi-tenant isolation at app level)
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

// ── Refresh token schema ───────────────────────────────────
const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 0 }, // TTL handled by expiresAt check
});

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

// ── Helpers ────────────────────────────────────────────────

const safeUser = (u) => {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : { ...u };
  obj.id           = obj._id?.toString();
  obj.full_name    = obj.fullName;
  obj.password_hash = obj.passwordHash;   // needed by auth controller
  obj.avatar_url   = obj.avatarUrl;
  obj.is_active    = obj.isActive;
  obj.last_login_at = obj.lastLoginAt;
  obj.created_at   = obj.createdAt;
  obj.tenant_id    = obj.tenantId?.toString();
  return obj;
};

export const findUserByEmail = async (tenantId, email) => {
  const u = await User.findOne({ tenantId, email: email.toLowerCase(), isActive: true });
  return u ? safeUser(u) : null;
};

export const findUserById = async (tenantId, userId) => {
  const u = await User.findOne({ _id: userId, tenantId });
  return u ? safeUser(u) : null;
};

export const findAllUsersByTenant = async (tenantId) => {
  const users = await User.find({ tenantId }).sort({ createdAt: 1 }).lean();
  return users.map((u) => ({
    ...u,
    id: u._id?.toString(),
    full_name: u.fullName,
    avatar_url: u.avatarUrl,
    is_active: u.isActive,
    last_login_at: u.lastLoginAt,
    created_at: u.createdAt,
    tenant_id: u.tenantId?.toString(),
  }));
};

export const createUser = async ({ tenantId, email, passwordHash, fullName, role = "member" }) => {
  const user = new User({ tenantId, email: email.toLowerCase(), passwordHash, fullName, role });
  const saved = await user.save();
  return safeUser(saved);
};

export const updateLastLogin = (userId) =>
  User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });

export const saveRefreshToken = (userId, tenantId, tokenHash, expiresAt) =>
  RefreshToken.create({ userId, tenantId, tokenHash, expiresAt });

export const findRefreshToken = async (tokenHash) => {
  const t = await RefreshToken.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).populate("userId", "email fullName role").lean();
  if (!t) return null;
  return {
    ...t,
    id: t._id?.toString(),
    user_id: t.userId?._id?.toString(),
    tenant_id: t.tenantId?.toString(),
    email: t.userId?.email,
    full_name: t.userId?.fullName,
    role: t.userId?.role,
  };
};

export const deleteRefreshToken = (tokenHash) =>
  RefreshToken.deleteOne({ tokenHash });

export const deleteAllUserRefreshTokens = (userId) =>
  RefreshToken.deleteMany({ userId });

export { User, RefreshToken };
