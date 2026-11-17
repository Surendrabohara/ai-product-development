# Task Manager

A small full-stack task list for a course assignment. You create, list, mark complete or incomplete, and delete tasks in the browser. The UI is a React + Vite app. The API is a Cloudflare Worker. Tasks persist in Cloudflare D1.

This repository is not a multi-user product. There is one anonymous shared list per deployment. There is no authentication.

## Features

- Create a task with a required title and an optional description.
- List all tasks, newest first.
- Toggle a task between complete and incomplete.
- Delete a task.
- Show loading, empty, and error states in the UI.

## Stack

- Frontend: React 19 and Vite 8 (`web/`).
- API: Cloudflare Workers (`worker/`, Wrangler 4, entry `worker/src/index.ts`).
- Storage: Cloudflare D1. Binding name `DB`. Database name `task_manager_db`. Schema in `worker/migrations/0001_create_tasks.sql`.

There is no root `package.json`. Install and run commands from `worker/` or `web/`.

## Directory structure

```text
.
  README.md                 # this file
  skills-lock.json          # locked agent skills (leave in place)
  .agents/                  # Cursor agent skills
  web/                      # React + Vite UI
    .env.example            # VITE_API_URL template
    src/api.ts              # fetch helpers
    src/App.tsx             # single-page UI
  worker/                   # Worker + D1
    wrangler.jsonc          # Worker name, D1 binding, migrations dir
    src/index.ts            # HTTP API
    migrations/             # D1 SQL migrations
```

`web/README.md` is the default Vite template. Use this root README for the assignment.

## Prerequisites

- Node.js and npm (this workspace was last used with Node v26.11.0 and npm 11.20.0).
- Wrangler as a local dependency of `worker/` (`wrangler` in `worker/package.json`). Use `npx wrangler` or the npm scripts in that folder.
- A Cloudflare account and `npx wrangler login` only when you create remote D1 resources or deploy. Local `wrangler dev` and local D1 do not require a successful deploy.

## Local development

Local development uses a local D1 database under `worker/.wrangler/`. It is separate from any remote D1 database in a Cloudflare account.

### Install

From the repository root:

```bash
cd worker
npm install

cd ../web
npm install
```

### Apply the local D1 migration

Run this once (and again when a new file appears in `worker/migrations/`). The database name matches `worker/wrangler.jsonc`.

```bash
cd worker
npm run db:migrate:local
```

That script is `wrangler d1 migrations apply task_manager_db --local`.

Do not use `npm run db:migrate:remote` for local work. That command targets a remote D1 database.

