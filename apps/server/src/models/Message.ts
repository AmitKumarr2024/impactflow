import { Schema, model, Types } from "mongoose";

export interface IMessage {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  senderId: Types.ObjectId;
  body: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    // Tracks who has read this message so unread counts can be computed
    // without a separate read-receipt collection.
    readBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true }
);

messageSchema.index({ projectId: 1, createdAt: -1 });

export const Message = model<IMessage>("Message", messageSchema);
