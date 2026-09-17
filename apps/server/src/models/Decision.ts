import { Schema, model, Types } from "mongoose";
import { DECISION_STATUSES, type DecisionStatus } from "@impactflow/shared";

export interface IDecision {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  decisionType: "MATERIAL" | "DESIGN" | "SCOPE" | "SCHEDULE" | "OTHER";
  relatedChangeRequest?: Types.ObjectId;
  status: DecisionStatus;
  decisionBy?: Types.ObjectId;
  approvedAt?: Date;
  supersedesDecision?: Types.ObjectId;
  attachments: string[];
  rationale?: string;
  createdAt: Date;
  updatedAt: Date;
}

const decisionSchema = new Schema<IDecision>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    decisionType: {
      type: String,
      enum: ["MATERIAL", "DESIGN", "SCOPE", "SCHEDULE", "OTHER"],
      default: "OTHER",
    },
    relatedChangeRequest: { type: Schema.Types.ObjectId, ref: "ChangeRequest" },
    status: { type: String, enum: DECISION_STATUSES, default: "PROPOSED" },
    decisionBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    supersedesDecision: { type: Schema.Types.ObjectId, ref: "Decision" },
    attachments: { type: [String], default: [] },
    rationale: { type: String },
  },
  { timestamps: true }
);

export const Decision = model<IDecision>("Decision", decisionSchema);
