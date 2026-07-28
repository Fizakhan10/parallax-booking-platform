/**
 * MongoDB Seed Script — Week 1 + Week 2 (Bookings)
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
import Booking from "../models/booking.model.js";

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🌱 Connected to MongoDB, seeding...\n");

  // Clear existing data
  await Booking.deleteMany({});
  await User.deleteMany({});
  await Tenant.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  // ── Tenants ──────────────────────────────────────────────
  const tenants = [
    { name: "Acme Corporation", slug: "acme",      plan: "enterprise", settings: { branding: { primaryColor: "#1a73e8" } } },
    { name: "TechStart Inc",    slug: "techstart", plan: "pro",        settings: { branding: { primaryColor: "#7c3aed" } } },
    { name: "Creative Studio",  slug: "creative",  plan: "starter",    settings: { branding: { primaryColor: "#ec4899" } } },
  ];
  const tenantDocs = await Tenant.insertMany(tenants);
  const tenantMap  = Object.fromEntries(tenantDocs.map((t) => [t.slug, t._id]));
  console.log("✅ Tenants created");

  // ── Users ────────────────────────────────────────────────
  const usersData = [
    { tenantSlug: "acme",      email: "admin@acme.com",        fullName: "John Smith",       role: "owner"  },
    { tenantSlug: "acme",      email: "manager@acme.com",      fullName: "Sarah Johnson",    role: "admin"  },
    { tenantSlug: "acme",      email: "user@acme.com",         fullName: "Mike Davis",       role: "member" },
    { tenantSlug: "techstart", email: "ceo@techstart.com",     fullName: "Emily Chen",       role: "owner"  },
    { tenantSlug: "techstart", email: "dev@techstart.com",     fullName: "Alex Kumar",       role: "member" },
    { tenantSlug: "creative",  email: "founder@creative.com",  fullName: "Jessica Martinez", role: "owner"  },
    { tenantSlug: "creative",  email: "designer@creative.com", fullName: "Tom Wilson",       role: "member" },
  ];
  const userDocs = [];
  for (const u of usersData) {
    const doc = await User.create({ tenantId: tenantMap[u.tenantSlug], email: u.email, passwordHash, fullName: u.fullName, role: u.role });
    userDocs.push({ ...u, _id: doc._id });
  }
  console.log("✅ Users created");

  // ── Bookings for Acme ────────────────────────────────────
  const acmeTenantId = tenantMap["acme"];
  const acmeOwner    = userDocs.find(u => u.email === "admin@acme.com")._id;

  const now    = new Date();
  const day    = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const dt     = (offset, h, m = 0) => { const d = day(offset); d.setHours(h, m, 0, 0); return d; };

  const bookings = [
    // Past
    { title: "Initial Consultation – Acme Website Redesign", clientName: "Laura Chen",   clientEmail: "laura@client.com",  clientPhone: "+1-555-0101", serviceType: "Consultation",  startTime: dt(-8, 10), endTime: dt(-8, 11),    status: "completed", location: "Zoom Call",         notes: "Discussed brand guidelines and colour palette." },
    { title: "Sprint Planning Session",                       clientName: "Dev Team",      clientEmail: "devteam@acme.com",  clientPhone: "",            serviceType: "Internal",       startTime: dt(-5, 9),  endTime: dt(-5, 10, 30), status: "completed", location: "Conference Room A", notes: "Q3 sprint kickoff." },
    { title: "Logo Design Review",                            clientName: "Marcus Webb",   clientEmail: "marcus@webb.io",    clientPhone: "+1-555-0202", serviceType: "Design Review",  startTime: dt(-3, 14), endTime: dt(-3, 15),    status: "completed", location: "Google Meet",       notes: "" },
    { title: "SEO Audit Presentation",                        clientName: "Nina Patel",    clientEmail: "nina@patel.co",     clientPhone: "+1-555-0303", serviceType: "Presentation",   startTime: dt(-1, 11), endTime: dt(-1, 12),    status: "cancelled", location: "Office – Floor 2",  notes: "Client rescheduled." },
    // Today
    { title: "UX Walkthrough – Mobile App",                   clientName: "Chris Jordan",  clientEmail: "chris@jordan.dev",  clientPhone: "+1-555-0404", serviceType: "UX Review",      startTime: dt(0,  10), endTime: dt(0,  11),    status: "confirmed", location: "Teams Call",        notes: "Focus on onboarding flow." },
    { title: "Contract Signing – Phase 2",                    clientName: "Acme Legal",    clientEmail: "legal@acme.com",    clientPhone: "",            serviceType: "Legal",          startTime: dt(0,  15), endTime: dt(0,  15, 30), status: "pending",   location: "Boardroom",         notes: "" },
    // Future
    { title: "Kickoff – New CRM Integration",                 clientName: "Olga Petrov",   clientEmail: "olga@crm.tech",     clientPhone: "+1-555-0505", serviceType: "Kickoff",        startTime: dt(1,  9),  endTime: dt(1,  10),    status: "confirmed", location: "Zoom",              notes: "Share API docs beforehand." },
    { title: "Monthly Strategy Review",                       clientName: "Board Members", clientEmail: "board@acme.com",    clientPhone: "",            serviceType: "Strategy",       startTime: dt(2,  13), endTime: dt(2,  15),    status: "confirmed", location: "Conference Room B", notes: "" },
    { title: "Design System Handoff",                         clientName: "Front-end Team",clientEmail: "frontend@acme.com", clientPhone: "",            serviceType: "Handoff",        startTime: dt(3,  10), endTime: dt(3,  11),    status: "pending",   location: "Slack Huddle",      notes: "" },
    { title: "Investor Demo Preparation",                     clientName: "Sarah Johnson", clientEmail: "manager@acme.com",  clientPhone: "",            serviceType: "Internal",       startTime: dt(4,  14), endTime: dt(4,  16),    status: "pending",   location: "Boardroom",         notes: "Rehearse deck." },
    { title: "Client Onboarding – Beta Users",                clientName: "Beta Group A",  clientEmail: "beta@acme.com",     clientPhone: "+1-555-0606", serviceType: "Onboarding",     startTime: dt(5,  9),  endTime: dt(5,  10),    status: "pending",   location: "Zoom",              notes: "" },
    { title: "Q3 Retrospective",                              clientName: "Full Team",     clientEmail: "team@acme.com",     clientPhone: "",            serviceType: "Internal",       startTime: dt(7,  16), endTime: dt(7,  17),    status: "pending",   location: "Office",            notes: "" },
    { title: "Product Roadmap Presentation",                  clientName: "Mike Davis",    clientEmail: "user@acme.com",     clientPhone: "",            serviceType: "Presentation",   startTime: dt(10, 11), endTime: dt(10, 12),    status: "pending",   location: "Conference Room A", notes: "" },
    { title: "No Show Example",                               clientName: "Ghost Client",  clientEmail: "ghost@example.com", clientPhone: "",            serviceType: "Consultation",   startTime: dt(-2, 10), endTime: dt(-2, 11),    status: "no_show",   location: "Zoom",              notes: "Did not attend." },
  ];

  for (const b of bookings) {
    await Booking.create({ ...b, tenantId: acmeTenantId, createdBy: acmeOwner });
  }
  console.log(`✅ ${bookings.length} bookings created for Acme`);

  console.log("\n📋 Test Credentials (password: password123)");
  console.log("   acme      → admin@acme.com (owner)");
  console.log("   techstart → ceo@techstart.com (owner)");
  console.log("   creative  → founder@creative.com (owner)");
  await mongoose.disconnect();
};

seed().catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); });
