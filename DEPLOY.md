# Deploying TishkiArami

This repo has **three** apps:

| App        | Folder     | What it is                          | Where to host        |
|------------|------------|-------------------------------------|----------------------|
| `website`  | `website/` | Public storefront (Vite SPA)        | **Vercel**           |
| `frontend` | `frontend/`| Admin dashboard (Vite SPA)          | **Vercel** (optional)|
| `backend`  | `backend/` | Express + Prisma + PostgreSQL + file uploads | **NOT Vercel** — see below |

## Why the backend is not on Vercel

The backend is a long-running Express server that needs a **persistent PostgreSQL
database** and writes **uploaded image files to disk** (`backend/uploads/`).
Vercel is serverless with an ephemeral filesystem, so it can't host this as-is.
Host the backend on a platform with a real server + disk + managed Postgres, e.g.
**Render**, **Railway**, or **Fly.io**. You'll get a public URL like
`https://tishkiarami-api.onrender.com`.

## 1. Deploy the backend (Render/Railway/etc.)

- Root directory: `backend`
- Build: `pnpm install && pnpm prisma:generate && pnpm build`
- Start: `pnpm prisma:deploy && pnpm start`
- Attach a managed **PostgreSQL** and set env vars (see `backend/.env`):
  - `DATABASE_URL` — the managed Postgres URL
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — strong random secrets
  - `PUBLIC_BASE_URL` — the backend's own public URL (so image URLs resolve)
  - `CORS_ORIGIN` — your Vercel domains, comma-separated
    (e.g. `https://tishkiarami.vercel.app,https://admin-tishkiarami.vercel.app`)
- After first deploy, seed once: `pnpm db:seed`
- Note the public URL — call it `BACKEND_URL`.

## 2. Point the frontends at the backend

In **`website/vercel.json`** and **`frontend/vercel.json`**, replace
`REPLACE-WITH-BACKEND-DOMAIN` with your `BACKEND_URL` host (no protocol path,
no trailing slash), e.g. `tishkiarami-api.onrender.com`.

These files proxy `/api/*` and `/uploads/*` to the backend and send every other
route to `index.html` (SPA routing). Because the browser only ever talks to the
Vercel domain, there are no CORS issues for the public site.

## 3. Create the Vercel project(s)

Public site:
- New Project → import this Git repo
- **Root Directory: `website`**
- Framework Preset: Vite (auto-detected); build `pnpm build`, output `dist`
- Deploy. This is your public site at `/`.

Admin dashboard (optional, second Vercel project on the same repo):
- New Project → same repo → **Root Directory: `frontend`**
- Deploy. Then set the backend's `CORS_ORIGIN` to include this domain too.

## Local dev (unchanged)

```
cd backend  && pnpm dev   # http://localhost:4000
cd website  && pnpm dev   # http://localhost:5174
cd frontend && pnpm dev   # http://localhost:5173
```
Vite proxies `/api` and `/uploads` to `localhost:4000` in dev.
