import type { Response, NextFunction } from "express";
import { z } from "zod";

import { Project } from "../models/Project";
import { ProjectMember } from "../models/ProjectMember";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";

import { PROJECT_STATUSES, ROLES } from "@impactflow/shared";

import { recordActivity } from "../services/notification/notificationService";
import { getIO } from "../socket";

import type { AuthedRequest } from "../middleware/auth";

/**
 * Only projects the caller is actually a member of are ever listed or returned.
 *
 * Project membership is the authorization boundary for project data.
 *
 * ADMIN is the exception:
 * ADMIN provisions projects for the company and therefore has a
 * cross-project view without needing to be added individually.
 */
export async function listProjects(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (req.user!.role === "ADMIN") {
      const projects = await Project.find().sort({ createdAt: -1 });

      return res.json({ projects });
    }

    const memberships = await ProjectMember.find({
      userId: req.user!.userId,
    }).lean();

    const projectIds = memberships.map((membership) => membership.projectId);

    const projects = await Project.find({
      _id: { $in: projectIds },
    }).sort({ createdAt: -1 });

    return res.json({ projects });
  } catch (err) {
    next(err);
  }
}

/**
 * Project creation schema.
 */
const createProjectSchema = z
  .object({
    name: z.string().min(1, "Project name is required"),

    projectCode: z.string().min(1, "Project code is required"),

    description: z.string().optional(),

    client: z.string().optional(),

    clientEmail: z.string().email("Invalid client email").optional(),

    location: z.string().optional(),

    startDate: z.string().optional(),

    expectedEndDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.expectedEndDate) {
        return true;
      }

      return (
        new Date(data.expectedEndDate).getTime() >=
        new Date(data.startDate).getTime()
      );
    },
    {
      message: "Expected end date cannot be before the start date",
      path: ["expectedEndDate"],
    },
  );

/**
 * Create a project.
 *
 * Client can be supplied using:
 * - client: MongoDB user id
 * - clientEmail: existing ImpactFlow account email
 *
 * If neither is supplied, creator becomes the project client.
 */
export async function createProject(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createProjectSchema.parse(req.body);

    /**
     * Resolve client.
     */
    let clientId = body.client;

    if (!clientId && body.clientEmail) {
      const clientUser = await User.findOne({
        email: body.clientEmail.toLowerCase(),
      });

      if (!clientUser) {
        throw AppError.validation(
          "No ImpactFlow account exists with that client email yet. Ask them to register first.",
        );
      }

      clientId = clientUser._id.toString();
    }

    /**
     * Project model requires a client reference.
     * If no client was supplied, creator becomes the client.
     */
    if (!clientId) {
      clientId = req.user!.userId;
    }

    /**
     * Create project.
     */
    const project = await Project.create({
      name: body.name,
      projectCode: body.projectCode,
      description: body.description,
      location: body.location,
      startDate: body.startDate,
      expectedEndDate: body.expectedEndDate,
      client: clientId,
      createdBy: req.user!.userId,
    });

    /**
     * Add creator as a project member.
     */
    await ProjectMember.create({
      projectId: project._id,
      userId: req.user!.userId,
      role: req.user!.role,
      permissions: ["*"],
    });

    /**
     * If the selected client is different from the creator,
     * automatically add the client to the project as well.
     *
     * This fixes the situation where an ADMIN enters a client's email
     * but the client cannot actually see the newly-created project.
     */
    if (clientId !== req.user!.userId) {
      const existingClientMembership = await ProjectMember.findOne({
        projectId: project._id,
        userId: clientId,
      });

      if (!existingClientMembership) {
        await ProjectMember.create({
          projectId: project._id,
          userId: clientId,
          role: "CLIENT",
          permissions: [],
        });
      }
    }

    /**
     * Record project creation activity.
     */
    await recordActivity({
      projectId: project._id,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "PROJECT_CREATED",
      entityType: "Project",
      entityId: project._id,
      summary: `Project "${project.name}" was created`,
    });

    /**
     * Notify connected project clients/members.
     */
    getIO()?.to(`project:${project._id}`).emit("project.created", {
      project,
    });

    return res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Get one project.
 */
export async function getProject(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    return res.json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Project update schema.
 */
const updateProjectSchema = z
  .object({
    name: z.string().optional(),

    description: z.string().optional(),

    status: z.enum(PROJECT_STATUSES).optional(),

    location: z.string().optional(),

    expectedEndDate: z.string().optional(),

    startDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.expectedEndDate) {
        return true;
      }

      return (
        new Date(data.expectedEndDate).getTime() >=
        new Date(data.startDate).getTime()
      );
    },
    {
      message: "Expected end date cannot be before the start date",
      path: ["expectedEndDate"],
    },
  );

/**
 * Update a project.
 */
export async function updateProject(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = updateProjectSchema.parse(req.body);

    const project = await Project.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    return res.json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * List everyone already on the project.
 *
 * The UI can use this to show:
 * - member name
 * - email
 * - role
 * - company
 *
 * It also prevents duplicate invitations.
 */
export async function listMembers(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const members = await ProjectMember.find({
      projectId: req.params.id,
    }).lean();

    const userIds = members.map((member) => member.userId);

    const users = await User.find({
      _id: { $in: userIds },
    })
      .select("name email role company")
      .lean();

    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    const result = members.map((member) => ({
      ...member,
      user: usersById.get(member.userId.toString()) || null,
    }));

    return res.json({ members: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Add an existing user to a project.
 */
const addMemberSchema = z.object({
  email: z.string().email("Invalid email"),

  role: z.enum(ROLES).optional(),
});

export async function addMember(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, role } = addMemberSchema.parse(req.body);

    const project = await Project.findById(req.params.id);

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      throw AppError.validation(
        "No ImpactFlow account exists with that email yet. Ask them to register first, then invite them.",
      );
    }

    const existing = await ProjectMember.findOne({
      projectId: project._id,
      userId: user._id,
    });

    if (existing) {
      throw AppError.conflict(
        "This person is already a member of this project",
      );
    }

    const member = await ProjectMember.create({
      projectId: project._id,
      userId: user._id,
      role: role || user.role,
      permissions: [],
    });

    await recordActivity({
      projectId: project._id,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "MEMBER_ADDED",
      entityType: "ProjectMember",
      entityId: member._id,
      summary: `${user.name} (${role || user.role}) was added to the project`,
    });

    getIO()?.to(`project:${project._id}`).emit("project.member.added", {
      projectId: project._id,
      user,
      role: member.role,
    });

    return res.status(201).json({
      member: {
        ...member.toObject(),
        user,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove a project member.
 */
export async function removeMember(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const member = await ProjectMember.findOneAndDelete({
      projectId: req.params.id,
      userId: req.params.userId,
    });

    if (!member) {
      throw AppError.notFound("Membership not found");
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