`worker/wrangler.jsonc` currently sets `database_id` to `00000000-0000-0000-0000-000000000001`. That placeholder is enough for local D1. Replace it with a real UUID before a remote deploy (see [Deploy to Cloudflare](#deploy-to-cloudflare)).

### Start the Worker

In a terminal:

```bash
cd worker
npm run dev
```

That script is `wrangler dev`. Wrangler serves the API at `http://127.0.0.1:8787` by default.

### Start the Vite app

In a second terminal:

```bash
cd web
npm run dev
```

That script is `vite`. Vite prints the local URL (typically `http://localhost:5173/`).

The Worker CORS allowlist is `http://localhost:5173`. If Vite binds a different origin, the browser will block API calls until you change that origin in `worker/src/index.ts`.

## Environment variables

The frontend reads `VITE_API_URL` at build and dev time (`web/src/api.ts`). If it is unset, the client uses `http://127.0.0.1:8787`.

Copy the example file in `web/`:

```bash
cd web
cp .env.example .env
```

`.env.example` contains:

```text
VITE_API_URL=http://127.0.0.1:8787
```

There is no Worker env file for the API URL. The Worker does not call the frontend.

Vite only exposes variables that start with `VITE_`. After you change `.env`, restart `npm run dev` in `web/`. For a production frontend build, set `VITE_API_URL` to the deployed Worker origin before `npm run build`.

## REST API

Base URL in local development: `http://127.0.0.1:8787`.

Task JSON shape:

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "completed": false,
  "createdAt": "2026-10-15T00:00:00.000Z"
}
```

`description` is always a string (`""` when the stored value is empty or null). Error bodies use `{ "error": "human-readable message" }`.

| Method | Path | Success | Request body | Errors |
| --- | --- | --- | --- | --- |
| `GET` | `/api/tasks` | `200` array, `created_at` descending | none | |
| `POST` | `/api/tasks` | `201` created task | `{ "title": string, "description"?: string }` | `400` invalid JSON, empty/whitespace title, title over 200 characters, description over 2000 characters |
| `PATCH` | `/api/tasks/:id` | `200` updated task | `{ "completed": boolean }` | `400` if `completed` is not a boolean; `404` unknown id |
| `DELETE` | `/api/tasks/:id` | `204` empty body | none | `404` unknown id |
| `OPTIONS` | `/api/*` | `204` CORS preflight | none | |
| `GET` | `/` | `200` `{ ok, service, tasksTableReady }` | none | health helper, not part of the task API |

Unknown `/api/*` routes return `404` JSON.

CORS on `/api/` responses: `Access-Control-Allow-Origin: http://localhost:5173`, methods `GET, POST, PATCH, DELETE, OPTIONS`, header `Content-Type`.

SQL uses `prepare().bind()`. User strings are not concatenated into query text.

## Local verification commands

There is no project test runner and no `test` script in either `package.json`. Do not add one for this unit.

### Frontend production build (includes type-check)

`web/package.json` `build` is `tsc -b && vite build`.

```bash
cd web
npm run build
```

Optional UI lint (same `package.json`): `npm run lint` (`oxlint`).

Optional preview of `web/dist/`: `npm run preview`.

### Worker type-check

`worker/package.json` has no `typecheck` script. `worker/tsconfig.json` sets `"noEmit": true`. From `worker/`, run the local TypeScript compiler (do not use a bare `npx tsc`, which can download the wrong `tsc` npm package):

```bash
./node_modules/.bin/tsc --noEmit
```

`npm run types` in `worker/` runs `wrangler types` and regenerates `worker-configuration.d.ts`. That is not a type-check.

### API checks with curl

With `npm run dev` running in `worker/`:

```bash
# 1. Create
curl -sS -X POST http://127.0.0.1:8787/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Unit 4 check","description":"readme"}'

# 2. List (replace ID with the id from step 1)
curl -sS http://127.0.0.1:8787/api/tasks

# 3. Toggle complete
curl -sS -X PATCH http://127.0.0.1:8787/api/tasks/ID \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}'

# 4. Delete
curl -sS -X DELETE http://127.0.0.1:8787/api/tasks/ID

# 5. Empty title
curl -sS -X POST http://127.0.0.1:8787/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"   "}'

# 6. Unknown id
curl -sS -X PATCH http://127.0.0.1:8787/api/tasks/00000000-0000-0000-0000-000000000000 \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}'
curl -sS -X DELETE http://127.0.0.1:8787/api/tasks/00000000-0000-0000-0000-000000000000
```

Expected: `201`, `200` list, `200` with `"completed":true`, `204`, `400` `{"error":"Title is required"}`, `404` `{"error":"Not found"}`.

These curls create and delete one task. They do not wipe the local database.

## Deploy to Cloudflare

This section is an outline. This repository has not recorded a production URL, account id, or successful deploy in these docs. Do not treat the placeholder `database_id` in `wrangler.jsonc` as a real remote database.

`worker/wrangler.jsonc` does not define static assets. The Worker is the API only. The Vite app is a separate static site (`web/dist/` after `npm run build`).

### 1. Log in and create remote D1

From `worker/`, after `npx wrangler login`:

```bash
npx wrangler d1 create task_manager_db
```

The command prints a UUID. Put that UUID in `wrangler.jsonc` as `database_id`. Keep `database_name` as `task_manager_db` and `binding` as `DB` unless you create a differently named database.

### 2. Apply remote migrations

```bash
cd worker
npm run db:migrate:remote
```

That script is `wrangler d1 migrations apply task_manager_db --remote`. It writes to the remote database, not the local one.

### 3. Deploy the Worker

```bash
cd worker
npm run deploy
```

That script is `wrangler deploy`. Wrangler prints the Worker URL when the upload succeeds. Use that origin as the production API base. This README does not invent that URL.

### 4. Build and host the frontend

Set the production API origin, then build:

```bash
cd web
VITE_API_URL=https://YOUR_WORKER_HOST npm run build
```

Host the contents of `web/dist/` as static files. Options include Cloudflare Pages or any static host. This project does not configure Pages or Workers static assets in-repo, so pick a host in the Cloudflare dashboard or CLI and point it at `web/dist/`.

### 5. Production configuration you must still change

- CORS in `worker/src/index.ts` allows only `http://localhost:5173`. A production frontend origin will fail browser CORS until you change that value (or add the production origin) and redeploy the Worker.
- `VITE_API_URL` must be the deployed Worker origin at frontend **build** time. Changing it later requires another `npm run build` and another static deploy.
- Confirm the remote D1 `database_id` in `wrangler.jsonc` matches the database you created.

## Known limitations

- No authentication, accounts, or per-user isolation. Anyone who can reach the deployment shares one task list.
- No tags, due dates, search, pagination, or undo.
- CORS is hardcoded for local Vite (`http://localhost:5173`).
- `database_id` in `wrangler.jsonc` is a local placeholder until you create a remote D1 database.
- No root npm workspace, no CI, and no automated API test framework.
- `.agents/` and `skills-lock.json` are agent skill files for this course workspace. They are not part of the running app.
