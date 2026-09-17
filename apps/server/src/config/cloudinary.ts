import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

// Defensive: server.ts already loads dotenv first in the normal `npm run dev`
// flow, but any other entry point (a standalone script, a test file that
// imports a controller directly, etc.) could reach this module before that
// happens. Re-running dotenv/config here is a no-op if vars are already
// loaded, and a safety net if they aren't.

const required = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Loud on purpose -- a silent misconfiguration here means every upload
  // fails with a confusing Cloudinary SDK error instead of a clear one.
  console.warn(
    `[cloudinary] Missing environment variable(s): ${missing.join(", ")}. File uploads will fail until these are set in .env.`
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
