# TishkiArami

A multilingual catalog platform (browse-only e-commerce). Three apps:

- **`backend/`** — Node + Express + TypeScript + Prisma + PostgreSQL API
- **`frontend/`** — admin console (manage products, categories, brands, variants, images, RBAC)
- **`website/`** — public storefront for visitors (home, catalog, product details, projects, blog, etc.)

Cross-cutting: **English / Arabic / Kurdish** with full RTL, modern **Red + Blue** design
system, **no emojis, no gradients**.

The public website consumes a separate **public, unauthenticated, read-only API** under
`/api/v1/public/*` that only ever returns published/active content. The admin API stays
fully authenticated and permission-gated.

---

## What is implemented

### Foundation (all entities)
- Full Prisma schema for Products, Categories, Brands, Projects, Services, Blogs,
  plus RBAC (Users, Roles, Permissions) and per-entity translation + image tables.
- JWT auth (access + refresh), role-based permissions enforced on every endpoint.
- Image pipeline (sharp): optimization, WebP generation, thumbnail generation, and
  physical-file lifecycle management (create / replace / delete with cleanup).
- Multilingual storage via dedicated translation tables (clean search + integrity).

### Products module (complete, end-to-end)
- CRUD with multilingual content (en / ar / ku).
- Search (by translated name in any language), filter (category / brand / status /
  featured), sorting, and pagination.
- Image management: upload (single + multiple), set cover, replace, delete — each
  with WebP + thumbnail variants and physical file cleanup.
- Permission-gated at the API and hidden in the UI when not allowed.
- **40 automated tests** covering CRUD, permissions, the image pipeline (including
  physical file verification), and database integrity.

Other catalog modules (Categories, Brands, etc.) have their schema + read endpoints
ready and follow the exact Products template; their admin screens are placeholders.

---

## Prerequisites

- Node.js 20+ and `pnpm`
- PostgreSQL running locally on `:5432`

---

## Backend setup

```bash
cd backend
pnpm install

# Databases (adjust the user in .env / .env.test if yours differs)
createdb tishkiarami
createdb tishkiarami_test

# Schema + demo data
pnpm prisma:migrate        # apply migrations to the dev DB
pnpm db:seed               # seed permissions, roles, users and demo catalog

pnpm dev                   # http://localhost:4000/api/v1
```

### Demo accounts (created by the seed)

| Email                     | Password      | Role        | Can do                          |
| ------------------------- | ------------- | ----------- | ------------------------------- |
| admin@tishkiarami.com     | `Admin@12345` | Super Admin | Everything                      |
| editor@tishkiarami.com    | `Editor@12345`| Editor      | Create / edit (no delete)       |
| viewer@tishkiarami.com    | `Viewer@12345`| Viewer      | Read only                       |

### Backend tests

```bash
cd backend
pnpm test                  # runs against the tishkiarami_test database
```

The test runner applies migrations with the non-destructive `prisma migrate deploy`
and isolates each test with `TRUNCATE`. It never resets or drops your dev database.

---

## Admin frontend setup

```bash
cd frontend
pnpm install
pnpm dev                   # http://localhost:5173
```

The dev server proxies `/api` and `/uploads` to the backend on `:4000`, so start the
backend first. Open http://localhost:5173 and sign in with a demo account.

## Public website setup

```bash
cd website
pnpm install
pnpm dev                   # http://localhost:5174
```

Proxies `/api` and `/uploads` to the backend on `:4000`. No login required — it reads the
public storefront API. Pages: Home, Products (with filters/search/sort), Product detail
(gallery + variants), Categories, Brands, Services, Projects (+ detail), Blog (+ article),
About, Contact. All responsive and available in English, Arabic and Kurdish.

---

## Project layout

```
backend/
  prisma/schema.prisma         # full data model
  prisma/seed.ts               # permissions, roles, users, demo catalog
  src/
    config/        env, permission catalog
    lib/           prisma, jwt, password, errors
    middleware/    auth, authorize (RBAC), validate, upload, error
    services/      image.service.ts  (sharp pipeline + file lifecycle)
    modules/
      auth/        login / refresh / me / logout
      products/    schema, service, controller, routes, serializer
      lookups/     categories, brands, meta (for the UI)
  tests/           auth.test.ts, products.test.ts (40 tests)

frontend/
  src/
    auth/          AuthContext, ProtectedRoute, Can (permission gate)
    components/    ui (Button/Table/Toast/Modal/...), layout (Sidebar/Topbar)
    hooks/         useProducts (React Query)
    i18n/          en / ar / ku locale files + RTL handling
    pages/         Login, Dashboard, products (List + Form + ImageManager)
    styles/        theme.css (Red+Blue tokens), global.css, layout.css
```

---

## Configuration

Backend config lives in `backend/.env` (dev) and `backend/.env.test` (tests). Key vars:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — change these in production
- `UPLOAD_DIR` — where image variants are written (default `uploads`)
- `MAX_UPLOAD_SIZE_MB` — per-file upload limit (default 8)
- `CORS_ORIGIN` — allowed frontend origin (default `http://localhost:5173`)
# tishki-arami-full-stack
