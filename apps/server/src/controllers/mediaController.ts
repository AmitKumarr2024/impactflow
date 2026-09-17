import type { Response, NextFunction } from "express";
import { z } from "zod";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary";
import { MediaAsset } from "../models/MediaAsset";
import { AppError } from "../utils/AppError";
import type { AuthedRequest } from "../middleware/auth";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const metaSchema = z.object({
  // Optional: company-wide uploads (feed post images, profile avatars) have
  // no project at all. Anything project-scoped (drawings, site photos)
  // still passes a real projectId, and still goes through checkProjectMembership
  // at the route layer before this controller ever runs.
  projectId: z.string().optional(),
  entityType: z.string(),
  entityId: z.string().optional(),
});

// Never store raw bytes in MongoDB -- upload goes to Cloudinary first, then
// only the URL/publicId/metadata is persisted (spec section 19).
export async function uploadMedia(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw AppError.validation("No file uploaded");
    if (!ALLOWED_MIME.has(file.mimetype)) throw AppError.validation("Unsupported file type");
    if (file.size > MAX_SIZE_BYTES) throw AppError.validation("File exceeds the 15MB limit");

    const { projectId, entityType, entityId } = metaSchema.parse(req.body);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `impactflow/${projectId || "company"}`, resource_type: "auto" },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    }).catch((cloudinaryErr) => {
      // Surface the real reason (bad credentials, network issue, etc.)
      // instead of letting it fall through to a generic 500 -- this is
      // exactly the kind of failure that's otherwise invisible to whoever
      // is debugging a broken upload.
      const message =
        cloudinaryErr instanceof Error ? cloudinaryErr.message : "Upload to Cloudinary failed";
      throw new AppError(`Cloudinary upload failed: ${message}`, 502, "UPLOAD_FAILED");
    });

    const asset = await MediaAsset.create({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      format: uploadResult.format,
      fileName: file.originalname,
      uploadedBy: req.user!.userId,
      projectId: projectId || undefined,
      entityType,
      entityId: entityId || undefined,
    });

    res.status(201).json({ asset });
  } catch (err) {
    next(err);
  }
}
