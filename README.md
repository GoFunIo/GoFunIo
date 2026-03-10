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
    npm install -g pnpm
2. From the root of the monorepo:
    pnpm install

## Instructions for running a project ( from the root of the project ):

Running frontend only:
    pnpm dev:frontend ( hosted on localhost:5173 )
Running backend only:
    pnpm dev:backend ( hosted on localhost:3000 )
Running all together:
    pnpm dev

## Build Project

pnpm run build
