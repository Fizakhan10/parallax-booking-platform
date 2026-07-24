import { findTenantBySlug, findTenantByDomain } from "../models/tenant.model.js";
import env from "../config/env.js";

/**
 * Normalise a Mongoose tenant doc to have consistent .id field
 */
const normalizeTenant = (t) => {
  if (!t) return null;
  return { ...t, id: t._id?.toString() || t.id };
};

/**
 * Tenant Detection Middleware
 */
export const detectTenant = async (req, res, next) => {
  try {
    let tenant = null;

    // Strategy 1: X-Tenant-Slug header (dev / frontend)
    const slugHeader = req.headers["x-tenant-slug"];
    if (slugHeader) {
      tenant = normalizeTenant(await findTenantBySlug(slugHeader));
    }

    // Strategy 2: Subdomain extraction
    if (!tenant && env.SUBDOMAIN_ENABLED) {
      const host = req.headers.host || "";
      const baseDomain = env.BASE_DOMAIN;
      const hostWithoutPort = host.split(":")[0];
      const baseWithoutPort = baseDomain.split(":")[0];

      if (hostWithoutPort !== baseWithoutPort && hostWithoutPort.endsWith(`.${baseWithoutPort}`)) {
        const subdomain = hostWithoutPort.replace(`.${baseWithoutPort}`, "");
        if (subdomain) tenant = normalizeTenant(await findTenantBySlug(subdomain));
      }

      if (!tenant) {
        tenant = normalizeTenant(await findTenantByDomain(host));
      }
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found. Check your workspace subdomain.",
      });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    console.error("Tenant detection error:", err);
    res.status(500).json({ success: false, message: "Failed to identify tenant" });
  }
};

export const optionalTenantDetection = async (req, res, next) => {
  try {
    const slug = req.headers["x-tenant-slug"];
    if (slug) {
      const t = await findTenantBySlug(slug);
      if (t) req.tenant = { ...t, id: t._id?.toString() || t.id };
    }
    next();
  } catch {
    next();
  }
};
