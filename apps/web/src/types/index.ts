export const ROLES = [
  "ADMIN",
  "CLIENT",
  "ARCHITECT",
  "INTERIOR_DESIGNER",
  "CONSULTANT",
  "CONTRACTOR",
  "SUPPLIER",
  "FABRICATOR",
  "INSTALLER",
] as const;

export type Role = (typeof ROLES)[number];

export const REGISTRABLE_ROLES = ROLES.filter(
  (role) => role !== "ADMIN",
) as Exclude<Role, "ADMIN">[];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

export type Gender = (typeof GENDERS)[number];

export const CHANGE_CATEGORIES = [
  "DESIGN",
  "MATERIAL",
  "DIMENSION",
  "SCOPE",
  "SITE_CONDITION",
  "CLIENT_REQUEST",
  "SUPPLIER_CHANGE",
  "OTHER",
] as const;

export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number];

export type ImpactLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/* -------------------------------------------------------------------------- */
/* User                                                                       */
/* -------------------------------------------------------------------------- */

export interface User {
  _id: string;

  name: string;

  email: string;

  role: Role;

  gender: Gender;

  company?: string;

  address?: string;

  avatar?: string;

  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
}

/* -------------------------------------------------------------------------- */
/* Project                                                                    */
/* -------------------------------------------------------------------------- */

export interface Project {
  _id: string;

  name: string;

  projectCode: string;

  description?: string;

  client: string;

  location?: string;

  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

  startDate?: string;

  expectedEndDate?: string;

  createdBy: string;

  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Change references                                                          */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/changes/:id can populate these references with
 * real documents.
 *
 * List endpoints may return raw ObjectId strings.
 */

export type PopulatedMaterialRef =
  | string
  | {
      _id: string;
      name: string;
      category?: string;
      price: number;
      available: boolean;
    };

export type PopulatedDrawingRef =
  | string
  | {
      _id: string;
      name: string;
      revision: number;
      status: string;
    };

export type PopulatedTaskRef =
  | string
  | {
      _id: string;
      title: string;
      type?: string;
      status: string;
    };

/* -------------------------------------------------------------------------- */
/* Change Request                                                             */
/* -------------------------------------------------------------------------- */

export interface ChangeRequest {
  _id: string;

  projectId: string;

  title: string;

  description: string;

  category: ChangeCategory;

  requestedBy: string;

  status:
    | "DRAFT"
    | "SUBMITTED"
    | "ANALYZING"
    | "IMPACT_REVIEW"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "SUPERSEDED"
    | "IMPLEMENTED";

  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";

  reason?: string;

  affectedMaterials: PopulatedMaterialRef[];

  affectedDrawings: PopulatedDrawingRef[];

  affectedTasks: PopulatedTaskRef[];

  requestedAt: string;

  approvedAt?: string;

  rejectedAt?: string;

  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Impact Analysis                                                            */
/* -------------------------------------------------------------------------- */

export interface ImpactAnalysis {
  _id: string;

  changeRequestId: string;

  impactLevel: ImpactLevel;

  affectedStakeholders: string[];

  affectedMaterials: string[];

  affectedDrawings: string[];

  affectedTasks: string[];

  affectedApprovals: string[];

  affectedDecisions: string[];

  estimatedCostDelta: number;

  estimatedScheduleDeltaDays: number;

  reasons: string[];

  generatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Material                                                                   */
/* -------------------------------------------------------------------------- */

export interface Material {
  _id: string;

  projectId: string;

  name: string;

  category?: string;

  price: number;

  leadTimeDays: number;

  available: boolean;

  unavailableReason?: string;

  supplierId?: string;

  linkedDrawingIds: string[];

  linkedTaskIds: string[];
}

/* -------------------------------------------------------------------------- */
/* Material Alternative                                                       */
/* -------------------------------------------------------------------------- */

export interface MaterialAlternative {
  _id: string;

  materialId: string;

  proposedBy: string;

  name: string;

  price: number;

  leadTimeDays: number;

  priceDelta: number;

  leadTimeDeltaDays: number;

  notes?: string;

  status: "PROPOSED" | "APPROVED" | "REJECTED";

  votes: {
    userId: string;
    vote: "UP" | "DOWN";
  }[];

  comments: {
    userId: string;
    text: string;
    createdAt: string;
  }[];

  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Task                                                                       */
/* -------------------------------------------------------------------------- */

export interface Task {
  _id: string;

  projectId: string;

  title: string;

  type?: string;

  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

  assignedTo?: string;
}

/* -------------------------------------------------------------------------- */
/* Approval                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The Approval API populates requiredFrom with:
 *
 * name
 * email
 * role
 * avatar
 *
 * Therefore the frontend models requiredFrom as the populated
 * user object.
 */

export interface ApprovalRequiredFrom {
  _id: string;

  name: string;

  email: string;

  role: Role;

  avatar?: string;
}

export interface Approval {
  _id: string;

  projectId: string;

  title: string;

  requiredFrom: ApprovalRequiredFrom;

  status: "PENDING" | "APPROVED" | "BLOCKED" | "UNBLOCKED" | "REJECTED";

  blockedTaskIds: string[];

  blockedTasks?: Array<Pick<Task, "_id" | "title" | "status">>;

  changeRequestId?: string;

  decidedBy?: string;

  decidedAt?: string;

  createdAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                    */
/* -------------------------------------------------------------------------- */

export interface Drawing {
  _id: string;

  projectId: string;

  name: string;

  category?: string;

  revision: number;

  fileUrl?: string;

  status: "CURRENT" | "SUPERSEDED" | "DRAFT";
}

/* -------------------------------------------------------------------------- */
/* Decision                                                                   */
/* -------------------------------------------------------------------------- */

export interface Decision {
  _id: string;

  projectId: string;

  title: string;

  description?: string;

  decisionType?: string;

  status: "PROPOSED" | "PENDING" | "APPROVED" | "REJECTED" | "SUPERSEDED";

  relatedChangeRequest?: string;

  rationale?: string;

  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Site Observation                                                           */
/* -------------------------------------------------------------------------- */

export interface SiteObservation {
  _id: string;

  projectId: string;

  title: string;

  description?: string;

  location?: string;

  expectedValue?: string;

  actualValue?: string;

  unit?: string;

  photos: string[];

  severity: Severity;

  status: "OPEN" | "UNDER_REVIEW" | "ACKNOWLEDGED" | "RESOLVED";

  submittedBy: string;

  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */

export interface Feedback {
  _id: string;

  projectId: string;

  title: string;

  description: string;

  severity: Severity;

  status: "OPEN" | "UNDER_REVIEW" | "ACTION_REQUIRED" | "RESOLVED" | "CLOSED";

  submittedBy: string;

  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Notification                                                               */
/* -------------------------------------------------------------------------- */

export interface Notification {
  _id: string;

  userId: string;

  projectId?: string;

  title: string;

  message: string;

  entityType?: string;

  entityId?: string;

  read: boolean;

  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                   */
/* -------------------------------------------------------------------------- */

export interface ActivityRecord {
  _id: string;

  projectId: string;

  actor: string;

  actorRole: string;

  action: string;

  entityType: string;

  entityId: string;

  summary: string;

  createdAt: string;
}
