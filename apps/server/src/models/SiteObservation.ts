import { Schema, model, Types } from "mongoose";
import { SITE_OBSERVATION_STATUSES, SEVERITY_LEVELS, type SiteObservationStatus, type Severity } from "@impactflow/shared";

export interface ISiteObservation {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  location?: string;
  expectedValue?: string;
  actualValue?: string;
  unit?: string;
  drawingId?: Types.ObjectId;
  drawingRevision?: number;
  submittedBy: Types.ObjectId;
  photos: string[];
  severity: Severity;
  status: SiteObservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const siteObservationSchema = new Schema<ISiteObservation>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    expectedValue: { type: String },
    actualValue: { type: String },
    unit: { type: String },
    drawingId: { type: Schema.Types.ObjectId, ref: "Drawing" },
    drawingRevision: { type: Number },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photos: { type: [String], default: [] },
    severity: { type: String, enum: SEVERITY_LEVELS, default: "MEDIUM" },
    status: { type: String, enum: SITE_OBSERVATION_STATUSES, default: "OPEN" },
  },
  { timestamps: true }
);

export const SiteObservation = model<ISiteObservation>("SiteObservation", siteObservationSchema);
