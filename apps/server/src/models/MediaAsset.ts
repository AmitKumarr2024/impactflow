import { Schema, model, Types } from "mongoose";

export interface IMediaAsset {
  _id: Types.ObjectId;
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  fileName: string;
  uploadedBy: Types.ObjectId;
  // Optional: most uploads (drawings, site photos) belong to a project, but
  // some are company-wide and have no project at all -- a feed post image,
  // a profile avatar. Those store projectId as undefined rather than being
  // forced into a project they don't belong to.
  projectId?: Types.ObjectId;
  entityType: string;
  entityId?: Types.ObjectId;
  createdAt: Date;
}

// MongoDB never stores raw file bytes -- only Cloudinary's URL/publicId and
// enough metadata to attribute and locate the asset. See docs/architecture.md.
const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MediaAsset = model<IMediaAsset>("MediaAsset", mediaAssetSchema);
