import { Schema, model, Types } from "mongoose";

export interface IMaterial {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  category?: string;
  price: number;
  leadTimeDays: number;
  available: boolean;
  unavailableReason?: string;
  supplierId?: Types.ObjectId;
  linkedDrawingIds: Types.ObjectId[];
  linkedTaskIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    category: { type: String },
    price: { type: Number, required: true },
    leadTimeDays: { type: Number, required: true },
    available: { type: Boolean, default: true },
    unavailableReason: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: "User" },
    linkedDrawingIds: [{ type: Schema.Types.ObjectId, ref: "Drawing" }],
    linkedTaskIds: [{ type: Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true }
);

export const Material = model<IMaterial>("Material", materialSchema);

export interface IMaterialAlternative {
  _id: Types.ObjectId;
  materialId: Types.ObjectId;
  proposedBy: Types.ObjectId;
  name: string;
  price: number;
  leadTimeDays: number;
  priceDelta: number;
  leadTimeDeltaDays: number;
  imageUrl?: string;
  notes?: string;
  requiresApproval: boolean;
  status: "PROPOSED" | "APPROVED" | "REJECTED";
  votes: { userId: Types.ObjectId; vote: "UP" | "DOWN" }[];
  comments: { userId: Types.ObjectId; text: string; createdAt: Date }[];
  createdAt: Date;
}

const materialAlternativeSchema = new Schema<IMaterialAlternative>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true, index: true },
    proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    leadTimeDays: { type: Number, required: true },
    priceDelta: { type: Number, required: true },
    leadTimeDeltaDays: { type: Number, required: true },
    imageUrl: { type: String },
    notes: { type: String },
    requiresApproval: { type: Boolean, default: true },
    status: { type: String, enum: ["PROPOSED", "APPROVED", "REJECTED"], default: "PROPOSED" },
    // Lets the whole team weigh in on which supplier estimate to go with
    // before an admin/architect makes the final call -- one vote per user,
    // enforced in the controller rather than the schema.
    votes: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        vote: { type: String, enum: ["UP", "DOWN"], required: true },
      },
    ],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MaterialAlternative = model<IMaterialAlternative>(
  "MaterialAlternative",
  materialAlternativeSchema
);
