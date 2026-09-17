import { api } from "@/lib/api";

export interface MediaAsset {
  _id: string;
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  fileName: string;
}

/** Uploads a file straight to Cloudinary via the backend (browser never talks
 * to Cloudinary directly -- the API key/secret stay server-side). projectId
 * is omitted entirely for company-wide uploads (feed images, avatars) --
 * the backend only checks project membership when one is actually sent. */
export async function uploadFile(input: {
  file: File;
  projectId?: string;
  entityType: string;
  entityId?: string;
}): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append("file", input.file);
  if (input.projectId) formData.append("projectId", input.projectId);
  formData.append("entityType", input.entityType);
  if (input.entityId) formData.append("entityId", input.entityId);
  const res = await api.upload<{ asset: MediaAsset }>("/api/media/upload", formData);
  return res.asset;
}
