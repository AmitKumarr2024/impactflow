import { Router } from "express";
import * as adminController from "../controllers/adminController";
import { authenticateUser } from "../middleware/auth";
import { authorizeRole } from "../middleware/role";

const router = Router();
router.use(authenticateUser, authorizeRole("ADMIN"));

router.get("/overview", adminController.getOverview);
router.get("/users", adminController.listUsersByRole);
router.get("/verifications", adminController.listPendingVerifications);
router.post("/verifications/:userId", adminController.decideVerification);

export default router;
