# TishkiArami — Deployment Guide

## Project structure

This mono-repo contains **three projects** in one folder:

| Folder       | What it is                                 | Dev port |
|--------------|--------------------------------------------|----------|
| `backend/`   | Express + TypeScript + Prisma API          | 4000     |
| `website/`   | Public storefront (Vite + React SPA)       | 5174     |
| `frontend/`  | Admin dashboard (Vite + React SPA)         | 5173     |

All three live together in the single GitHub repo:
`https://github.com/elnnd-selman/tishki-arami-full-stack`

---

## Option A — VPS (recommended for production images)

Use this when you want real persistent disk for uploaded images (the Vercel
serverless filesystem is wiped between deployments). Any Ubuntu/Debian VPS with
at least 1 GB RAM works.

### 1. Server setup (run once as root or sudo user)

```bash
# Node.js 20 + pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs postgresql nginx
npm install -g pnpm pm2

# PostgreSQL — create DB + user
sudo -u postgres psql <<SQL
CREATE USER tishki WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE tishkiarami OWNER tishki;
\q
SQL
```

### 2. Clone the repo

```bash
git clone https://github.com/elnnd-selman/tishki-arami-full-stack.git /srv/tishkiarami
cd /srv/tishkiarami
```

### 3. Backend

```bash
cd backend
cp .env.example .env           # then edit the values below
pnpm install --frozen-lockfile
pnpm prisma:deploy             # run migrations
pnpm db:seed                   # seed demo data (first time only)
pnpm build
pm2 start dist/server.js --name tishkiarami-api
pm2 save
pm2 startup                    # follow the printed command to auto-start on reboot
```

**Required `.env` values for the backend:**

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://tishki:CHANGE_ME_STRONG_PASSWORD@localhost:5432/tishkiarami
JWT_ACCESS_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<random 64-char string>
PUBLIC_BASE_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com
UPLOAD_DIR=uploads
```

Generate secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 4. Website (public storefront)

```bash
cd /srv/tishkiarami/website
pnpm install --frozen-lockfile
VITE_API_BASE=https://yourdomain.com pnpm build
# Output: website/dist/  — served by Nginx as static files
```

### 5. Admin dashboard

```bash
cd /srv/tishkiarami/frontend
pnpm install --frozen-lockfile
VITE_API_URL=https://yourdomain.com/api pnpm build
# Output: frontend/dist/  — served by Nginx under admin.yourdomain.com
```

### 6. Nginx config

Replace `yourdomain.com` with your real domain. SSL via Certbot (`certbot --nginx`).

```nginx
# /etc/nginx/sites-available/tishkiarami

# Public storefront
server {
    listen 80;
    server_name yourdomain.com;
    root /srv/tishkiarami/website/dist;
    index index.html;

    # Uploaded images served directly
    location /uploads/ {
        alias /srv/tishkiarami/backend/uploads/;
        expires 7d;
    }

    # API proxy to Express
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Admin dashboard
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /srv/tishkiarami/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/tishkiarami /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d yourdomain.com -d admin.yourdomain.com
```

### 7. Updating after a git push

```bash
cd /srv/tishkiarami
git pull

# Backend
cd backend && pnpm install --frozen-lockfile && pnpm prisma:deploy && pnpm build
pm2 restart tishkiarami-api

# Website
cd ../website && pnpm install --frozen-lockfile && VITE_API_BASE=https://yourdomain.com pnpm build

# Admin
cd ../frontend && pnpm install --frozen-lockfile && VITE_API_URL=https://yourdomain.com/api pnpm build
```

---

## Option B — Vercel (serverless, easy CI/CD, but ephemeral disk)

This repo deploys as a single Vercel project using the **Services** preset
(`experimentalServices` in the root `vercel.json`):

| Service   | Folder     | Public path     | What it is                    |
|-----------|------------|-----------------|-------------------------------|
| `website` | `website/` | `/`             | Public storefront (Vite SPA)  |
| `backend` | `backend/` | `/_/backend`    | Express + Prisma API          |

The admin dashboard (`frontend/`) is **not** in the Services config — deploy it
as a separate Vercel project (Root Directory `frontend`) if you need it.

### Required environment variables (Vercel project settings)

**website service**
- `VITE_API_BASE=/_/backend`

**backend service**
- `DATABASE_URL` — hosted PostgreSQL (Vercel Postgres, Neon, Supabase …)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `PUBLIC_BASE_URL=/_/backend`
- `CORS_ORIGIN` — your deployed domain(s)

After first deploy, run migrations + seed once:

```bash
cd backend
DATABASE_URL="<hosted-postgres-url>" pnpm prisma:deploy
DATABASE_URL="<hosted-postgres-url>" pnpm db:seed
```

> **Warning:** Vercel's serverless filesystem is ephemeral. Uploaded images
> (product photos, brand logos) will be lost between deployments. Use Option A
> (VPS) or connect an object store (S3 / Cloudinary / Vercel Blob) for
> persistent image storage.

---

## Local development

```bash
cd backend  && pnpm dev   # http://localhost:4000
cd website  && pnpm dev   # http://localhost:5174  (proxies /api -> 4000)
cd frontend && pnpm dev   # http://localhost:5173
```

Default admin credentials after seed: `admin@tishkiarami.com` / `Admin1234!`
