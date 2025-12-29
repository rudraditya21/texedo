## Postgres schema and container

This folder holds the Postgres image build and initial schema.

What it does:
- `Dockerfile` builds a Postgres 16 image and copies `init.sql` into the init directory.
- `init.sql` creates the core tables and triggers on first-time database initialization.

Quick start:
1. From the repo root run `docker compose up -d --build`.
2. Postgres listens on `${POSTGRES_PORT:-5432}` with `${POSTGRES_DB:-texedo_db}`.
3. Connect with `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`.

Notes:
- The init script only runs on a fresh volume. To rerun it, stop and remove volumes with `docker compose down -v` and start again (data loss).
