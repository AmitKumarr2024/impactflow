// Central source of truth for enums shared across frontend and backend.
// Keep this file free of framework-specific imports.

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

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

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

export const CHANGE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "ANALYZING",
  "IMPACT_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
  "IMPLEMENTED",
] as const;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number];

export const IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "BLOCKED",
  "UNBLOCKED",
  "REJECTED",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const DRAWING_STATUSES = ["CURRENT", "SUPERSEDED", "DRAFT"] as const;
export type DrawingStatus = (typeof DRAWING_STATUSES)[number];

export const DECISION_STATUSES = [
  "PROPOSED",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const SITE_OBSERVATION_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "ACKNOWLEDGED",
  "RESOLVED",
] as const;
export type SiteObservationStatus = (typeof SITE_OBSERVATION_STATUSES)[number];

export const FEEDBACK_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "RESOLVED",
  "CLOSED",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export const TASK_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const SOCKET_EVENTS = {
  CHANGE_CREATED: "change.created",
  CHANGE_IMPACT_UPDATED: "change.impact.updated",
  APPROVAL_PENDING: "approval.pending",
  APPROVAL_APPROVED: "approval.approved",
  APPROVAL_REJECTED: "approval.rejected",
  MATERIAL_UNAVAILABLE: "material.unavailable",
  MATERIAL_SUBSTITUTION_CREATED: "material.substitution.created",
  SITE_OBSERVATION_CREATED: "site.observation.created",
  SITE_OBSERVATION_UPDATED: "site.observation.updated",
  FEEDBACK_CREATED: "feedback.created",
  FEEDBACK_RESOLVED: "feedback.resolved",
  NOTIFICATION_CREATED: "notification.created",
  DECISION_CREATED: "decision.created",
  DECISION_APPROVED: "decision.approved",
  DECISION_SUPERSEDED: "decision.superseded",
  DRAWING_REVISION_CREATED: "drawing.revision.created",
} as const;
