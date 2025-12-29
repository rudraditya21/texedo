## Texedo web app

This is the Next.js application for Texedo, including the project dashboard,
LaTeX editor, and preview.

## Getting Started

First, install dependencies and run the development server:

```bash
cd www
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

Core routes:
- `/` project dashboard
- `/project/:projectId/editor` LaTeX editor and live preview
- `/api/health` service status (Postgres + MinIO)
- `/api/latex` LaTeX compilation (requires `pdflatex` on the host)

Services required:
- Postgres + MinIO from the root `docker-compose.yml`
- `pdflatex` installed locally for `/api/latex`

Environment variables (optional):
- `DATABASE_URL` or `POSTGRES_*` for database connection
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, `MINIO_ENDPOINT`

This app uses `next-themes` for theming and `react-pdf` for previews.

## Notes
- The editor autosaves source files to MinIO through `/api/projects/:id/sources`.
- Project metadata and file references are stored in Postgres.

If you need a LaTeX compiler container instead of local `pdflatex`, let us know.
