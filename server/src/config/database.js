import mongoose from "mongoose";
import env from "./env.js";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(env.MONGODB_URI);
    isConnected = true;
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err);
});

export default mongoose;
