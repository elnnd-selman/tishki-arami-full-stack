# TishkiArami - project rules

## Design rules (strict)
- **No emojis.** Anywhere — UI, code, comments, commit messages. Use the SVG icon
  set in `frontend/src/components/ui/Icons.tsx`.
- **No gradients.** No `linear-gradient`, `radial-gradient`, or `conic-gradient`
  anywhere. Use solid colors only.
- **Colors: Red and Blue.** Blue = primary/brand/actions; Red = accent/danger/brand
  mark. Tokens live in `frontend/src/styles/theme.css` (do not hardcode hex in
  components — use the CSS variables).
- Keep the UI modern and clean: solid surfaces, soft shadows, rounded corners.
- **Light mode only.** The site is always light themed — no dark mode and no
  light/dark toggle. (Exception: the immersive 3D `/experience` cinematic scene.)

## Architecture
- Backend: Express + TypeScript + Prisma + PostgreSQL (`backend/`).
- Frontend: React + Vite + TypeScript (`frontend/`).
- Multilingual: English, Arabic, Kurdish, with full RTL for ar/ku.
- The **Products** module is the canonical template for every other entity.
- RBAC: enforce on every endpoint with `authorize()`; hide UI with the `Can` gate.
  The backend is always the source of truth even if the frontend hides a control.

## Quality bar
- A module is "done" only when its backend tests pass (CRUD, permissions, image
  lifecycle incl. physical file deletion, relationships, multilingual, search/filter,
  DB integrity). Backend tests must pass before building that module's frontend.
- Run before claiming done: `cd backend && pnpm typecheck && pnpm test`,
  and `cd frontend && pnpm typecheck && pnpm build`.
