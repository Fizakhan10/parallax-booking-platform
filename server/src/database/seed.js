/**
 * MongoDB Seed Script
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Tenant from "../models/tenant.model.js";
import { User } from "../models/user.model.js";

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🌱 Connected to MongoDB, seeding...");

  // Clear existing
  await Tenant.deleteMany({});
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  const tenants = [
    { name: "Acme Corporation", slug: "acme", plan: "enterprise", settings: { branding: { primaryColor: "#1a73e8" } } },
    { name: "TechStart Inc",    slug: "techstart", plan: "pro",   settings: { branding: { primaryColor: "#7c3aed" } } },
    { name: "Creative Studio",  slug: "creative",  plan: "starter", settings: { branding: { primaryColor: "#ec4899" } } },
  ];

  const tenantDocs = await Tenant.insertMany(tenants);
  const tenantMap = Object.fromEntries(tenantDocs.map((t) => [t.slug, t._id]));

  const users = [
    { tenantSlug: "acme",      email: "admin@acme.com",         fullName: "John Smith",       role: "owner"  },
    { tenantSlug: "acme",      email: "manager@acme.com",       fullName: "Sarah Johnson",    role: "admin"  },
    { tenantSlug: "acme",      email: "user@acme.com",          fullName: "Mike Davis",       role: "member" },
    { tenantSlug: "techstart", email: "ceo@techstart.com",      fullName: "Emily Chen",       role: "owner"  },
    { tenantSlug: "techstart", email: "dev@techstart.com",      fullName: "Alex Kumar",       role: "member" },
    { tenantSlug: "creative",  email: "founder@creative.com",   fullName: "Jessica Martinez", role: "owner"  },
    { tenantSlug: "creative",  email: "designer@creative.com",  fullName: "Tom Wilson",       role: "member" },
  ];

  for (const u of users) {
    await User.create({
      tenantId: tenantMap[u.tenantSlug],
      email: u.email,
      passwordHash,
      fullName: u.fullName,
      role: u.role,
    });
    console.log(`  ✓ ${u.email} (${u.role}) → ${u.tenantSlug}`);
  }

  console.log("\n✅ Seed complete! Password for all: password123");
  console.log("   Slugs: acme · techstart · creative");
  await mongoose.disconnect();
};

seed().catch((e) => { console.error(e); process.exit(1); });
