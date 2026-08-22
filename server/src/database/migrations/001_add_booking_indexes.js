/**
 * Migration 001: Add Performance Indexes to Bookings Collection
 * 
 * Purpose: Optimize query performance for large datasets (100k+ rows)
 * Strategy: Zero-downtime - indexes created in background
 * 
 * Run: node server/src/database/migrations/001_add_booking_indexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

const MIGRATION_NAME = '001_add_booking_indexes';

// Migration tracking schema
const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  error: String
});

const Migration = mongoose.model('Migration', migrationSchema);

async function up() {
  console.log(`\n🔄 Running migration: ${MIGRATION_NAME}\n`);

  const db = mongoose.connection.db;
  const bookingsCollection = db.collection('bookings');

  // Check if indexes already exist
  const existingIndexes = await bookingsCollection.indexes();
  const indexNames = existingIndexes.map(idx => idx.name);

  console.log('📊 Existing indexes:', indexNames.join(', '));

  // Create indexes in background (zero-downtime)
  const indexesToCreate = [
    {
      key: { tenantId: 1, startTime: 1 },
      name: 'idx_tenant_startTime',
      background: true,
      comment: 'Optimize booking list queries by tenant and time'
    },
    {
      key: { tenantId: 1, status: 1 },
      name: 'idx_tenant_status',
      background: true,
      comment: 'Filter bookings by status within tenant'
    },
    {
      key: { tenantId: 1, createdBy: 1 },
      name: 'idx_tenant_createdBy',
      background: true,
      comment: 'User-specific booking queries'
    },
    {
      key: { startTime: 1, endTime: 1 },
      name: 'idx_time_range',
      background: true,
      comment: 'Date range queries for calendar view'
    },
    {
      key: { clientEmail: 1 },
      name: 'idx_clientEmail',
      background: true,
      sparse: true,
      comment: 'Client lookup optimization'
    }
  ];

  for (const indexSpec of indexesToCreate) {
    if (indexNames.includes(indexSpec.name)) {
      console.log(`⏭️  Index "${indexSpec.name}" already exists, skipping`);
      continue;
    }

    console.log(`✨ Creating index: ${indexSpec.name}...`);
    try {
      await bookingsCollection.createIndex(indexSpec.key, {
        name: indexSpec.name,
        background: indexSpec.background,
        sparse: indexSpec.sparse,
        comment: indexSpec.comment
      });
      console.log(`✅ Created index: ${indexSpec.name}`);
    } catch (error) {
      console.error(`❌ Failed to create index ${indexSpec.name}:`, error.message);
      throw error;
    }
  }

  console.log('\n✅ Migration completed successfully\n');
}

async function down() {
  console.log(`\n🔄 Rolling back migration: ${MIGRATION_NAME}\n`);

  const db = mongoose.connection.db;
  const bookingsCollection = db.collection('bookings');

  const indexesToDrop = [
    'idx_tenant_startTime',
    'idx_tenant_status',
    'idx_tenant_createdBy',
    'idx_time_range',
    'idx_clientEmail'
  ];

  for (const indexName of indexesToDrop) {
    try {
      await bookingsCollection.dropIndex(indexName);
      console.log(`✅ Dropped index: ${indexName}`);
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log(`⏭️  Index "${indexName}" does not exist, skipping`);
      } else {
        console.error(`❌ Failed to drop index ${indexName}:`, error.message);
        throw error;
      }
    }
  }

  console.log('\n✅ Rollback completed successfully\n');
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Check if migration already applied
    const existing = await Migration.findOne({ name: MIGRATION_NAME });
    if (existing && existing.status === 'completed') {
      console.log(`⏭️  Migration "${MIGRATION_NAME}" already applied`);
      process.exit(0);
    }

    // Record migration start
    const migrationRecord = await Migration.findOneAndUpdate(
      { name: MIGRATION_NAME },
      { status: 'pending', appliedAt: new Date() },
      { upsert: true, new: true }
    );

    const action = process.argv[2] || 'up';

    if (action === 'up') {
      await up();
      migrationRecord.status = 'completed';
      await migrationRecord.save();
    } else if (action === 'down') {
      await down();
      await Migration.deleteOne({ name: MIGRATION_NAME });
    } else {
      console.error('❌ Invalid action. Use "up" or "down"');
      process.exit(1);
    }

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);

    // Record failure
    try {
      await Migration.findOneAndUpdate(
        { name: MIGRATION_NAME },
        { status: 'failed', error: error.message }
      );
    } catch (e) {
      console.error('Failed to record migration failure:', e);
    }

    await mongoose.disconnect();
    process.exit(1);
  }
}

run();
