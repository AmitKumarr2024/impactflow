import { Schema, model, Types } from "mongoose";
import { ROLES, type Role } from "@impactflow/shared";

export interface IActivity {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  actor: Types.ObjectId;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  summary: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, enum: ROLES, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    summary: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Activity = model<IActivity>("Activity", activitySchema);
