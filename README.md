# ImpactFlow

"See the impact before it becomes a problem."

ImpactFlow is a modular project ecosystem for architecture, interior design,
construction, fabrication, installation, consulting, suppliers, contractors,
and clients. Its core purpose is **not** generic project management. It is
built around one idea:

```
CHANGE → IMPACT → DEPENDENCIES → DECISION → EXECUTION → SITE FEEDBACK
```

The centerpiece is a **deterministic, rule-based Impact Engine**: given a
change request, it walks the real relationships already stored between
materials, drawings, tasks, approvals, and people, and tells you exactly
what that change touches — before you approve it. No AI, no guessing — the
same input always produces the same, auditable output.

## Status: feature-complete and verified

Both the backend and the Next.js frontend are built and working. Every claim
below has been checked with a real `tsc` typecheck, a real `next build`, a
real `vitest` run, or a real request against a live MongoDB Atlas instance —
not just written and assumed correct. See `docs/ai-usage.md` for the two
real bugs this process caught and fixed along the way.

## What's built

### Identity, roles, and access control
- JWT auth (register/login), bcrypt password hashing
- Roles: `ADMIN`, `CLIENT`, `ARCHITECT`, `INTERIOR_DESIGNER`, `CONSULTANT`,
  `CONTRACTOR`, `SUPPLIER`, `FABRICATOR`, `INSTALLER`
- `ADMIN` is deliberately excluded from self-registration — granted only by
  editing the database directly. Admins provision every project and can see
  and act on **all of them**, without needing an explicit membership record
  on each one (enforced in the membership middleware and the Socket.IO room
  handler, not just hidden in the UI)
- Every other role only sees projects they've been explicitly added to
- Profile self-service: update your own name, address, and avatar (role and
  email are admin-only changes)
- Gender-based default avatar (DiceBear) until someone uploads their own photo

### The Impact Engine (the core feature)
- `apps/server/src/services/impact/impactEngineService.ts` — fully
  deterministic, implements all 12 rules from the design spec: material →
  drawing → task → supplier → approval → stakeholder resolution, cost/schedule
  delta calculation, impact-level scoring
- Verified live: seeded a real bathroom-marble change and confirmed the
  engine correctly found 1 material, 1 drawing, 2 tasks, 1 approval, and 4
  stakeholders, scored `HIGH`

### Change requests & approvals
- Full change request lifecycle: create → analyze → approve/reject
- Approval Dependency Map: shows exactly which tasks are blocked by a pending
  approval, and correctly handles a task blocked by *more than one* approval
  (only unblocks when every blocking approval has cleared — this was a real
  bug, found and fixed)
- Decisions: propose, approve, reject, and explicitly supersede an older
  decision

### Materials & substitution
- Mark a material unavailable with a reason, notifying the relevant roles
- Propose an alternative with a real computed price/lead-time delta (not
  invented), which can trigger a live re-analysis of the linked change
- Approve/reject a proposed substitution (restricted to Client/Architect/
  Consultant)

### Drawings, tasks, site observations, feedback
- Drawing revisions with automatic supersession (new revision marks the old
  one `SUPERSEDED`)
