import { Schema, model, Types } from "mongoose";
import { IMPACT_LEVELS, type ImpactLevel } from "@impactflow/shared";

export interface IImpactAnalysis {
  _id: Types.ObjectId;
  changeRequestId: Types.ObjectId;
  impactLevel: ImpactLevel;
  affectedStakeholders: Types.ObjectId[];
  affectedMaterials: Types.ObjectId[];
  affectedDrawings: Types.ObjectId[];
  affectedTasks: Types.ObjectId[];
  affectedApprovals: Types.ObjectId[];
  affectedDecisions: Types.ObjectId[];
  affectedSiteObservations: Types.ObjectId[];
  affectedFeedback: Types.ObjectId[];
  estimatedCostDelta: number;
  estimatedScheduleDeltaDays: number;
  reasons: string[];
  generatedAt: Date;
}

const impactAnalysisSchema = new Schema<IImpactAnalysis>({
  changeRequestId: { type: Schema.Types.ObjectId, ref: "ChangeRequest", required: true, index: true },
  impactLevel: { type: String, enum: IMPACT_LEVELS, required: true },
  affectedStakeholders: [{ type: Schema.Types.ObjectId, ref: "User" }],
  affectedMaterials: [{ type: Schema.Types.ObjectId, ref: "Material" }],
  affectedDrawings: [{ type: Schema.Types.ObjectId, ref: "Drawing" }],
  affectedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
  affectedApprovals: [{ type: Schema.Types.ObjectId, ref: "Approval" }],
  affectedDecisions: [{ type: Schema.Types.ObjectId, ref: "Decision" }],
  // Additive fields -- existing ImpactAnalysis documents simply have these
  // default to empty arrays; nothing about the prior schema changes or breaks.
  affectedSiteObservations: [{ type: Schema.Types.ObjectId, ref: "SiteObservation", default: [] }],
  affectedFeedback: [{ type: Schema.Types.ObjectId, ref: "Feedback", default: [] }],
  // These are deterministic estimates derived from project data (rules in
  // impactEngineService), never a "guaranteed" prediction. Label accordingly in the UI.
  estimatedCostDelta: { type: Number, default: 0 },
  estimatedScheduleDeltaDays: { type: Number, default: 0 },
  reasons: { type: [String], default: [] },
  generatedAt: { type: Date, default: Date.now },
});

export const ImpactAnalysis = model<IImpactAnalysis>("ImpactAnalysis", impactAnalysisSchema);
