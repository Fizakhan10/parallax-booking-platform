// env.js loads dotenv itself — must be imported first
import env from "./src/config/env.js";
import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${env.NODE_ENV}`);
    console.log(`🔐 Multi-tenant API ready (MongoDB)\n`);
    console.log(`   Health:    http://localhost:${PORT}/health`);
    console.log(`   Auth:      http://localhost:${PORT}/api/auth/*`);
    console.log(`   Tenants:   http://localhost:${PORT}/api/tenants/*`);
    console.log(`   Dashboard: http://localhost:${PORT}/api/dashboard/*\n`);
  });
};

startServer();