- Task status updates, with a task correctly barred from being manually
  marked `BLOCKED` (that's derived only from pending approvals) or moved out
  of `BLOCKED` until its approval clears
- Site observations with expected-vs-actual measurements and real photo
  uploads
- Installer → design feedback loop

### Real-time layer
- Socket.IO, JWT-authenticated on connect, project-membership-checked on
  room join (admins bypass this check, same as REST)
- Events: change created/analyzed, material unavailable, substitution
  proposed, approval approved/rejected, drawing revision created, decision
  created/approved/rejected/superseded, site observation created/updated,
  feedback created/resolved, task status updated, chat message created,
  notifications
- Verified with a real two-client test script (`scripts/verifySocket.ts`),
  not just by reading the code

### Team management
- Any project member can invite an existing ImpactFlow user by email
  (admin-gated for actually adding them); roster view with names, emails,
  and per-project roles

### Chat
- One shared thread per project, all members included
- Real-time delivery over the existing Socket.IO project room
- Read receipts driving a real unread-count badge in the sidebar
- Verified: a user outside the project gets `403` trying to read *or* send

### File uploads
- Browser → backend → Cloudinary → only the URL/metadata stored in MongoDB
  (never raw bytes)
- Real image/PDF previews rendered in the UI (drawings, site-observation
  photos, chat avatars, profile pictures) — not just stored and forgotten
- Server-side type/size validation (15MB cap, JPEG/PNG/WebP/PDF only),
  enforced at the upload-middleware layer, not just in a controller

### Admin Console
- `/admin` (admin-only): every project across the company in one view, with
  real computed numbers per project — active changes, pending approvals,
  member count, most recent activity entry

### Notifications
- Bell icon → dropdown of recent notifications → click one → full detail
  modal
- Unread count, mark-one-read, mark-all-read

### Search & activity
- Simple case-insensitive search across changes, decisions, materials,
  drawings, tasks, site observations, and feedback within a project
- Full activity timeline per project

### Frontend
- Next.js 16 (App Router), React 19, TypeScript strict mode, Tailwind,
  Redux Toolkit (11 slices, all wired to real endpoints), Socket.IO client,
  next-themes (dark/light)
- Public landing page with hero section, login/register CTAs
- Dashboard shell: sidebar (Home, All Projects, Admin Console for admins,
  full per-project nav), topbar (project switcher, notification dropdown,
  theme toggle, profile menu), mobile slide-over nav
- Every page listed under "What's built" above has a real, working screen —
  nothing is a placeholder or a fake button

## Tech stack

**Backend:** Node.js, Express, TypeScript (strict), MongoDB/Mongoose,
Socket.IO, JWT, bcrypt, Zod, Helmet, CORS, express-rate-limit, Cloudinary,
Multer.

**Frontend:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS,
Redux Toolkit, Socket.IO client, next-themes, Sonner (toasts), Lucide icons.

## Getting started

### Backend
```bash
cd apps/server
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, Cloudinary keys
npm install --workspaces
npm run dev              # starts the API on :4000
npm run seed              # populates the Greenwood Residence demo project
npm test                   # runs the test suite
```

### Frontend
```bash
cd apps/web
cp .env.example .env.local
npm install --workspaces
npm run dev                # starts on :3000
```

### Live integration tests (optional, against a real database)
```bash
cd apps/server
$env:TEST_MONGODB_URI = "your-atlas-uri"   # PowerShell; use export on macOS/Linux
npx vitest run tests/integration.test.ts
```
These create and clean up their own test data — safe to point at your real
database (they only touch records matching `@integration-test.local` /
`INTEG-TEST`).

### Demo accounts (after seeding)

All use the password `Demo@1234`.

| Role | Email |
|---|---|
| Admin | admin@impactflow.demo |
| Client | client@impactflow.demo |
| Architect | architect@impactflow.demo |
| Interior Designer | designer@impactflow.demo |
| Consultant | consultant@impactflow.demo |
| Contractor | contractor@impactflow.demo |
| Supplier | supplier@impactflow.demo |
| Fabricator | fabricator@impactflow.demo |
| Installer | installer@impactflow.demo |

Log in as `admin@impactflow.demo` to see the Admin Console and full
cross-project visibility. Log in as any other seeded account to see the
Greenwood Residence hero scenario (a bathroom marble change that ripples
through a supplier, a drawing, two tasks, and a client approval) from that
role's perspective.

## Why a rule-based Impact Engine instead of AI?

Project relationships and impact calculations need to be deterministic and
auditable — a team needs to trust that "this change affects these 6 things"
is a fact, not a guess. See `docs/ai-usage.md` for the full reasoning, and
for exactly where AI is and isn't used in this codebase (short answer: it
isn't used anywhere at request time yet — everything above is deterministic
code, not model output).

## Repository layout

```
impactflow/
├── apps/
│   ├── server/     # Express + TypeScript API
│   │   ├── src/
│   │   │   ├── models/         # Mongoose schemas
│   │   │   ├── controllers/     # Parse request, call services, shape response
│   │   │   ├── routes/           # One router per resource
│   │   │   ├── middleware/        # auth, role, projectAccess, error, rate limit
│   │   │   ├── services/
│   │   │   │   ├── impact/          # The Impact Engine
│   │   │   │   ├── decision/         # Approval-unblock logic
│   │   │   │   └── notification/      # Notification fan-out + activity log
│   │   │   ├── socket/               # Socket.IO server + room logic
│   │   │   └── utils/                 # JWT, AppError, avatar generation, seed script
│   │   ├── tests/                       # Unit + live-database integration tests
│   │   └── scripts/verifySocket.ts        # Real two-client Socket.IO test
│   └── web/        # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages (see route list below)
│           ├── components/      # UI primitives, layout, impact graph, uploads
│           ├── store/            # Redux Toolkit slices (11)
│           └── lib/               # API client, socket provider, upload helper
├── packages/
│   └── shared/     # Shared enums/types used by both apps
└── docs/           # architecture.md, api.md, ai-usage.md, roadmap.md
```

## Documentation

- `docs/architecture.md` — system diagrams (request flow, Impact Engine
  internals, Socket.IO room model, full hero-workflow sequence)
- `docs/api.md` — every REST endpoint, generated from the actual registered
  routes rather than written from memory
- `docs/ai-usage.md` — honest account of where AI was and wasn't used,
  including two real bugs it introduced and how they were caught by actually
  running the software
- `docs/roadmap.md` — what's still genuinely open (see below)

## What's genuinely still open

- AI-assisted plain-language impact explanations (optional per the original
  spec, and intentionally not built yet — see `docs/ai-usage.md` for why this
  is a deliberate sequencing choice, not an oversight)
- Playwright end-to-end browser tests (the hero workflow is covered by
  server-side integration tests against a live database, but not yet
  driven through an actual browser)
- Cloudinary transformations/optimization presets (uploads work; no
  resizing/format presets configured yet)
- Advanced full-text search (current search is a simple, honest
  case-insensitive substring match, which was the explicit spec choice for
  MVP — see spec section 35)
