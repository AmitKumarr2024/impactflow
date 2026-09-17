# AI Usage

## Where AI was used in building this project

This codebase was generated with Claude (Anthropic) acting as the implementing engineer,
working from a detailed product specification supplied by the project owner. Claude:

- Designed the Mongoose schema set, service-layer boundaries, and route structure
- Implemented the deterministic Impact Engine's 12 rules as literal code (not as an
  AI-generated heuristic -- see "What AI did NOT do" below)
- Wrote the Express middleware chain (auth, role, project-membership, rate limiting, error handling)
- Wrote the Socket.IO server and room-authorization logic
- Wrote the seed script and its demo data (the Greenwood Residence scenario)
- Wrote and ran the test suite, and debugged real failures found by actually running the
  code against a live MongoDB Atlas instance and a live Socket.IO connection (not just
  generating tests that were assumed to pass)

## Bugs AI introduced and then found by actually running the software

Two real defects were caught this way, not by inspection:

1. **Membership-check precedence bug.** `checkProjectMembership` read `req.params.id`
   (the *entity's* id, e.g. a change request's id) before it read the resolved
   `req.body.projectId`, so any route shaped like `/api/changes/:id/analyze` checked
   membership against the wrong document and incorrectly returned `403 FORBIDDEN`. Found
   when the product owner ran the actual `analyze` call against a live server and pasted
   the real error.
2. **Silent task-unblock bug.** Approving a change flipped its approvals' status to
   `APPROVED` in the database but never touched the tasks those approvals were blocking,
   so procurement/installation tasks would stay stuck at `BLOCKED` forever even after a
   client approved. Found by re-reading the approval logic specifically for this failure
   mode, not caught by the original test suite (which didn't yet cover this path).

Both were fixed, and the fix for #2 was covered by a new integration test
(`tests/integration.test.ts`) so it can't silently regress.

## What AI did NOT do

- **The Impact Engine does not use AI.** `analyzeChange`, `calculateImpactLevel`,
  `calculateEstimatedCostDelta`, etc. are plain deterministic functions that read real
  relationships out of MongoDB (which material links to which drawing/task/supplier) and
  apply fixed rules. Given the same underlying data, the same change request always
  produces the same impact report. This was a deliberate product decision (see spec
  section 38 and `docs/architecture.md`): a team needs to be able to trust and audit
  "this change affects these 6 things," not just be told so by a model that might
  hallucinate a relationship that doesn't exist in the data.
- AI did not invent costs, schedules, approvals, permissions, or project relationships at
  runtime. Every number the Impact Engine reports traces back to a real `price`,
  `leadTimeDays`, or count of matched documents.
- No AI model call happens anywhere in the current backend at request time. There is no
  LLM API integration in this codebase yet.

## What was manually verified (not just generated and assumed correct)

- TypeScript strict-mode compiles clean across the whole backend
- The compiled server actually boots and serves `/health`
- Auth is enforced by the backend, not just hidden in the UI (confirmed: no-token and
  malformed-token requests both return `401` before reaching a controller)
- The Impact Engine was run against a live MongoDB Atlas instance with real seeded data
  and produced a correct, explainable result (1 material change → 1 drawing, 2 tasks,
  1 approval, 4 stakeholders, `HIGH` impact)
- Socket.IO real-time delivery was verified with a real two-client test script
  (`scripts/verifySocket.ts`), not just by reading the emit calls

## Planned future AI usage (not yet built)

Per spec section 38, AI is scoped as an **optional explanation layer**, to be added later
and clearly labeled as AI-generated wherever it appears:

- Plain-language summaries of an impact report ("this affects your bathroom supplier and
  installer because...")
- Change-request and feedback summarization for long descriptions
- Natural-language project search
- Explaining *why* a suggested alternative material was proposed, in plain language

None of these would replace the deterministic engine as the source of truth for what is
affected, what something costs, or who needs to approve what -- they would only narrate
results the deterministic engine already computed.

## Limitations of this document

This document reflects the state of the codebase as of Stage 2 of the build (backend +
Impact Engine + real-time layer). It will be updated as the Next.js frontend (Stage 3)
and any future AI-assisted features are added.
