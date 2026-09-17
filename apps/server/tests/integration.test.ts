import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/models/User";

/**
 * These tests hit a REAL database -- unlike tests/app.test.ts, which only
 * exercises the Express layer. They only run if TEST_MONGODB_URI is set,
 * because this sandbox has no route to MongoDB Atlas or a local mongod
 * binary. On your machine, point it at a scratch database (never your real
 * demo data -- these tests create and tear down their own project):
 *
 *   $env:TEST_MONGODB_URI = "mongodb+srv://.../impactflow-test"
 *   npx vitest run tests/integration.test.ts
 */
const TEST_URI = process.env.TEST_MONGODB_URI;
const describeIfDb = TEST_URI ? describe : describe.skip;

describeIfDb("hero workflow (live database)", () => {
  let token: string;
  let adminToken: string;
  let projectId: string;
  let changeId: string;

  beforeAll(async () => {
    await mongoose.connect(TEST_URI!);

    // ADMIN is deliberately excluded from self-registration (spec decision:
    // admin access is granted only by directly editing the database). So the
    // test creates its own admin user the same way a real operator would --
    // directly in the database -- rather than going through the public API.
    const passwordHash = await bcrypt.hash("TestPass123!", 10);
    await User.create({
      name: "Test Admin",
      email: "admin@integration-test.local",
      passwordHash,
      role: "ADMIN",
      gender: "OTHER",
    });
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@integration-test.local", password: "TestPass123!" });
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    // Clean up only what this test suite created.
    const db = mongoose.connection.db;
    if (db) {
      const architectUser = await db.collection("users").findOne({ email: "architect@integration-test.local" });
      if (architectUser) {
        await db.collection("supportmessages").deleteMany({ userId: architectUser._id });
      }
      await db.collection("posts").deleteMany({ content: /Greenwood Residence project!$/ });
      await db.collection("users").deleteMany({ email: /@integration-test\.local$/ });
      const project = await db.collection("projects").findOne({ projectCode: "INTEG-TEST" });
      if (project) await db.collection("messages").deleteMany({ projectId: project._id });
      await db.collection("projects").deleteMany({ projectCode: "INTEG-TEST" });
    }
    await mongoose.disconnect();
  });

  it("registers a new architect", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test Architect",
      email: "architect@integration-test.local",
      password: "TestPass123!",
      role: "ARCHITECT",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
  });

  it("rejects a duplicate registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test Architect",
      email: "architect@integration-test.local",
      password: "TestPass123!",
      role: "ARCHITECT",
    });
    expect(res.status).toBe(409);
  });

  it("rejects self-registration as ADMIN", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Sneaky",
      email: "sneaky-admin@integration-test.local",
      password: "TestPass123!",
      role: "ADMIN",
    });
    expect(res.status).toBe(400);
  });

  it("a non-admin cannot create a project", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Should Fail", projectCode: "SHOULD-FAIL", client: "irrelevant" });
    expect(res.status).toBe(403);
  });

  it("an admin creates a project (company-provisioned)", async () => {
    // `client` on the Project model is a User reference (ObjectId), not free
    // text -- reuse the architect's own id here since this test doesn't need
    // a separate client user to exist.
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Integration Test Project", projectCode: "INTEG-TEST", client: me.body.user._id });
    expect(res.status).toBe(201);
    projectId = res.body.project._id;
  });

  it("the admin adds the architect to the project", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "architect@integration-test.local", role: "ARCHITECT" });
    expect(res.status).toBe(201);

    const getRes = await request(app).get(`/api/projects/${projectId}`).set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
  });

  it("admin can access a project even without an explicit membership record", async () => {
    // The admin IS auto-enrolled as a member on project creation -- to prove
    // the *bypass* itself (not just that auto-enrollment happened), strip
    // that membership row directly and confirm access still works.
    const { ProjectMember } = await import("../src/models/ProjectMember");
    const adminMe = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${adminToken}`);
    await ProjectMember.deleteOne({ projectId, userId: adminMe.body.user._id });

    const res = await request(app)
      .get(`/api/projects/${projectId}/changes`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("admin's project list includes every project, not just ones they're a member of", async () => {
    const res = await request(app).get("/api/projects").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.projects.some((p: any) => p._id === projectId)).toBe(true);
  });

  it("GET /api/admin/overview is admin-only and reports real counts", async () => {
    const forbidden = await request(app).get("/api/admin/overview").set("Authorization", `Bearer ${token}`);
    expect(forbidden.status).toBe(403);

    const res = await request(app).get("/api/admin/overview").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entry = res.body.overview.find((o: any) => o.project._id === projectId);
    expect(entry).toBeTruthy();
    expect(typeof entry.activeChanges).toBe("number");
    expect(typeof entry.pendingApprovals).toBe("number");
    expect(typeof entry.memberCount).toBe("number");
  });

  it("GET /api/admin/users?role=ARCHITECT is admin-only and reports real workload stats", async () => {
    const forbidden = await request(app)
      .get("/api/admin/users?role=ARCHITECT")
      .set("Authorization", `Bearer ${token}`);
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .get("/api/admin/users?role=ARCHITECT")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entry = res.body.users.find((u: any) => u.user.email === "architect@integration-test.local");
    expect(entry).toBeTruthy();
    expect(entry.user.role).toBe("ARCHITECT");
    expect(typeof entry.projectCount).toBe("number");
    expect(typeof entry.openTaskCount).toBe("number");
    // No fabricated fields -- only real, computed numbers are ever returned.
    expect(entry).not.toHaveProperty("rating");
  });

  it("creates a change request under the project", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/changes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test change", description: "Testing the hero workflow", category: "DESIGN" });
    expect(res.status).toBe(201);
    changeId = res.body.change._id;
    expect(res.body.change.status).toBe("SUBMITTED");
  });

  it("linking a material from another project to a change is rejected", async () => {
    // Set up a second, completely unrelated project owned by the same admin,
    // with its own material -- then try to link that material to the FIRST
    // project's change. This must fail.
    const otherProject = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Other Project", projectCode: "OTHER-TEST", client: (await request(app).get("/api/auth/me").set("Authorization", `Bearer ${adminToken}`)).body.user._id });
    const otherMaterial = await request(app)
      .post(`/api/projects/${otherProject.body.project._id}/materials`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Unrelated Material", price: 100, leadTimeDays: 5 });

    const res = await request(app)
      .patch(`/api/changes/${changeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ affectedMaterials: [otherMaterial.body.material._id] });
    expect(res.status).toBe(400);

    await mongoose.connection.db?.collection("projects").deleteMany({ projectCode: "OTHER-TEST" });
    await mongoose.connection.db?.collection("materials").deleteMany({ name: "Unrelated Material" });
  });

  it("linking a material from the SAME project to a change works and the Impact Engine counts it", async () => {
    const material = await request(app)
      .post(`/api/projects/${projectId}/materials`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Rebar", price: 5000, leadTimeDays: 10 });
    expect(material.status).toBe(201);
    const materialId = material.body.material._id;

    const linked = await request(app)
      .patch(`/api/changes/${changeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ affectedMaterials: [materialId] });
    expect(linked.status).toBe(200);
    // Populated, not just a raw id -- the Change Details page needs the name.
    expect(linked.body.change.affectedMaterials[0].name).toBe("Test Rebar");

    const impact = await request(app)
      .post(`/api/changes/${changeId}/analyze`)
      .set("Authorization", `Bearer ${token}`);
    expect(impact.status).toBe(200);
    expect(impact.body.analysis.affectedMaterials.length).toBe(1);

    await mongoose.connection.db?.collection("materials").deleteOne({ _id: new mongoose.Types.ObjectId(materialId) });
  });

  it("runs the Impact Engine on the change and gets a deterministic result", async () => {
    const res = await request(app)
      .post(`/api/changes/${changeId}/analyze`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(res.body.analysis.impactLevel);
    // No linked materials/drawings/tasks were created for this ad-hoc change,
    // so it should correctly report nothing affected -- not fabricate impact.
    expect(res.body.analysis.affectedMaterials).toEqual([]);
  });

  it("approves the change", async () => {
    const res = await request(app)
      .post(`/api/changes/${changeId}/approve`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.change.status).toBe("APPROVED");
  });

  it("a user from a different, unrelated project cannot read this project's changes", async () => {
    const outsider = await request(app).post("/api/auth/register").send({
      name: "Outsider",
      email: "outsider@integration-test.local",
      password: "TestPass123!",
      role: "CONSULTANT",
    });
    const outsiderToken = outsider.body.token;

    const res = await request(app)
      .get(`/api/projects/${projectId}/changes`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(res.status).toBe(403);

    await mongoose.connection.db?.collection("users").deleteOne({ email: "outsider@integration-test.local" });
  });

  it("project members can send and read chat messages", async () => {
    const sendRes = await request(app)
      .post(`/api/projects/${projectId}/chat/messages`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ body: "Welcome to the project chat." });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.message.body).toBe("Welcome to the project chat.");
    expect(sendRes.body.message.senderId.name).toBe("Test Admin");

    const listRes = await request(app)
      .get(`/api/projects/${projectId}/chat/messages`)
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.messages.length).toBeGreaterThan(0);

    const unreadRes = await request(app)
      .get("/api/projects/chat/unread-counts")
      .set("Authorization", `Bearer ${token}`);
    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.unreadByProject[projectId]).toBeGreaterThan(0);

    const readRes = await request(app)
      .post(`/api/projects/${projectId}/chat/read`)
      .set("Authorization", `Bearer ${token}`);
    expect(readRes.status).toBe(200);

    const unreadAfterRes = await request(app)
      .get("/api/projects/chat/unread-counts")
      .set("Authorization", `Bearer ${token}`);
    expect(unreadAfterRes.body.unreadByProject[projectId]).toBeUndefined();
  });

  it("someone outside the project cannot read or send chat messages", async () => {
    const outsider = await request(app).post("/api/auth/register").send({
      name: "Chat Outsider",
      email: "chat-outsider@integration-test.local",
      password: "TestPass123!",
      role: "CONSULTANT",
    });
    const outsiderToken = outsider.body.token;

    const readRes = await request(app)
      .get(`/api/projects/${projectId}/chat/messages`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(readRes.status).toBe(403);

    const sendRes = await request(app)
      .post(`/api/projects/${projectId}/chat/messages`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ body: "I shouldn't be able to post this." });
    expect(sendRes.status).toBe(403);

    await mongoose.connection.db?.collection("users").deleteOne({ email: "chat-outsider@integration-test.local" });
  });

  it("a new user's role starts PENDING, and an admin can verify it", async () => {
    const supplier = await request(app).post("/api/auth/register").send({
      name: "Test Supplier",
      email: "supplier@integration-test.local",
      password: "TestPass123!",
      role: "SUPPLIER",
    });
    expect(supplier.body.user.verificationStatus).toBe("PENDING");
    const supplierToken = supplier.body.token;

    // Not yet an admin -- forbidden.
    const forbidden = await request(app)
      .post(`/api/admin/verifications/${supplier.body.user._id}`)
      .set("Authorization", `Bearer ${supplierToken}`)
      .send({ status: "VERIFIED" });
    expect(forbidden.status).toBe(403);

    const pending = await request(app).get("/api/admin/verifications").set("Authorization", `Bearer ${adminToken}`);
    expect(pending.status).toBe(200);
    expect(pending.body.users.some((u: any) => u.email === "supplier@integration-test.local")).toBe(true);

    const decide = await request(app)
      .post(`/api/admin/verifications/${supplier.body.user._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "VERIFIED" });
    expect(decide.status).toBe(200);
    expect(decide.body.user.verificationStatus).toBe("VERIFIED");
  });

  it("a user can message admin for certification, and any admin can reply", async () => {
    const res = await request(app)
      .post("/api/support/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "Hi, I registered as an architect -- how do I get verified?" });
    expect(res.status).toBe(201);

    // Admin sees it in their inbox.
    const inbox = await request(app).get("/api/support/threads").set("Authorization", `Bearer ${adminToken}`);
    expect(inbox.status).toBe(200);
    expect(inbox.body.threads.length).toBeGreaterThan(0);

    const architectMe = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    const reply = await request(app)
      .post("/api/support/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ body: "You're verified now, welcome aboard!", userId: architectMe.body.user._id });
    expect(reply.status).toBe(201);

    const thread = await request(app).get("/api/support/messages").set("Authorization", `Bearer ${token}`);
    expect(thread.status).toBe(200);
    expect(thread.body.messages.length).toBe(2);
  });

  it("the company feed: post, like, comment, and only the author or admin can delete", async () => {
    const created = await request(app)
      .post("/api/feed")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Excited to be part of the Greenwood Residence project!" });
    expect(created.status).toBe(201);
    const postId = created.body.post._id;

    const list = await request(app).get("/api/feed").set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.posts.some((p: any) => p._id === postId)).toBe(true);

    const liked = await request(app).post(`/api/feed/${postId}/like`).set("Authorization", `Bearer ${adminToken}`);
    expect(liked.status).toBe(200);
    expect(liked.body.liked).toBe(true);

    const commented = await request(app)
      .post(`/api/feed/${postId}/comments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "Welcome to the team!" });
    expect(commented.status).toBe(201);
    expect(commented.body.comments.length).toBe(1);

    // A different, unrelated user cannot delete someone else's post.
    const outsider = await request(app).post("/api/auth/register").send({
      name: "Feed Outsider",
      email: "feed-outsider@integration-test.local",
      password: "TestPass123!",
      role: "CONSULTANT",
    });
    const deleteAttempt = await request(app)
      .delete(`/api/feed/${postId}`)
      .set("Authorization", `Bearer ${outsider.body.token}`);
    expect(deleteAttempt.status).toBe(403);

    // The author can delete their own post.
    const deleteOwn = await request(app).delete(`/api/feed/${postId}`).set("Authorization", `Bearer ${token}`);
    expect(deleteOwn.status).toBe(200);

    await mongoose.connection.db?.collection("users").deleteOne({ email: "feed-outsider@integration-test.local" });
  });
});
