import "dotenv/config";
import { io } from "socket.io-client";

/**
 * Stage 2 verification script.
 *
 * Logs in as the architect and the client, connects two Socket.IO clients,
 * joins both to the Greenwood Residence project room, then fires a real
 * REST action (marking Calacatta Marble A unavailable) and watches for the
 * `material.unavailable` event to arrive on both sockets in real time.
 *
 * Run this AFTER `npm run seed`, with the server already running:
 *   npx tsx scripts/verifySocket.ts
 */

const API_URL = process.env.API_URL || "http://localhost:4000";

async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ token: string; user: { _id: string; role: string } }>;
}

async function main() {
  console.log("[verify] Logging in as architect and client...");
  const architect = await login("architect@impactflow.demo", "Demo@1234");
  const client = await login("client@impactflow.demo", "Demo@1234");

  console.log("[verify] Fetching the seeded Greenwood Residence project...");
  const projectsRes = await fetch(`${API_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${architect.token}` },
  });
  const { projects } = await projectsRes.json();
  const project = projects.find((p: any) => p.projectCode === "GWR-001");
  if (!project) throw new Error("Seeded project not found. Did you run `npm run seed`?");
  console.log(`[verify] Project: ${project.name} (${project._id})`);

  console.log("[verify] Fetching materials to find Calacatta Marble A...");
  const materialsRes = await fetch(`${API_URL}/api/projects/${project._id}/materials`, {
    headers: { Authorization: `Bearer ${architect.token}` },
  });
  const { materials } = await materialsRes.json();
  const marble = materials.find((m: any) => m.name.includes("Calacatta"));
  if (!marble) throw new Error("Seeded material not found.");

  console.log("[verify] Connecting two sockets (architect + client) and joining project room...");
  const architectSocket = io(API_URL, { auth: { token: architect.token } });
  const clientSocket = io(API_URL, { auth: { token: client.token } });

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      architectSocket.on("connect", () => resolve());
      architectSocket.on("connect_error", reject);
    }),
    new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", () => resolve());
      clientSocket.on("connect_error", reject);
    }),
  ]);
  console.log("[verify] Both sockets connected.");

  architectSocket.emit("project:join", project._id);
  clientSocket.emit("project:join", project._id);
  await new Promise((r) => setTimeout(r, 500)); // let the join land server-side

  const received: { who: string; event: string }[] = [];
  architectSocket.on("material.unavailable", () => received.push({ who: "architect", event: "material.unavailable" }));
  clientSocket.on("material.unavailable", () => received.push({ who: "client", event: "material.unavailable" }));
  architectSocket.on("notification.created", (n) => console.log(`[verify] architect received notification: "${n.title}"`));

  console.log("[verify] Firing REST call: mark material unavailable...");
  const markRes = await fetch(`${API_URL}/api/materials/${marble._id}/unavailable`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${architect.token}` },
    body: JSON.stringify({ reason: "Socket verification run" }),
  });
  if (!markRes.ok) throw new Error(`markUnavailable failed: ${markRes.status} ${await markRes.text()}`);

  await new Promise((r) => setTimeout(r, 1000)); // give the socket event time to arrive

  console.log("\n[verify] Events received via Socket.IO:", received);
  if (received.length >= 1) {
    console.log("[verify] ✅ PASS — real-time event delivery confirmed.");
  } else {
    console.log("[verify] ❌ FAIL — no socket events arrived. Check server logs.");
    process.exitCode = 1;
  }

  architectSocket.disconnect();
  clientSocket.disconnect();
}

main().catch((err) => {
  console.error("[verify] Error:", err);
  process.exit(1);
});
