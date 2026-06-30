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

## Instructions for preparing a project

1. Install pnpm if you don't have it:
```
npm install -g pnpm
```
2. From the root of the monorepo:
```
pnpm install
```

## Local database (PostgreSQL)

From the repo root:

```bash
pnpm db:up
cp apps/backend/.env.example apps/backend/.env   # if you don't have .env yet
pnpm migration:run
pnpm dev:backend
```

Stop Postgres: `pnpm db:down`. Logs: `pnpm db:logs`.

## Instructions for running a project ( from the root of the project ):

Running frontend only ( hosted on localhost:5173 ):
```
pnpm dev:frontend
```
Running backend only ( hosted on localhost:3000 ):
```
pnpm dev:backend
```
Running all together:
```
pnpm dev
```

## Run Eslint

Running frontend only
```
pnpm lint:frontend
```

## Build Project
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
