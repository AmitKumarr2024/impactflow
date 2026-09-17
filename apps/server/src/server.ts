import "dotenv/config";
import http from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { initSocket } from "./socket";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[server] ImpactFlow API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
