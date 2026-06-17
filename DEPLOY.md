# Deploying TishkiArami on Vercel (Services)

This repo deploys as a single Vercel project using the **Services** preset
(`experimentalServices` in the root `vercel.json`):

| Service   | Folder     | Public path     | What it is                    |
|-----------|------------|-----------------|-------------------------------|
| `website` | `website/` | `/`             | Public storefront (Vite SPA)  |
| `backend` | `backend/` | `/_/backend`    | Express + Prisma API          |

The admin dashboard (`frontend/`) is **not** in the Services config — deploy it
as a separate Vercel project (Root Directory `frontend`) if you need it.

## Required environment variables (Vercel → Project → Settings → Environment Variables)

**website service**
- `VITE_API_BASE=/_/backend` — so the SPA calls the backend service
  (in local dev this is empty and Vite proxies `/api` to `localhost:4000`).

**backend service**
- `DATABASE_URL` — a **hosted PostgreSQL** (Vercel Postgres, Neon, Supabase, …).
  Vercel's filesystem is ephemeral, so the DB must be external.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — strong random secrets.
- `PUBLIC_BASE_URL=/_/backend` — so generated image URLs resolve under the
  backend service path.
- `CORS_ORIGIN` — your deployed domain(s).

After the first deploy, run the migrations + seed against the hosted DB once:

```
cd backend
DATABASE_URL="<hosted-postgres-url>" pnpm prisma:deploy
DATABASE_URL="<hosted-postgres-url>" pnpm db:seed
```

## Heads-up: uploaded images on serverless

The backend writes uploaded images to `backend/uploads/` on disk. On Vercel's
serverless runtime that disk is **ephemeral** — files written at runtime do not
persist between invocations. The seed re-downloads its demo images, but any
images uploaded through the admin later will not survive. For production image
uploads, move storage to an object store (S3 / Cloudinary / Vercel Blob). If you
prefer to avoid this entirely, host the backend on **Render/Railway/Fly** (real
disk + Postgres) and point `VITE_API_BASE` at that URL instead.

## Local dev (unchanged)

```
cd backend  && pnpm dev   # http://localhost:4000
cd website  && pnpm dev   # http://localhost:5174  (proxies /api -> 4000)
cd frontend && pnpm dev   # http://localhost:5173
```
