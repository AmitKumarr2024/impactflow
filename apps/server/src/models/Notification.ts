import { Schema, model, Types } from "mongoose";

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  message: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = model<INotification>("Notification", notificationSchema);
