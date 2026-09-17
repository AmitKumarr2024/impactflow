import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("app", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/projects without a token is rejected by the backend, not just the frontend", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/projects with a malformed token is rejected", async () => {
    const res = await request(app).get("/api/projects").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("unknown routes return a clean 404, not a stack trace", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("an invalid request body returns 400, not 500", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("chat endpoints require authentication", async () => {
    const res = await request(app).get("/api/projects/000000000000000000000000/chat/messages");
    expect(res.status).toBe(401);
  });
});
