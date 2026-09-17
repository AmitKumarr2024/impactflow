import { Schema, model, Types } from "mongoose";
import { TASK_STATUSES, type TaskStatus } from "@impactflow/shared";

export interface ITask {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  type: "PROCUREMENT" | "INSTALLATION" | "FABRICATION" | "EXECUTION" | "OTHER";
  status: TaskStatus;
  assignedTo?: Types.ObjectId;
  linkedMaterialIds: Types.ObjectId[];
  linkedDrawingIds: Types.ObjectId[];
  blockedByApprovalIds: Types.ObjectId[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["PROCUREMENT", "INSTALLATION", "FABRICATION", "EXECUTION", "OTHER"],
      default: "OTHER",
    },
    status: { type: String, enum: TASK_STATUSES, default: "NOT_STARTED" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    linkedMaterialIds: [{ type: Schema.Types.ObjectId, ref: "Material" }],
    linkedDrawingIds: [{ type: Schema.Types.ObjectId, ref: "Drawing" }],
    blockedByApprovalIds: [{ type: Schema.Types.ObjectId, ref: "Approval" }],
    dueDate: { type: Date },
  },
  { timestamps: true }
);

export const Task = model<ITask>("Task", taskSchema);
