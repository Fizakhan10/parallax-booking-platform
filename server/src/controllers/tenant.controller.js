import Tenant from "../models/tenant.model.js";
import { createUser, saveRefreshToken } from "../models/user.model.js";
import { slugExists } from "../models/tenant.model.js";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "../utils/jwt.js";
import { validationResult } from "express-validator";

/**
 * POST /api/tenants/onboard
 */
export const onboardTenant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { tenantName, slug, ownerEmail, ownerPassword, ownerName, plan = "free" } = req.body;

  try {
    if (await slugExists(slug)) {
      return res.status(409).json({
        success: false,
        message: "This subdomain is already taken. Please choose another.",
      });
    }

    // Create tenant
    const tenant = await Tenant.create({ name: tenantName, slug, plan, settings: {} });
    const tenantId = tenant._id.toString();

    const passwordHash = await bcrypt.hash(ownerPassword, 12);

    // Create owner
    const owner = await createUser({
      tenantId,
      email: ownerEmail,
      passwordHash,
      fullName: ownerName,
      role: "owner",
    });

    const accessToken = generateAccessToken(owner.id, tenantId, owner.role);
    const refreshToken = generateRefreshToken(owner.id, tenantId);
    await saveRefreshToken(owner.id, tenantId, hashToken(refreshToken), getRefreshTokenExpiry());

    return res.status(201).json({
      success: true,
      message: "Tenant created successfully!",
      data: {
        tenant: {
          id: tenantId,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
        },
        user: {
          id: owner.id,
          email: owner.email,
          fullName: owner.full_name,
          role: owner.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("Tenant onboarding error:", err);
    res.status(500).json({ success: false, message: "Onboarding failed" });
  }
};

/**
 * GET /api/tenants/check-slug/:slug
 */
export const checkSlugAvailability = async (req, res) => {
  const { slug } = req.params;
  const reserved = ["www", "api", "app", "admin", "mail", "support", "help", "docs"];

  if (reserved.includes(slug.toLowerCase())) {
    return res.status(200).json({ success: true, available: false, message: "This subdomain is reserved" });
  }

  const exists = await slugExists(slug);
  return res.status(200).json({
    success: true,
    available: !exists,
    message: exists ? "Subdomain already taken" : "Subdomain is available",
  });
};

/**
 * GET /api/tenants/current
 */
export const getCurrentTenant = (req, res) => {
  const t = req.tenant;
  return res.status(200).json({
    success: true,
    data: {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      settings: t.settings,
      createdAt: t.createdAt,
    },
  });
};
