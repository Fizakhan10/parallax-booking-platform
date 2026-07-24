import { cleanEnv, str, port, bool } from "envalid";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Resolve .env relative to this file (server/src/config/env.js → server/.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "test", "production"], default: "development" }),
  PORT: port({ default: 5000 }),
  CLIENT_URL: str({ default: "http://localhost:5173" }),

  MONGODB_URI: str({ docs: "MongoDB connection string" }),

  JWT_SECRET: str({ docs: "Secret for signing access tokens" }),
  JWT_REFRESH_SECRET: str({ docs: "Secret for signing refresh tokens" }),
  JWT_EXPIRES_IN: str({ default: "1h" }),
  JWT_REFRESH_EXPIRES_IN: str({ default: "7d" }),

  COOKIE_SECRET: str({ docs: "Secret for signing cookies" }),

  BASE_DOMAIN: str({ default: "localhost:5173" }),
  SUBDOMAIN_ENABLED: bool({ default: false }),
});

export default env;
