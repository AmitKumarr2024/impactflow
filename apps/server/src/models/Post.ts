import { Schema, model, Types } from "mongoose";

export interface IPost {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  imageUrl?: string;
  likes: Types.ObjectId[];
  comments: { userId: Types.ObjectId; text: string; createdAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
    imageUrl: { type: String },
    // One like per user -- toggled in the controller, enforced there rather
    // than the schema since Mongoose doesn't have a native "unique array
    // element" constraint.
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

export const Post = model<IPost>("Post", postSchema);
