# API Documentation

Base URL: `http://localhost:4000/api` (or your deployed `NEXT_PUBLIC_API_URL`).

All endpoints except `/auth/register` and `/auth/login` require:
```
Authorization: Bearer <JWT>
```

All project-scoped endpoints additionally require the caller to be a `ProjectMember`
of the target project (enforced by `checkProjectMembership` -- returns `403 FORBIDDEN`
otherwise, not just hidden by the UI).

Rate limits: 600 requests / 15 min per IP on `/api/*` generally, 30 requests / 15 min
on `/api/auth/*` specifically.

---

## Auth

### `POST /api/auth/register`
Body: `{ name, email, password (min 8 chars), role, company? }`
`role` must be one of: `CLIENT, ARCHITECT, INTERIOR_DESIGNER, CONSULTANT, CONTRACTOR, SUPPLIER, FABRICATOR, INSTALLER`.
Response `201`: `{ user, token }`. Errors: `409` if email already registered.

### `POST /api/auth/login`
Body: `{ email, password }`. Response `200`: `{ user, token }`. Errors: `401` on bad credentials.

### `GET /api/auth/me`
Auth required. Response `200`: `{ user }`.

---

## Projects

### `GET /api/projects`
Lists only projects the caller is a member of.

### `POST /api/projects`
Body: `{ name, projectCode, description?, client, location?, startDate?, expectedEndDate? }`.
Creates the project and auto-enrolls the creator as a `ProjectMember`.

### `GET /api/projects/:id`
Requires membership.

### `PATCH /api/projects/:id`
Body: any of `{ name, description, status, location, expectedEndDate }`.

---

## Changes (the hero-workflow entry point)

### `GET /api/projects/:projectId/changes`
### `POST /api/projects/:projectId/changes`
Body: `{ title, description, category, priority?, reason?, affectedMaterials?, affectedDrawings?, affectedTasks?, attachments? }`.
`category` ∈ `DESIGN, MATERIAL, DIMENSION, SCOPE, SITE_CONDITION, CLIENT_REQUEST, SUPPLIER_CHANGE, OTHER`.
Emits `change.created`.

### `GET /api/changes/:id`
### `PATCH /api/changes/:id`
Body: any of `{ title, description, priority }`.

### `POST /api/changes/:id/analyze`
**Runs the Impact Engine.** No body required. Persists an `ImpactAnalysis`, notifies every
affected stakeholder, and emits `change.impact.updated`. Response `200`: `{ analysis }`.

### `GET /api/changes/:id/impact`
Returns the most recent `ImpactAnalysis` for this change. `404` if `analyze` hasn't been run yet.

### `POST /api/changes/:id/approve`
Approves the change, clears its pending approvals, and unblocks their tasks (unless another
still-pending approval also blocks the same task). Emits `approval.approved`.

### `POST /api/changes/:id/reject`
Emits `approval.rejected`.

---

## Materials & substitution

### `GET /api/projects/:projectId/materials`
### `POST /api/projects/:projectId/materials`
Body: `{ name, category?, price, leadTimeDays, supplierId?, linkedDrawingIds?, linkedTaskIds? }`.

### `PATCH /api/materials/:id/unavailable`
Body: `{ reason }`. Notifies architects/designers/consultants on the project. Emits `material.unavailable`.

### `POST /api/materials/:id/substitutions`
Body: `{ name, price, leadTimeDays, imageUrl?, notes?, requiresApproval?, changeRequestId? }`.
Computes `priceDelta`/`leadTimeDeltaDays` against the original material. If `changeRequestId`
is supplied, recalculates that change's impact analysis with the real delta and emits
`change.impact.updated`. Emits `material.substitution.created`.

### `PATCH /api/material-substitutions/:id`
Restricted to `CLIENT, ARCHITECT, CONSULTANT`. Body: `{ status: "APPROVED" | "REJECTED" }`.
On approval, applies the alternative's price/lead-time onto the original `Material` and marks it available again.

---

## Approvals (dependency map)

### `GET /api/projects/:projectId/approvals`
Each approval includes its resolved `blockedTasks` (title + status), not just raw IDs.

