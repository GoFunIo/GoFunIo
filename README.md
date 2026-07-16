# GoFunIo project Monorepo

This is a fullstack monorepo project with:

* **Frontend**: React + TypeScript (Vite)
* **Backend**: NestJS (Node.js + TypeScript)

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

The frontend is available at `http://localhost:5173` and the backend at
`http://localhost:3000`. Source changes trigger hot reload in both services.

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

Command reference:

| Action | Make | Docker Compose |
| --- | --- | --- |
| Start all services, build the image, and run migrations | `make dev` | `docker compose up --build` |
| Follow logs from running services | `make logs` | `docker compose logs --follow` |
| Stop services but keep database data | `make down` | `docker compose down --remove-orphans` |
| Stop services and delete local database and dependency volumes | `make reset` | `docker compose down --volumes --remove-orphans` |

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
