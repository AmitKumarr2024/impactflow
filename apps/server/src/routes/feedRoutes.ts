import { Router } from "express";
import * as feedController from "../controllers/feedController";
import { authenticateUser } from "../middleware/auth";

const router = Router();
router.use(authenticateUser);

router.get("/", feedController.listPosts);
router.post("/", feedController.createPost);
router.delete("/:id", feedController.deletePost);
router.post("/:id/like", feedController.toggleLike);
router.post("/:id/comments", feedController.addComment);

export default router;
