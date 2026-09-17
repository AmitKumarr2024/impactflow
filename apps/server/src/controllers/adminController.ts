import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Project } from "../models/Project";
import { ProjectMember } from "../models/ProjectMember";
import { ChangeRequest } from "../models/ChangeRequest";
import { Approval } from "../models/Approval";
import { Activity } from "../models/Activity";
import { Task } from "../models/Task";
import { User } from "../models/User";
import { Notification } from "../models/Notification";
import { ROLES } from "@impactflow/shared";
import { AppError } from "../utils/AppError";
import { getIO } from "../socket";
import type { AuthedRequest } from "../middleware/auth";

// One real, computed snapshot per project -- active change count, pending
// approval count, member count, and the timestamp of the most recent
// activity record -- so an admin can see what's actually happening on every
// project without opening each one individually. Every number here comes
// from a real query; nothing is estimated or invented.
export async function getOverview(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();

    const overview = await Promise.all(
      projects.map(async (project) => {
        const [activeChanges, pendingApprovals, memberCount, lastActivity] = await Promise.all([
          ChangeRequest.countDocuments({
            projectId: project._id,
            status: { $nin: ["APPROVED", "REJECTED", "SUPERSEDED", "IMPLEMENTED"] },
          }),
          Approval.countDocuments({ projectId: project._id, status: "PENDING" }),
          ProjectMember.countDocuments({ projectId: project._id }),
          Activity.findOne({ projectId: project._id }).sort({ createdAt: -1 }).select("summary createdAt").lean(),
        ]);

        return {
          project,
          activeChanges,
          pendingApprovals,
          memberCount,
          lastActivity: lastActivity ? { summary: lastActivity.summary, createdAt: lastActivity.createdAt } : null,
        };
      })
    );

    res.json({ overview });
  } catch (err) {
    next(err);
  }
}

const listUsersQuerySchema = z.object({
  role: z.enum(ROLES),
});

// Lets an admin browse everyone with a given role platform-wide (e.g. "show
// me every Supplier") and see real, computed workload before assigning them
// to a project -- how many projects they're already on and how many open
// tasks they're carrying. Deliberately does NOT include a "rating" or
// "completion %" field: there's no real data backing either of those yet,
// and inventing one would be exactly the kind of fabricated metric this
// product argues against for the Impact Engine itself.
export async function listUsersByRole(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { role } = listUsersQuerySchema.parse(req.query);
    const users = await User.find({ role })
      .select("name email role company avatar verificationStatus")
      .sort({ name: 1 })
      .lean();

    const withStats = await Promise.all(
      users.map(async (user) => {
        const [projectCount, openTaskCount] = await Promise.all([
          ProjectMember.countDocuments({ userId: user._id }),
          Task.countDocuments({ assignedTo: user._id, status: { $in: ["NOT_STARTED", "IN_PROGRESS"] } }),
        ]);
        return { user, projectCount, openTaskCount };
      })
    );

    res.json({ users: withStats });
  } catch (err) {
    next(err);
  }
}

// Anyone can claim a role at registration; nothing about that claim is
// trusted anywhere in the product (assignable in the People Directory,
// shown with a badge everywhere else) until an admin verifies it here.
export async function listPendingVerifications(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const users = await User.find({ verificationStatus: "PENDING" })
      .select("name email role company avatar gender createdAt")
      .sort({ createdAt: 1 })
      .lean();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

const decideVerificationSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
});

export async function decideVerification(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = decideVerificationSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.userId, { verificationStatus: status }, { new: true });
    if (!user) throw AppError.notFound("User not found");

    await Notification.create({
      userId: user._id,
      title: status === "VERIFIED" ? "You're verified!" : "Verification declined",
      message:
        status === "VERIFIED"
          ? `An admin has verified your account as ${user.role.replace(/_/g, " ").toLowerCase()}. You'll now show up in project assignments with a verified badge.`
          : "An admin declined your role verification. Message an admin if you have questions.",
    });

    getIO()?.to(`user:${user._id}`).emit("verification.decided", { status });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