### `GET /api/approvals/:id`
### `POST /api/approvals/:id/approve`
Unblocks dependent tasks, respecting other still-pending approvals on the same task. Emits `approval.approved`.
### `POST /api/approvals/:id/reject`
Emits `approval.rejected`.

---

## Drawings

### `GET /api/projects/:projectId/drawings`
### `POST /api/projects/:projectId/drawings`
Body: `{ name, category?, revision?, fileUrl?, cloudinaryPublicId?, supersedesDrawingId? }`.
If `supersedesDrawingId` is given, that drawing is flipped to `SUPERSEDED` and the new one is `CURRENT`.
Emits `drawing.revision.created`.

### `PATCH /api/drawings/:id`
Body: `{ status?, fileUrl? }`.

---

## Tasks

### `GET /api/projects/:projectId/tasks?assignedTo=<userId>`
### `PATCH /api/tasks/:id/status`
Body: `{ status }`, one of `NOT_STARTED, IN_PROGRESS, BLOCKED, COMPLETED`. A task can't be
manually set to `BLOCKED` (that's derived from pending approvals only), and a currently
`BLOCKED` task can't be moved to anything else until its blocking approval clears. Emits `task.status.updated`.

---

## Site observations

### `GET /api/projects/:projectId/site-observations`
### `POST /api/projects/:projectId/site-observations`
Body: `{ title, description?, location?, expectedValue?, actualValue?, unit?, drawingId?, drawingRevision?, photos?, severity? }`.
Notifies architects/consultants/contractors on the project. Emits `site.observation.created`.

### `PATCH /api/site-observations/:id`
Body: `{ status }`, one of `OPEN, UNDER_REVIEW, ACKNOWLEDGED, RESOLVED`. Emits `site.observation.updated`.

---

## Feedback (installer → design loop)

### `GET /api/projects/:projectId/feedback`
### `POST /api/projects/:projectId/feedback`
Body: `{ title, description, relatedTask?, relatedDrawing?, relatedChange?, relatedSiteObservation?, photos?, measurements?, severity? }`.
Notifies architects/consultants. Emits `feedback.created`.

### `PATCH /api/feedback/:id`
Body: `{ status }`, one of `OPEN, UNDER_REVIEW, ACTION_REQUIRED, RESOLVED, CLOSED`. Emits `feedback.resolved` when set to `RESOLVED`.

---

## Decisions

### `GET /api/projects/:projectId/decisions`
### `POST /api/projects/:projectId/decisions`
Body: `{ title, description?, decisionType?, relatedChangeRequest?, supersedesDecision?, rationale?, attachments? }`.
If `supersedesDecision` is given, the old decision is flipped to `SUPERSEDED`. Emits `decision.created` and, if superseding, `decision.superseded`.

### `POST /api/decisions/:id/approve`
Emits `decision.approved`.
### `POST /api/decisions/:id/reject`
Body: `{ reason? }`. Emits `decision.rejected`.

---

## Notifications

### `GET /api/notifications`
Response: `{ notifications, unreadCount }`, most recent 100.
### `PATCH /api/notifications/:id/read`
### `PATCH /api/notifications/read-all`

---

## Activity

### `GET /api/projects/:projectId/activity`
Most recent 200 activity records for the project, newest first.

---

## Search

### `GET /api/projects/:projectId/search?q=<term>`
Simple case-insensitive substring search across changes, decisions, materials, drawings,
tasks, site observations, and feedback (spec section 35 -- intentionally not full-text search).

---

## Media upload

### `POST /api/media/upload`
`multipart/form-data`: `file` (max 15MB, JPEG/PNG/WebP/PDF only), plus `projectId`, `entityType`, `entityId?`.
Flow: browser → this endpoint → Cloudinary → only the resulting URL/metadata is stored in MongoDB.
Response `201`: `{ asset }`.

---

## Error shape

Every error response follows:
```json
{ "error": { "code": "SOME_CODE", "message": "human readable message" } }
```
Common codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `CONFLICT` (409).
Stack traces are never sent to the client, even in error responses.

## Socket.IO events

See `docs/architecture.md` for the room model. Event names live in
`packages/shared/src/enums.ts` under `SOCKET_EVENTS`, plus `task.status.updated` and
`decision.rejected` (added alongside the task/decision endpoints above).
