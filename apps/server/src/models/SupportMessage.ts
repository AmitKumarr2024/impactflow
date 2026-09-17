import { Schema, model, Types } from "mongoose";

export interface ISupportMessage {
  _id: Types.ObjectId;
  // The non-admin party this thread belongs to. Every message in the thread
  // -- whether written by that user or by any admin replying -- carries the
  // same userId, so the thread is addressed by "which user is this about,"
  // not by a specific admin. Any admin can see and reply to any thread.
  userId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderIsAdmin: boolean;
  body: string;
  read: boolean;
  createdAt: Date;
}

const supportMessageSchema = new Schema<ISupportMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderIsAdmin: { type: Boolean, required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

supportMessageSchema.index({ userId: 1, createdAt: -1 });

export const SupportMessage = model<ISupportMessage>("SupportMessage", supportMessageSchema);
