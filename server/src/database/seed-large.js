/**
 * Large Dataset Seeder — 100,000 Bookings
 * 
 * Purpose: Test migration performance and zero-downtime behavior
 * Strategy: Batch inserts with progress tracking
 * 
 * Run: node server/src/database/seed-large.js
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

const TARGET_BOOKINGS = 100000;
const BATCH_SIZE = 5000;

// Sample data pools
const serviceTypes = [
  'Consultation', 'Design Review', 'Strategy Session', 'Training',
  'Onboarding', 'Demo', 'Sprint Planning', 'Retrospective',
  'Product Review', 'Technical Audit', 'Workshop', 'Presentation'
];

const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const statusWeights = [0.15, 0.50, 0.25, 0.08, 0.02]; // Realistic distribution

const locations = [
  'Zoom Call', 'Google Meet', 'Microsoft Teams', 'Conference Room A',
  'Conference Room B', 'Boardroom', 'Office - Floor 2', 'Client Site',
  'Phone Call', 'Slack Huddle'
];

const firstNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Jamie', 'Reese', 'Cameron', 'Skylar', 'Peyton', 'Dakota', 'Sage', 'River'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor'
];

function weightedRandom(items, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;
  
  for (let i = 0; i < items.length; i++) {
    if (random < weights[i]) return items[i];
    random -= weights[i];
  }
  
  return items[items.length - 1];
}

function randomDate(startDaysAgo, endDaysAgo) {
  const now = Date.now();
  const start = now - (startDaysAgo * 24 * 60 * 60 * 1000);
  const end = now - (endDaysAgo * 24 * 60 * 60 * 1000);
  const timestamp = start + Math.random() * (end - start);
  
  const date = new Date(timestamp);
  // Set to business hours (8 AM - 6 PM)
  date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  
  return date;
}

function generateBooking(tenantId, createdBy, index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const clientName = `${firstName} ${lastName}`;
  const clientEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`;
  
  // Date range: 180 days ago to 90 days in future
  const startTime = randomDate(180, -90);
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1); // 1-hour bookings
  
  // Determine status based on date
  let status;
  const now = new Date();
  if (startTime < now) {
    status = weightedRandom(
      ['completed', 'cancelled', 'no_show'],
      [0.80, 0.15, 0.05]
    );
  } else {
    status = weightedRandom(
      ['pending', 'confirmed', 'cancelled'],
      [0.30, 0.65, 0.05]
    );
  }
  
  const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  return {
    tenantId,
    createdBy,
    title: `${serviceType} - ${clientName}`,
    clientName,
    clientEmail,
    clientPhone: Math.random() > 0.3 ? `+1-555-${String(index).padStart(4, '0')}` : '',
    serviceType,
    startTime,
    endTime,
    status,
    location,
    notes: Math.random() > 0.5 ? `Auto-generated booking #${index}. ${serviceType} session scheduled.` : '',
    createdAt: new Date(startTime.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000)),
    updatedAt: new Date()
  };
}

async function seed() {
  console.log(`\n🌱 Starting large dataset seed: ${TARGET_BOOKINGS.toLocaleString()} bookings\n`);
  
  const startTime = Date.now();
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Clear existing data
  console.log("🧹 Clearing existing data...");
  await Booking.deleteMany({});
  await User.deleteMany({});
  await Tenant.deleteMany({});
  console.log("✅ Data cleared\n");

  // Create tenants
  console.log("🏢 Creating tenants...");
  const tenants = [
    { name: "Acme Corporation", slug: "acme", plan: "enterprise", settings: { branding: { primaryColor: "#1a73e8" } } },
    { name: "TechStart Inc", slug: "techstart", plan: "pro", settings: { branding: { primaryColor: "#7c3aed" } } },
    { name: "Creative Studio", slug: "creative", plan: "starter", settings: { branding: { primaryColor: "#ec4899" } } },
  ];
  const tenantDocs = await Tenant.insertMany(tenants);
  const tenantMap = Object.fromEntries(tenantDocs.map((t) => [t.slug, t._id]));
  console.log("✅ Tenants created\n");

  // Create users
  console.log("👥 Creating users...");
  const usersData = [
    { tenantSlug: "acme", email: "admin@acme.com", fullName: "John Smith", role: "owner" },
    { tenantSlug: "acme", email: "manager@acme.com", fullName: "Sarah Johnson", role: "admin" },
    { tenantSlug: "acme", email: "user@acme.com", fullName: "Mike Davis", role: "member" },
    { tenantSlug: "techstart", email: "ceo@techstart.com", fullName: "Emily Chen", role: "owner" },
    { tenantSlug: "creative", email: "founder@creative.com", fullName: "Jessica Martinez", role: "owner" },
  ];
  
  const userDocs = [];
  for (const u of usersData) {
    const doc = await User.create({
      tenantId: tenantMap[u.tenantSlug],
      email: u.email,
      passwordHash,
      fullName: u.fullName,
      role: u.role
    });
    userDocs.push({ ...u, _id: doc._id });
  }
  console.log("✅ Users created\n");

  // Generate bookings in batches
  console.log(`📅 Generating ${TARGET_BOOKINGS.toLocaleString()} bookings in batches of ${BATCH_SIZE.toLocaleString()}...\n`);
  
  const acmeTenantId = tenantMap["acme"];
  const acmeOwner = userDocs.find(u => u.email === "admin@acme.com")._id;
  
  let totalInserted = 0;
  const numBatches = Math.ceil(TARGET_BOOKINGS / BATCH_SIZE);

  for (let batchNum = 0; batchNum < numBatches; batchNum++) {
    const batchStartTime = Date.now();
    const bookingsToCreate = Math.min(BATCH_SIZE, TARGET_BOOKINGS - totalInserted);
    const batch = [];

    for (let i = 0; i < bookingsToCreate; i++) {
      batch.push(generateBooking(acmeTenantId, acmeOwner, totalInserted + i));
    }

    await Booking.insertMany(batch, { ordered: false });
    totalInserted += bookingsToCreate;

    const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
    const progress = ((totalInserted / TARGET_BOOKINGS) * 100).toFixed(1);
    const rate = (bookingsToCreate / batchTime).toFixed(0);
    
    console.log(
      `  Batch ${batchNum + 1}/${numBatches}: ` +
      `${totalInserted.toLocaleString()}/${TARGET_BOOKINGS.toLocaleString()} ` +
      `(${progress}%) - ${batchTime}s - ${rate} docs/sec`
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgRate = (TARGET_BOOKINGS / totalTime).toFixed(0);

  console.log(`\n✅ Successfully created ${totalInserted.toLocaleString()} bookings`);
  console.log(`⏱️  Total time: ${totalTime}s (avg ${avgRate} docs/sec)`);
  
  // Verify count
  const count = await Booking.countDocuments();
  console.log(`📊 Verified count: ${count.toLocaleString()} documents\n`);

  console.log("📋 Test Credentials (password: password123)");
  console.log("   acme → admin@acme.com (owner)");
  console.log("   techstart → ceo@techstart.com (owner)");
  console.log("   creative → founder@creative.com (owner)\n");

  await mongoose.disconnect();
  console.log("👋 Disconnected from MongoDB\n");
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
