import { Schema, model, Types } from "mongoose";
import { PROJECT_STATUSES, type ProjectStatus } from "@impactflow/shared";

export interface IProject {
  _id: Types.ObjectId;
  name: string;
  projectCode: string;
  description?: string;
  client: Types.ObjectId;
  location?: string;
  status: ProjectStatus;
  startDate?: Date;
  expectedEndDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    projectCode: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String },
    status: { type: String, enum: PROJECT_STATUSES, default: "PLANNING" },
    startDate: { type: Date },
    expectedEndDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Project = model<IProject>("Project", projectSchema);
