/**
 * Migration Script
 * Runs schema creation and enables RLS policies
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const runMigration = async () => {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting database migration...");

    const sql = readFileSync(join(__dirname, "init.sql"), "utf8");
    await client.query(sql);

    console.log("✅ Migration completed successfully!");
    console.log("   - tenants table created");
    console.log("   - users table created");
    console.log("   - refresh_tokens table created");
    console.log("   - RLS policies enabled");
    console.log("   - Indexes created");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
