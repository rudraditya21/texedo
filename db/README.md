## Postgres via Docker Compose

Quick start:

1. Copy `.env.example` to `.env` and adjust credentials if needed.
2. From this directory run `docker compose up -d` to start Postgres 16 on `${POSTGRES_PORT:-5432}`.
3. Connect with `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`.
4. Stop with `docker compose down` (add `-v` if you want to remove the named volume `postgres_data`).
