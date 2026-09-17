import { Router } from "express";
import * as authController from "../controllers/authController";
import { authenticateUser } from "../middleware/auth";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authenticateUser, authController.me);
router.patch("/me", authenticateUser, authController.updateProfile);

export default router;
