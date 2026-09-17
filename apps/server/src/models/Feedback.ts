import { Schema, model, Types } from "mongoose";
import { FEEDBACK_STATUSES, SEVERITY_LEVELS, type FeedbackStatus, type Severity } from "@impactflow/shared";

export interface IFeedback {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description: string;
  relatedTask?: Types.ObjectId;
  relatedDrawing?: Types.ObjectId;
  relatedChange?: Types.ObjectId;
  relatedSiteObservation?: Types.ObjectId;
  photos: string[];
  measurements?: string;
  submittedBy: Types.ObjectId;
  severity: Severity;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    relatedTask: { type: Schema.Types.ObjectId, ref: "Task" },
    relatedDrawing: { type: Schema.Types.ObjectId, ref: "Drawing" },
    relatedChange: { type: Schema.Types.ObjectId, ref: "ChangeRequest" },
    relatedSiteObservation: { type: Schema.Types.ObjectId, ref: "SiteObservation" },
    photos: { type: [String], default: [] },
    measurements: { type: String },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    severity: { type: String, enum: SEVERITY_LEVELS, default: "MEDIUM" },
    status: { type: String, enum: FEEDBACK_STATUSES, default: "OPEN" },
  },
  { timestamps: true }
);

export const Feedback = model<IFeedback>("Feedback", feedbackSchema);
