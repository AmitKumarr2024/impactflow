import { Router } from "express";
import multer from "multer";
import * as mediaController from "../controllers/mediaController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { AppError } from "../utils/AppError";
import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "../middleware/auth";

// Hard cap at the multer layer too (not just inside the controller) so an
// oversized upload is rejected before most of it is buffered into memory.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

const router = Router();
router.use(authenticateUser);

// Only verify project membership when the upload actually claims to belong
// to a project. Company-wide uploads (feed images, profile avatars) send no
// projectId at all and skip this check -- any authenticated user may upload
// those, same as any authenticated user may post to the feed or edit their
// own profile.
function checkProjectMembershipIfProvided(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.body?.projectId) return next();
  return checkProjectMembership(req, res, next);
}

router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return next(AppError.validation(err.code === "LIMIT_FILE_SIZE" ? "File exceeds the 15MB limit" : err.message));
      }
      if (err) return next(err);
      next();
    });
  },
  checkProjectMembershipIfProvided,
  mediaController.uploadMedia
);

export default router;
