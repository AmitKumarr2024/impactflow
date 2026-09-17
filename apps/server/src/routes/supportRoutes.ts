import { Router } from "express";
import * as supportController from "../controllers/supportController";
import { authenticateUser } from "../middleware/auth";
import { authorizeRole } from "../middleware/role";

const router = Router();
router.use(authenticateUser);

// Any authenticated user: their own thread (or, if admin, any thread via ?userId=).
router.get("/messages", supportController.listMessages);
router.post("/messages", supportController.sendMessage);
router.post("/read", supportController.markRead);

// Admin-only: the full inbox of every open thread.
router.get("/threads", authorizeRole("ADMIN"), supportController.listThreads);

export default router;
