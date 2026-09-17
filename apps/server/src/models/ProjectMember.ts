import { Schema, model, Types } from "mongoose";
import { ROLES, type Role } from "@impactflow/shared";

export interface IProjectMember {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: Role;
  permissions: string[];
  joinedAt: Date;
}

const projectMemberSchema = new Schema<IProjectMember>({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ROLES, required: true },
  permissions: { type: [String], default: [] },
  joinedAt: { type: Date, default: Date.now },
});

// A user should only ever have one membership record per project.
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectMember = model<IProjectMember>("ProjectMember", projectMemberSchema);
