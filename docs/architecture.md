# Architecture

## System overview

```mermaid
flowchart LR
    Client[Next.js Client] -->|REST| API[Express API]
    Client -->|WebSocket| Socket[Socket.IO Server]
    API --> Impact[Impact Engine]
    API --> Mongo[(MongoDB)]
    API --> Cloud[Cloudinary]
    Impact --> Mongo
    API -->|emits after persisting| Socket
    Socket -->|pushes to rooms| Client
```

**REST is the source of truth.** Every mutation goes: request → validate → persist to
MongoDB → *then* emit a Socket.IO event describing what changed. Socket.IO never
originates state; it only tells already-connected clients "go refetch, something changed."
This means a client that missed an event (page refresh, reconnect) is never out of sync --
the REST API always has the true current state.

## Request flow

```
Client
  ↓ REST request (with JWT)
Express (helmet, cors, rate limiter)
  ↓
authenticateUser (verifies JWT, loads req.user)
  ↓
authorizeRole (optional, per-route)
  ↓
checkProjectMembership (verifies req.user belongs to the target project)
  ↓
Controller (parses/validates body with Zod, calls services)
  ↓
Service (business logic -- Impact Engine, notification fan-out, approval unblocking)
  ↓
Model (Mongoose, talks to MongoDB)
  ↓
Controller emits a Socket.IO event to the relevant project/user room
  ↓
Response back to client
```

Business logic never lives in route files or controllers directly -- controllers parse
input and orchestrate; services own the actual rules (see `services/impact/impactEngineService.ts`,
`services/decision/approvalService.ts`, `services/notification/notificationService.ts`).

## The Impact Engine

```mermaid
flowchart TD
    CR[Change Request] --> M{Has affectedMaterials?}
    M -->|yes| MAT[Look up linked drawings, tasks, supplier]
    CR --> D{Has affectedDrawings?}
    D -->|yes| DR[Look up drawing's linked tasks]
    MAT --> TASKS[Union of affected tasks]
    DR --> TASKS
    TASKS --> APP[Find approvals blocking those tasks]
    TASKS --> STAKE[Resolve stakeholders: requester, assignees, project members by role]
    APP --> LEVEL[calculateImpactLevel: entity counts + cost/schedule delta]
    STAKE --> LEVEL
    LEVEL --> SAVE[Persist ImpactAnalysis document]
    SAVE --> NOTIFY[Notify every affected stakeholder]
    SAVE --> EMIT[Emit change.impact.updated]
```

The engine is entirely rule-based (see spec section 37's 12 rules) -- no AI, no ML model,
no probabilistic scoring. Given the same change request and the same underlying data, it
always produces the same result. This is a deliberate choice: teams need to *trust* an
impact report, and a black-box or non-deterministic score can't be audited or explained
to a client. See `docs/ai-usage.md` for where AI fits in instead.

## Socket.IO room model

```mermaid
flowchart LR
    Socket[Client Socket] -->|auth: JWT| Server[Socket.IO Server]
    Server -->|verify JWT| Auth[Same JWT verification as REST]
    Auth --> Join[project:join event]
    Join -->|checks ProjectMember| Room1["project:{projectId}"]
    Join --> Room2["project:{projectId}:{role}"]
    Server -->|on connect| Room3["user:{userId}"]
```

- `user:{userId}` — joined automatically on connect. Used for personal notifications.
- `project:{projectId}` — joined only after the server verifies (via `ProjectMember`)
  that this user actually belongs to the project. A socket that isn't a member is
  silently not added to the room -- no error detail is leaked about the project's
  existence or membership to an unrelated user.
- `project:{projectId}:{role}` — a role-scoped room within the project, for role-specific
  broadcasts (e.g. only suppliers for a material-request event), joined at the same time.

## Data flow: hero workflow (spec section 3)

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Engine as Impact Engine
    participant DB as MongoDB
    participant IO as Socket.IO

    Client->>API: POST /changes (create change)
    API->>DB: persist ChangeRequest
    API->>IO: change.created -> project room
    Client->>API: POST /changes/:id/analyze
    API->>Engine: analyzeChange(id)
    Engine->>DB: read Material/Drawing/Task/Approval/ProjectMember
    Engine->>DB: persist ImpactAnalysis
    API->>IO: change.impact.updated -> project room
    API->>DB: create Notification per stakeholder
    Note over Client,IO: Supplier marks material unavailable, proposes alternative
    Client->>API: PATCH /materials/:id/unavailable
    API->>IO: material.unavailable -> project room
    Client->>API: POST /materials/:id/substitutions
    API->>Engine: recalculateForSubstitution (price/lead-time delta)
    API->>IO: change.impact.updated (recalculated)
    Note over Client,IO: Approval blocks procurement + installation tasks
    Client->>API: POST /approvals/:id/approve
    API->>DB: unblockTasksIfClear (only if no other approval still blocks it)
    API->>IO: approval.approved -> project room
```

## Folder structure

See the root `README.md` for the top-level layout. Inside `apps/server/src`:

```
src/
├── app.ts            # Express app: middleware + route mounting
├── server.ts          # Entry point: connects DB, boots HTTP + Socket.IO
├── config/            # DB connection, Cloudinary config
├── models/             # Mongoose schemas
├── controllers/         # Parse request, call services, shape response
├── routes/              # Express routers, one per resource
├── middleware/           # auth, role, projectAccess, error
├── services/
│   ├── impact/           # The Impact Engine
│   ├── decision/          # Approval-unblock logic
│   └── notification/       # Notification fan-out + activity recording
├── socket/               # Socket.IO server + room logic
└── utils/                 # JWT helpers, AppError, seed script
```
