# GoFunIo project Monorepo

This is a fullstack monorepo project with:

- **Frontend**: React + TypeScript (Vite)
- **Backend**: NestJS (Node.js + TypeScript)

It uses **pnpm** as package manager and **monorepo structure**.

## Project Structure

```
GoFunIo/
├ apps/
│  ├ frontend/   # React + TS + Vite
│  └ backend/    # NestJS
├ packages/      # optional shared packages
├ package.json   # root package.json with workspace scripts
└ pnpm-workspace.yaml
```

## Development setup

Requirements: Docker with Compose. Make provides the shortcuts below but is
not required. Node.js and pnpm are not required on the host.

### Docker with Make

Create the local configuration files once, fill in the required values, and
start all services:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
make dev
```

The frontend is available at `http://localhost:5173`, the backend at
`http://localhost:3000`, the MinIO console at `http://localhost:9001`, and the
Mailpit inbox at `http://localhost:8025`.
Source changes trigger hot reload in both applications. Docker Compose creates
the private `gofunio-attachments-local` bucket idempotently and persists its
objects in the `minio_data` volume.

### Docker without Make

Bash:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
docker compose up --build
```

PowerShell:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env
docker compose up --build
```

On Windows, run these commands from PowerShell with Docker Desktop running.

Command reference (`make help` prints the complete list):

| Action                                                         | Make command                        |
| -------------------------------------------------------------- | ----------------------------------- |
| Start all services in the foreground and rebuild               | `make dev`                          |
| Start all services detached and rebuild                        | `make dev-d` or `make dev-detached` |
| Start existing images detached without rebuilding              | `make up`                           |
| Show service status and ports                                  | `make ps`                           |
| Follow all logs                                                | `make logs`                         |
| Follow one service                                             | `make logs SERVICE=backend`         |
| Follow only backend logs                                       | `make logs-backend`                 |
| Limit initial log history                                      | `make logs-backend LOG_TAIL=50`     |
| Restart only the backend                                       | `make restart-backend`              |
| Open a shell in the backend container                          | `make shell-backend`                |
| Stop services but keep database data                           | `make down`                         |
| Stop services and delete local database and dependency volumes | `make reset`                        |

### Development without Docker

Requirements: Node.js 22, pnpm 10, and PostgreSQL 16 running locally.

Start PostgreSQL and, as a database administrator, create the local role and
database once:

```sql
CREATE ROLE gofunio WITH LOGIN PASSWORD 'gofunio';
CREATE DATABASE gofunio OWNER gofunio;
```

These values match `DATABASE_URL` in `apps/backend/.env.example`.

Bash:

```bash
corepack enable
corepack prepare pnpm@10.32.0 --activate
pnpm install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm migration:run
pnpm dev
```

PowerShell:

```powershell
corepack enable
corepack prepare pnpm@10.32.0 --activate
pnpm install
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env
pnpm migration:run
pnpm dev
```

The backend `.env` example already points to PostgreSQL on
`localhost:5432`. Update `DATABASE_URL` if the local database uses different
credentials, database name, host, or port. `pnpm dev` runs both applications
with hot reload; use `pnpm dev:frontend` or `pnpm dev:backend` to run only one.
The frontend does not access PostgreSQL directly. When running only the
frontend, `VITE_API_URL` must point to an already running backend.

For backend development outside Docker, run MinIO on port `9000` and add this
local-only storage configuration to `apps/backend/.env`:

```dotenv
ATTACHMENT_STORAGE_DRIVER=s3
ATTACHMENT_STORAGE_ENDPOINT=http://localhost:9000
ATTACHMENT_STORAGE_PUBLIC_ENDPOINT=http://localhost:9000
ATTACHMENT_STORAGE_REGION=us-east-1
ATTACHMENT_STORAGE_BUCKET=gofunio-attachments-local
ATTACHMENT_STORAGE_ACCESS_KEY_ID=gofunio
ATTACHMENT_STORAGE_SECRET_ACCESS_KEY=gofunio-local-storage
ATTACHMENT_STORAGE_FORCE_PATH_STYLE=true
```

`ATTACHMENT_STORAGE_PUBLIC_ENDPOINT` is the endpoint embedded in presigned
URLs. It must already be reachable by the browser; signed URLs are never
rewritten after signing. Production credentials belong in environment secrets,
not committed files.

To run the manual storage contract against local MinIO:

```bash
docker compose up -d minio minio-init
pnpm --filter backend test:storage
```

Normal `test` and `test:e2e` runs use the in-memory adapter and require neither
MinIO nor Cloudflare.

Local email is delivered over SMTP to Mailpit. When the backend runs on the
host, start Mailpit separately and use the defaults from `.env.example`:

```bash
docker compose up -d mailpit
pnpm dev:backend
```

Captured messages are available at `http://localhost:8025`. The inbox is
intentionally ephemeral and is cleared when the container is recreated.

To run the SMTP-to-Mailpit contract test:

```bash
docker compose up -d mailpit
pnpm --filter backend test:mail
```

Normal unit and e2e tests continue to use test doubles and do not require
Mailpit.

## Optional host tooling

The commands below require Node.js and pnpm on the host. They are not needed
for the Docker development setup.

### Run Eslint

Running frontend only

```
pnpm lint:frontend
```

### Build Project

From the root of project:

```
pnpm run build
```

After building the project, a dist folder is created in the root directory

```
├ dist/
│  ├ frontend
│  └ backend
```
