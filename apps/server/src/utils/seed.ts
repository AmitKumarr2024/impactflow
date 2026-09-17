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
 * Seeds one fully-connected hero scenario:
 *
 * Architect raises a bathroom marble change
 *        ↓
 * Impact Engine identifies affected entities
 *        ↓
 * Client approval is required
 *        ↓
 * Procurement + installation are blocked
 *        ↓
 * Supplier proposes an alternative
 *        ↓
 * Client approves the change
 *        ↓
 * Dependent tasks can continue
 *        ↓
 * Installer later reports a site observation + feedback
 *
 * Every relationship here is stored in the database.
 * Nothing about the connected workflow is hardcoded
 * in the UI.
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

  /* ---------------------------------------------------------------------- */
  /* Password                                                               */
  /* ---------------------------------------------------------------------- */

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  /* ---------------------------------------------------------------------- */
  /* Users                                                                  */
  /* ---------------------------------------------------------------------- */

  console.log("[seed] Creating demo users...");

  const [
    admin,
    client,
    architect,
    designer,
    consultant,
    contractor,
    supplier,
    fabricator,
    installer,
  ] = await Promise.all([
    User.create({
      name: "ImpactFlow Admin",
      email: "admin@impactflow.demo",
      passwordHash,
      role: "ADMIN",
      verificationStatus: "VERIFIED",
    }),

    User.create({
      name: "Aarav Mehta",
      email: "client@impactflow.demo",
      passwordHash,
      role: "CLIENT",
      verificationStatus: "VERIFIED",
    }),

    User.create({
      name: "Riya Sharma",
      email: "architect@impactflow.demo",
      passwordHash,
      role: "ARCHITECT",
      verificationStatus: "VERIFIED",
    }),

    User.create({
      name: "Neha Kapoor",
      email: "designer@impactflow.demo",
      passwordHash,
      role: "INTERIOR_DESIGNER",
      verificationStatus: "VERIFIED",
    }),

    User.create({
      name: "Dr. Arjun Rao",
      email: "consultant@impactflow.demo",
      passwordHash,
      role: "CONSULTANT",
      verificationStatus: "VERIFIED",
    }),

    User.create({
      name: "Vikram Singh",
      email: "contractor@impactflow.demo",
      passwordHash,
      role: "CONTRACTOR",
      verificationStatus: "VERIFIED",
      company: "XYZ Construction",
    }),

    User.create({
      name: "BuildMart Supplies",
      email: "supplier@impactflow.demo",
      passwordHash,
      role: "SUPPLIER",
      verificationStatus: "VERIFIED",
      company: "BuildMart Supplies",
    }),

    User.create({
      name: "PrecisionFab",
      email: "fabricator@impactflow.demo",
      passwordHash,
      role: "FABRICATOR",
      verificationStatus: "VERIFIED",
      company: "PrecisionFab",
    }),

    User.create({
      name: "Raj Installations",
      email: "installer@impactflow.demo",
      passwordHash,
      role: "INSTALLER",
      verificationStatus: "VERIFIED",
      company: "Raj Installations",
    }),
  ]);

  /* ---------------------------------------------------------------------- */
  /* Project                                                                */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Project Members                                                        */
  /* ---------------------------------------------------------------------- */

  const members = [
    {
      userId: admin._id,
      role: "ADMIN" as const,
    },

    {
      userId: client._id,
      role: "CLIENT" as const,
    },

    {
      userId: architect._id,
      role: "ARCHITECT" as const,
    },

    {
      userId: designer._id,
      role: "INTERIOR_DESIGNER" as const,
    },

    {
      userId: consultant._id,
      role: "CONSULTANT" as const,
    },

    {
      userId: contractor._id,
      role: "CONTRACTOR" as const,
    },

    {
      userId: supplier._id,
      role: "SUPPLIER" as const,
    },

    {
      userId: fabricator._id,
      role: "FABRICATOR" as const,
    },

    {
      userId: installer._id,
      role: "INSTALLER" as const,
    },
  ];

  await ProjectMember.insertMany(
    members.map((member) => ({
      projectId: project._id,

      userId: member.userId,

      role: member.role,

      permissions: ["*"],
    })),
  );

  /* ---------------------------------------------------------------------- */
  /* Drawing                                                                */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Tasks                                                                  */
  /* ---------------------------------------------------------------------- */

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

  const affectedTaskIds = [procurementTask._id, installationTask._id];

  /* ---------------------------------------------------------------------- */
  /* Material                                                               */
  /* ---------------------------------------------------------------------- */

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

    linkedTaskIds: affectedTaskIds,
  });

  /* ---------------------------------------------------------------------- */
  /* Link Material → Tasks                                                  */
  /* ---------------------------------------------------------------------- */

  await Task.updateMany(
    {
      _id: {
        $in: affectedTaskIds,
      },
    },
    {
      $addToSet: {
        linkedMaterialIds: marbleA._id,
      },
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Existing Client Approval Dependency                                    */
  /* ---------------------------------------------------------------------- */

  console.log("[seed] Creating client approval dependency...");

  /**
   * This approval is the actual dependency
   * that blocks the bathroom procurement and
   * installation tasks.
   *
   * It will later be associated with the hero
   * ChangeRequest.
   */
  const clientApproval = await Approval.create({
    projectId: project._id,

    title: "Client Material Approval — Bathroom Marble",

    requiredFrom: client._id,

    status: "PENDING",

    blockedTaskIds: affectedTaskIds,
  });

  /* ---------------------------------------------------------------------- */
  /* Block Tasks                                                            */
  /* ---------------------------------------------------------------------- */

  await Task.updateMany(
    {
      _id: {
        $in: affectedTaskIds,
      },
    },
    {
      $set: {
        status: "BLOCKED",
      },

      $addToSet: {
        blockedByApprovalIds: clientApproval._id,
      },
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Hero Change Request                                                    */
  /* ---------------------------------------------------------------------- */

  console.log(
    "[seed] Creating change request (the hero workflow entry point)...",
  );

  /**
   * IMPORTANT:
   *
   * The requester and approver are intentionally
   * different users.
   *
   * Architect raises the change.
   * Client approves the change.
   */
  const changeRequest = await ChangeRequest.create({
    projectId: project._id,

    title: "Replace Bathroom Marble",

    description:
      "The bathroom marble selection needs to be reconsidered due to cost and lead time concerns.",

    category: "MATERIAL",

    /**
     * Architect raises the change.
     */
    requestedBy: architect._id,

    /**
     * Client is the exact designated approver.
     */
    approvalRequiredFrom: client._id,

    status: "IMPACT_REVIEW",

    priority: "HIGH",

    reason:
      "Re-evaluate the selected bathroom marble before procurement begins.",

    affectedMaterials: [marbleA._id],

    affectedDrawings: [bathroomDrawing._id],

    /**
     * These are the ONLY tasks that should
     * become approval-blocked for this change.
     */
    affectedTasks: affectedTaskIds,
  });

  /* ---------------------------------------------------------------------- */
  /* Connect Approval → Change                                               */
  /* ---------------------------------------------------------------------- */

  await Approval.updateOne(
    {
      _id: clientApproval._id,
    },
    {
      $set: {
        changeRequestId: changeRequest._id,
      },
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Supplier Alternative                                                   */
  /* ---------------------------------------------------------------------- */

  console.log(
    "[seed] Supplier marks Marble A unavailable and proposes Carrara Marble B...",
  );

  await Material.updateOne(
    {
      _id: marbleA._id,
    },
    {
      available: false,

      unavailableReason:
        "Quarry delay — Calacatta Marble A is out of stock for 8+ weeks.",
    },
  );

  const alternative = await MaterialAlternative.create({
    materialId: marbleA._id,

    proposedBy: supplier._id,

    name: "Carrara Marble B",

    price: 88000,

    leadTimeDays: 5,

    priceDelta: 8000,

    leadTimeDeltaDays: -7,

    notes:
      "Comparable veining pattern, in stock, faster lead time than the original selection.",

    requiresApproval: true,

    status: "PROPOSED",
  });

  /* ---------------------------------------------------------------------- */
  /* Decision                                                               */
  /* ---------------------------------------------------------------------- */

  console.log(
    "[seed] Creating current decision (proposed, pending client approval)...",
  );

  const decision = await Decision.create({
    projectId: project._id,

    title: "Use Carrara Marble B for bathroom",

    description:
      "Proposed replacement for Calacatta Marble A following supplier unavailability.",

    decisionType: "MATERIAL",

    relatedChangeRequest: changeRequest._id,

    status: "PENDING",

    rationale:
      "Faster lead time offsets a modest cost increase; comparable aesthetic.",
  });

  /* ---------------------------------------------------------------------- */
  /* Site Observation                                                       */
  /* ---------------------------------------------------------------------- */

  console.log(
    "[seed] Creating a site observation + installer feedback for the tail end of the story...",
  );

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

  /* ---------------------------------------------------------------------- */
  /* Feedback                                                               */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Activity Trail                                                         */
  /* ---------------------------------------------------------------------- */

  console.log("[seed] Recording activity trail...");

  await Activity.insertMany([
    {
      projectId: project._id,

      actor: architect._id,

      actorRole: "ARCHITECT",

      action: "CHANGE_CREATED",

      entityType: "ChangeRequest",

      entityId: changeRequest._id,

      summary:
        "Architect raised a request to review the bathroom marble selection.",
    },

    {
      projectId: project._id,

      actor: supplier._id,

      actorRole: "SUPPLIER",

      action: "MATERIAL_UNAVAILABLE",

      entityType: "Material",

      entityId: marbleA._id,

      summary:
        "Supplier marked Calacatta Marble A unavailable and proposed Carrara Marble B.",
    },

    {
      projectId: project._id,

      actor: installer._id,

      actorRole: "INSTALLER",

      action: "SITE_OBSERVATION_CREATED",

      entityType: "SiteObservation",

      entityId: observation._id,

      summary:
        "Installer flagged a wall width deviation from the current drawing.",
    },
  ]);

  /* ---------------------------------------------------------------------- */
  /* Notifications                                                          */
  /* ---------------------------------------------------------------------- */

  console.log("[seed] Sending a couple of demo notifications...");

  await Notification.insertMany([
    {
      userId: client._id,

      projectId: project._id,

      title: "Your approval is required",

      message:
        "Replace Bathroom Marble is waiting for your decision and is currently blocking procurement and installation.",

      entityType: "Approval",

      entityId: clientApproval._id,
    },

    {
      userId: architect._id,

      projectId: project._id,

      title: "Change submitted for approval",

      message:
        "Replace Bathroom Marble has been submitted and is waiting for client approval.",

      entityType: "ChangeRequest",

      entityId: changeRequest._id,
    },
  ]);

  /* ---------------------------------------------------------------------- */
  /* Chat                                                                    */
  /* ---------------------------------------------------------------------- */

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

      body: "I have submitted the bathroom marble change for client review.",

      readBy: [admin._id, architect._id],
    },

    {
      projectId: project._id,

      senderId: supplier._id,

      body: "Heads up -- Calacatta Marble A is delayed at the quarry. I am proposing Carrara Marble B as a faster alternative.",

      readBy: [admin._id, architect._id, supplier._id],
    },
  ]);

  /* ---------------------------------------------------------------------- */
  /* Summary                                                                 */
  /* ---------------------------------------------------------------------- */

  console.log(
    "\n[seed] Done. Demo accounts (password: " + DEMO_PASSWORD + "):",
  );

  members.forEach((member, index) => {
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

    console.log(`  ${member.role.padEnd(18)} ${emails[index]}`);
  });

  console.log("\n[seed] Hero workflow:");
  console.log("  Architect → raises bathroom marble change");
  console.log("  Impact Engine → identifies affected material/drawing/tasks");
  console.log("  Client → receives approval request");
  console.log("  Approval → blocks procurement + installation");
  console.log("  Client → approves from Approval Dependency Map");
  console.log("  Tasks → can continue after approval clears");

  await disconnectDB();
}

/* -------------------------------------------------------------------------- */
/* Run Seed                                                                   */
/* -------------------------------------------------------------------------- */

seed().catch((err) => {
  console.error("[seed] Failed:", err);

  process.exit(1);
});
