import "dotenv/config";
import bcrypt from "bcrypt";
import { connectDB, disconnectDB } from "../config/db";
import {
  User,
  Project,
  ProjectMember,
  Material,
  MaterialAlternative,
  Drawing,
  Task,
  Approval,
  ChangeRequest,
  Decision,
  SiteObservation,
  Feedback,
  Notification,
  Activity,
  Message,
} from "../models";

const DEMO_PASSWORD = "Demo@1234";

/**
 * Seeds one fully-connected hero scenario (spec sections 36 & 56):
 * client requests a bathroom marble change -> Impact Engine finds the
 * supplier/drawing/tasks/approval it touches -> supplier marks the original
 * unavailable and proposes an alternative -> approval blocks procurement +
 * installation -> installer later files a site observation + feedback.
 *
 * Every relationship here is data the Impact Engine will actually walk at
 * runtime -- nothing about the "connectedness" is hardcoded in the UI.
 */
async function seed() {
  await connectDB();

  console.log("[seed] Clearing existing demo data...");
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    ProjectMember.deleteMany({}),
    Material.deleteMany({}),
    MaterialAlternative.deleteMany({}),
    Drawing.deleteMany({}),
    Task.deleteMany({}),
    Approval.deleteMany({}),
    ChangeRequest.deleteMany({}),
    Decision.deleteMany({}),
    SiteObservation.deleteMany({}),
    Feedback.deleteMany({}),
    Notification.deleteMany({}),
    Activity.deleteMany({}),
    Message.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("[seed] Creating demo users...");
  const [admin, client, architect, designer, consultant, contractor, supplier, fabricator, installer] =
    await Promise.all([
      User.create({ name: "ImpactFlow Admin", email: "admin@impactflow.demo", passwordHash, role: "ADMIN", verificationStatus: "VERIFIED" }),
      User.create({ name: "Aarav Mehta", email: "client@impactflow.demo", passwordHash, role: "CLIENT", verificationStatus: "VERIFIED" }),
      User.create({ name: "Riya Sharma", email: "architect@impactflow.demo", passwordHash, role: "ARCHITECT", verificationStatus: "VERIFIED" }),
      User.create({ name: "Neha Kapoor", email: "designer@impactflow.demo", passwordHash, role: "INTERIOR_DESIGNER", verificationStatus: "VERIFIED" }),
      User.create({ name: "Dr. Arjun Rao", email: "consultant@impactflow.demo", passwordHash, role: "CONSULTANT", verificationStatus: "VERIFIED" }),
      User.create({ name: "Vikram Singh", email: "contractor@impactflow.demo", passwordHash, role: "CONTRACTOR", verificationStatus: "VERIFIED", company: "XYZ Construction" }),
      User.create({ name: "BuildMart Supplies", email: "supplier@impactflow.demo", passwordHash, role: "SUPPLIER", verificationStatus: "VERIFIED", company: "BuildMart Supplies" }),
      User.create({ name: "PrecisionFab", email: "fabricator@impactflow.demo", passwordHash, role: "FABRICATOR", verificationStatus: "VERIFIED", company: "PrecisionFab" }),
      User.create({ name: "Raj Installations", email: "installer@impactflow.demo", passwordHash, role: "INSTALLER", verificationStatus: "VERIFIED", company: "Raj Installations" }),
    ]);

  console.log("[seed] Creating project...");
  const project = await Project.create({
    name: "Greenwood Residence",
    projectCode: "GWR-001",
    description: "A 4BHK residential renovation with a full interior fit-out.",
    client: client._id,
    location: "Bengaluru, India",
    status: "ACTIVE",
    startDate: new Date("2026-06-01"),
    expectedEndDate: new Date("2026-12-15"),
    createdBy: admin._id,
  });

  const members = [
    { userId: admin._id, role: "ADMIN" as const },
    { userId: client._id, role: "CLIENT" as const },
    { userId: architect._id, role: "ARCHITECT" as const },
    { userId: designer._id, role: "INTERIOR_DESIGNER" as const },
    { userId: consultant._id, role: "CONSULTANT" as const },
    { userId: contractor._id, role: "CONTRACTOR" as const },
    { userId: supplier._id, role: "SUPPLIER" as const },
    { userId: fabricator._id, role: "FABRICATOR" as const },
    { userId: installer._id, role: "INSTALLER" as const },
  ];
  await ProjectMember.insertMany(
    members.map((m) => ({ projectId: project._id, userId: m.userId, role: m.role, permissions: ["*"] }))
  );

  console.log("[seed] Creating drawing...");
  const bathroomDrawing = await Drawing.create({
    projectId: project._id,
    name: "Bathroom Layout",
    category: "Bathroom",
    revision: 4,
    fileUrl: "https://res.cloudinary.com/demo/image/upload/bathroom-rev04.pdf",
    uploadedBy: architect._id,
    status: "CURRENT",
  });

  console.log("[seed] Creating tasks...");
  const procurementTask = await Task.create({
    projectId: project._id,
    title: "Bathroom Marble Procurement",
    type: "PROCUREMENT",
    status: "NOT_STARTED",
    assignedTo: contractor._id,
    linkedDrawingIds: [bathroomDrawing._id],
  });

  const installationTask = await Task.create({
    projectId: project._id,
    title: "Bathroom Marble Installation",
    type: "INSTALLATION",
    status: "NOT_STARTED",
    assignedTo: installer._id,
    linkedDrawingIds: [bathroomDrawing._id],
  });

  console.log("[seed] Creating material (Calacatta Marble A)...");
  const marbleA = await Material.create({
    projectId: project._id,
    name: "Calacatta Marble A",
    category: "Marble",
    price: 80000,
    leadTimeDays: 12,
    available: true,
    supplierId: supplier._id,
    linkedDrawingIds: [bathroomDrawing._id],
    linkedTaskIds: [procurementTask._id, installationTask._id],
  });

  await Task.updateMany(
    { _id: { $in: [procurementTask._id, installationTask._id] } },
    { $addToSet: { linkedMaterialIds: marbleA._id } }
  );

  console.log("[seed] Creating client approval dependency...");
  const clientApproval = await Approval.create({
    projectId: project._id,
    title: "Client Material Approval — Bathroom Marble",
    requiredFrom: client._id,
    status: "PENDING",
    blockedTaskIds: [procurementTask._id, installationTask._id],
  });

  await Task.updateMany(
    { _id: { $in: [procurementTask._id, installationTask._id] } },
    { status: "BLOCKED", $addToSet: { blockedByApprovalIds: clientApproval._id } }
  );

  console.log("[seed] Creating change request (the hero workflow entry point)...");
  const changeRequest = await ChangeRequest.create({
    projectId: project._id,
    title: "Replace Bathroom Marble",
    description:
      "Client wants to reconsider the selected bathroom marble due to cost and lead time concerns.",
    category: "MATERIAL",
    requestedBy: client._id,
    status: "IMPACT_REVIEW",
    priority: "HIGH",
    reason: "Client requested cost/lead-time re-evaluation before procurement begins.",
    affectedMaterials: [marbleA._id],
    affectedDrawings: [bathroomDrawing._id],
    affectedTasks: [procurementTask._id, installationTask._id],
  });

  await Approval.updateOne({ _id: clientApproval._id }, { changeRequestId: changeRequest._id });

  console.log("[seed] Supplier marks Marble A unavailable and proposes Carrara Marble B...");
  await Material.updateOne(
    { _id: marbleA._id },
    { available: false, unavailableReason: "Quarry delay — Calacatta Marble A is out of stock for 8+ weeks." }
  );

  const alternative = await MaterialAlternative.create({
    materialId: marbleA._id,
    proposedBy: supplier._id,
    name: "Carrara Marble B",
    price: 88000,
    leadTimeDays: 5,
    priceDelta: 8000,
    leadTimeDeltaDays: -7,
    notes: "Comparable veining pattern, in stock, faster lead time than the original selection.",
    requiresApproval: true,
    status: "PROPOSED",
  });

  console.log("[seed] Creating current decision (proposed, pending client approval)...");
  const decision = await Decision.create({
    projectId: project._id,
    title: "Use Carrara Marble B for bathroom",
    description: "Proposed replacement for Calacatta Marble A following supplier unavailability.",
    decisionType: "MATERIAL",
    relatedChangeRequest: changeRequest._id,
    status: "PENDING",
    rationale: "Faster lead time offsets a modest cost increase; comparable aesthetic.",
  });

  console.log("[seed] Creating a site observation + installer feedback for the tail end of the story...");
  const observation = await SiteObservation.create({
    projectId: project._id,
    title: "Bathroom wall width deviation",
    description: "Measured wall width differs from the current drawing.",
    location: "Master bathroom, west wall",
    expectedValue: "2400",
    actualValue: "2335",
    unit: "mm",
    drawingId: bathroomDrawing._id,
    drawingRevision: bathroomDrawing.revision,
    submittedBy: installer._id,
    severity: "MEDIUM",
    status: "OPEN",
  });

  await Feedback.create({
    projectId: project._id,
    title: "Cabinet clearance insufficient for installation",
    description:
      "Current cabinet clearance in the master bathroom is tighter than the drawing suggests, likely due to the wall width deviation.",
    relatedTask: installationTask._id,
    relatedDrawing: bathroomDrawing._id,
    relatedChange: changeRequest._id,
    relatedSiteObservation: observation._id,
    submittedBy: installer._id,
    severity: "MEDIUM",
    status: "OPEN",
  });

  console.log("[seed] Recording activity trail...");
  await Activity.insertMany([
    {
      projectId: project._id,
      actor: client._id,
      actorRole: "CLIENT",
      action: "CHANGE_CREATED",
      entityType: "ChangeRequest",
      entityId: changeRequest._id,
      summary: "Client requested review of the bathroom marble selection.",
    },
    {
      projectId: project._id,
      actor: supplier._id,
      actorRole: "SUPPLIER",
      action: "MATERIAL_UNAVAILABLE",
      entityType: "Material",
      entityId: marbleA._id,
      summary: "Supplier marked Calacatta Marble A unavailable and proposed Carrara Marble B.",
    },
    {
      projectId: project._id,
      actor: installer._id,
      actorRole: "INSTALLER",
      action: "SITE_OBSERVATION_CREATED",
      entityType: "SiteObservation",
      entityId: observation._id,
      summary: "Installer flagged a wall width deviation from the current drawing.",
    },
  ]);

  console.log("[seed] Sending a couple of demo notifications...");
  await Notification.insertMany([
    {
      userId: architect._id,
      projectId: project._id,
      title: "Impact analysis ready: Replace Bathroom Marble",
      message: "This change affects 1 material, 2 tasks, and 1 approval. Run Analyze Impact to see the full report.",
      entityType: "ChangeRequest",
      entityId: changeRequest._id,
    },
    {
      userId: client._id,
      projectId: project._id,
      title: "Your approval is blocking 2 activities",
      message: "Client Material Approval — Bathroom Marble is blocking procurement and installation.",
      entityType: "Approval",
      entityId: clientApproval._id,
    },
  ]);

  console.log("[seed] Seeding a starter chat thread...");
  await Message.insertMany([
    {
      projectId: project._id,
      senderId: admin._id,
      body: "Welcome to the Greenwood Residence project chat -- everyone on the team can post here.",
      readBy: [admin._id],
    },
    {
      projectId: project._id,
      senderId: architect._id,
      body: "Thanks! I'll post updates on the bathroom marble change here as it moves through review.",
      readBy: [admin._id, architect._id],
    },
    {
      projectId: project._id,
      senderId: supplier._id,
      body: "Heads up -- Calacatta Marble A is delayed at the quarry, proposing Carrara Marble B as a faster alternative.",
      readBy: [admin._id, architect._id, supplier._id],
    },
  ]);

  console.log("\n[seed] Done. Demo accounts (password: " + DEMO_PASSWORD + "):");
  members.forEach((m, i) => {
    const emails = [
      "admin@impactflow.demo",
      "client@impactflow.demo",
      "architect@impactflow.demo",
      "designer@impactflow.demo",
      "consultant@impactflow.demo",
      "contractor@impactflow.demo",
      "supplier@impactflow.demo",
      "fabricator@impactflow.demo",
      "installer@impactflow.demo",
    ];
    console.log(`  ${m.role.padEnd(18)} ${emails[i]}`);
  });

  await disconnectDB();
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
