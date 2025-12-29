## Texedo

Texedo is a local, open-source LaTeX editor inspired by Overleaf, built with
Next.js, Postgres, and MinIO.

Repository layout:
- `www` Next.js app (editor, preview, API routes)
- `db` Postgres schema and Docker build
- `minio` MinIO Docker build for object storage

Quick start:
1. `docker compose up -d --build`
2. `cd www && npm install`
3. `npm run dev`

Local services:
- Postgres: `localhost:${POSTGRES_PORT:-5432}`
- MinIO API: `localhost:${MINIO_PORT:-9000}`
- MinIO console: `localhost:${MINIO_CONSOLE_PORT:-9001}`

Notes:
- The database schema initializes on a fresh volume only.
- `/api/latex` requires `pdflatex` installed on the host.
