// env.js loads dotenv itself — must be imported first
import env from "./src/config/env.js";
import http from "http";
import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { attachCollaborationServer } from "./src/collaboration/yjsServer.js";

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();

  // Wrap Express in a plain http.Server so the WebSocket upgrade handler
  // can share the same port — no extra port required.
  const httpServer = http.createServer(app);

  // Attach the Yjs / WebSocket collaboration server
  attachCollaborationServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${env.NODE_ENV}`);
    console.log(`🔐 Multi-tenant API ready (MongoDB)\n`);
    console.log(`   Health:        http://localhost:${PORT}/health`);
    console.log(`   Auth:          http://localhost:${PORT}/api/auth/*`);
    console.log(`   Tenants:       http://localhost:${PORT}/api/tenants/*`);
    console.log(`   Dashboard:     http://localhost:${PORT}/api/dashboard/*`);
    console.log(`   Collaboration: ws://localhost:${PORT}/collaboration/:bookingId\n`);
  });
};

startServer();
