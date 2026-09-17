import { Schema, model, Types } from "mongoose";
import { DRAWING_STATUSES, type DrawingStatus } from "@impactflow/shared";

export interface IDrawing {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  category?: string;
  revision: number;
  fileUrl?: string;
  cloudinaryPublicId?: string;
  uploadedBy: Types.ObjectId;
  status: DrawingStatus;
  supersedesDrawingId?: Types.ObjectId;
  uploadedAt: Date;
}

const drawingSchema = new Schema<IDrawing>({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  name: { type: String, required: true },
  category: { type: String },
  revision: { type: Number, required: true, default: 1 },
  fileUrl: { type: String },
  cloudinaryPublicId: { type: String },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: DRAWING_STATUSES, default: "CURRENT" },
  supersedesDrawingId: { type: Schema.Types.ObjectId, ref: "Drawing" },
  uploadedAt: { type: Date, default: Date.now },
});

export const Drawing = model<IDrawing>("Drawing", drawingSchema);
