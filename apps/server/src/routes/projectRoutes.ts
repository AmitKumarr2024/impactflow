import { Router } from "express";
import * as projectController from "../controllers/projectController";
import * as changeController from "../controllers/changeController";
import * as materialController from "../controllers/materialController";
import * as approvalController from "../controllers/approvalController";
import * as drawingController from "../controllers/drawingController";
import * as siteController from "../controllers/siteController";
import * as feedbackController from "../controllers/feedbackController";
import * as decisionController from "../controllers/decisionController";
import * as activityController from "../controllers/activityController";
import * as taskController from "../controllers/taskController";
import * as searchController from "../controllers/searchController";
import * as chatController from "../controllers/chatController";
import { authenticateUser } from "../middleware/auth";
import { authorizeRole } from "../middleware/role";
import { checkProjectMembership } from "../middleware/projectAccess";

const router = Router();
router.use(authenticateUser);

router.get("/", projectController.listProjects);
router.post("/", authorizeRole("ADMIN"), projectController.createProject);
router.get("/:id", checkProjectMembership, projectController.getProject);
router.patch("/:id", checkProjectMembership, projectController.updateProject);
router.get("/:id/members", checkProjectMembership, projectController.listMembers);
router.post("/:id/members", checkProjectMembership, authorizeRole("ADMIN"), projectController.addMember);
router.delete("/:id/members/:userId", checkProjectMembership, authorizeRole("ADMIN"), projectController.removeMember);

// All nested collections below require project membership -- the projectId
// route param is what checkProjectMembership resolves against.
router.get("/:projectId/changes", checkProjectMembership, changeController.listChanges);
router.post("/:projectId/changes", checkProjectMembership, changeController.createChange);

router.get("/:projectId/materials", checkProjectMembership, materialController.listMaterials);
router.post("/:projectId/materials", checkProjectMembership, materialController.createMaterial);

router.get("/:projectId/approvals", checkProjectMembership, approvalController.listApprovals);

router.get("/:projectId/drawings", checkProjectMembership, drawingController.listDrawings);
router.post("/:projectId/drawings", checkProjectMembership, drawingController.createDrawing);

router.get("/:projectId/tasks", checkProjectMembership, taskController.listTasks);
router.post("/:projectId/tasks", checkProjectMembership, taskController.createTask);

router.get("/:projectId/site-observations", checkProjectMembership, siteController.listSiteObservations);
router.post("/:projectId/site-observations", checkProjectMembership, siteController.createSiteObservation);

router.get("/:projectId/feedback", checkProjectMembership, feedbackController.listFeedback);
router.post("/:projectId/feedback", checkProjectMembership, feedbackController.createFeedback);

router.get("/:projectId/decisions", checkProjectMembership, decisionController.listDecisions);
router.post("/:projectId/decisions", checkProjectMembership, decisionController.createDecision);

router.get("/:projectId/activity", checkProjectMembership, activityController.listActivity);

router.get("/:projectId/search", checkProjectMembership, searchController.searchProject);

router.get("/chat/unread-counts", chatController.unreadCounts);
router.get("/:projectId/chat/messages", checkProjectMembership, chatController.listMessages);
router.post("/:projectId/chat/messages", checkProjectMembership, chatController.sendMessage);
router.post("/:projectId/chat/read", checkProjectMembership, chatController.markThreadRead);

export default router;
