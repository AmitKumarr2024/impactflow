import mongoose from "mongoose";

let isConnected = false;

// Serverless-friendly connection cache: avoids reconnecting on every
// invocation while still working fine for a long-running local server.
export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  isConnected = true;
  console.log("[db] connected to MongoDB");
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
