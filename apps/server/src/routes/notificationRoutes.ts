import { Router } from "express";
import * as notificationController from "../controllers/notificationController";
import { authenticateUser } from "../middleware/auth";

const router = Router();
router.use(authenticateUser);

router.get("/", notificationController.listNotifications);
router.patch("/:id/read", notificationController.markRead);
router.patch("/read-all", notificationController.markAllRead);

export default router;
