## MinIO object storage

This folder contains the MinIO image used for storing project assets and
LaTeX source files.

What it does:
- `Dockerfile` builds a MinIO server image with the standard entrypoint.
- The root `docker-compose.yml` runs MinIO and creates a bucket via `minio-init`.

Ports:
- `9000` S3 API
- `9001` Admin console

Default credentials (override in `.env`):
- `MINIO_ROOT_USER` (default: `texedo`)
- `MINIO_ROOT_PASSWORD` (default: `texedo_minio_password`)
- `MINIO_BUCKET` (default: `texedo`)
