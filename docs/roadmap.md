# Roadmap

## Stage 1 — Backend foundation + Impact Engine (this delivery)
- Models, auth, project membership, deterministic Impact Engine, all REST
  endpoints, Socket.IO server, Cloudinary pipeline, seed script, first tests.

## Stage 2 — Real-time layer polish + remaining domain logic
- Wire every mutating REST action to its Socket.IO event end-to-end with a
  running MongoDB instance (this stage's tests ran against the app layer
  only, without a live database, since the sandboxed build environment
  can't reach MongoDB Atlas or download a local Mongo binary).
- Round out approval-dependency edge cases (partial unblocking, multiple
  blocking approvals per task).
- File-validation hardening on the upload endpoint.

## Stage 3 — Next.js frontend
- Role-specific dashboards (Client, Architect, Interior Designer, Consultant,
  Contractor, Supplier, Fabricator, Installer).
- Change Detail page (impact summary, affected entities, decision history,
  activity timeline, actions).
- Impact Graph and Approval Dependency Map visualizations.
- Redux Toolkit slices + thunks wired to the REST API, Socket.IO client
  updating Redux state live.
- Dark-mode-first design system (next-themes), responsive layouts,
  mobile-friendly site-observation flow for installers.
- Landing page per spec section 31.

## Stage 4 — Testing, docs, deployment polish
- Playwright E2E covering the full hero workflow end-to-end.
- Socket event tests (correct room, correct user, no cross-project leakage)
  against a live MongoDB/Socket.IO instance.
- `docs/architecture.md`, `docs/api.md`, `docs/ai-usage.md`.
- Deployment notes / environment variable checklist for production.
