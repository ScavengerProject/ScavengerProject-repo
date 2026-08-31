# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Sistema de Gincana Escolar: a full-stack app for running school "gincanas" (team
competitions). React (Vite, JSX) frontend + Node/Express backend, MongoDB Atlas
via Mongoose. `client/` and `server/` are independent npm packages — install and
run each separately.

## Commands

### Backend (`server/`)
- `npm start` — run the API (port 5000 by default)
- `npm run worker` — run the email worker as a separate process (BullMQ; needs Redis)
- `npm test` — run Jest unit tests
- `npm run test:watch` — Jest watch mode
- `npm run test:ci` — Jest with coverage, `--runInBand --ci --forceExit` (matches CI)
- Run a single test file: `npx jest testes/unit/controllers/equipe.controller.test.js`
- Run one test by name: `npx jest -t "nome do teste"`
- Migration/seed scripts (see "Migrating an existing DB" below):
  `node src/scripts/seedAdmin.js`, `node src/scripts/seedGincanaPrincipal.js`,
  `npm run seed:escola`, `npm run migrar:papeis`

### Frontend (`client/`)
- `npm start` — Vite dev server (http://localhost:5173)
- `npm run build` — production build
- `npm test` / `npm run test:run` — Vitest (watch / single run)
- `npm run test:ci` — Vitest with coverage

### Tests live in non-standard locations
- Backend tests are under `server/testes/unit/**` (not colocated with source),
  configured via `server/jest.config.cjs` (`roots: ['<rootDir>/testes']`).
  Coverage thresholds there are an intentional ratchet — don't lower them.
- `server/jestSetupAfterEnv.js` auto-mocks `bullmq` for every test (no real
  Redis in CI) and defaults `JWT_SECRET`. `server/setupTests.js` loads
  `server/.env` (local dev only; CI sets env vars directly).
- Frontend tests are colocated `*.test.jsx`/`*.test.js` next to the source
  (Vitest + Testing Library, jsdom via `client/src/test/setup.js`).
- `test/` at the repo root is a **separate** Selenium/Python manual test suite
  (per-user-story test cases, screenshots), unrelated to the Jest/Vitest suites
  and not run by CI.

### CI
`.github/workflows/ci.yml` runs on push/PR to `main`/`release`/`dev`/`dev-*`:
backend Jest (`ubuntu-22.04`, pinned for `mongodb-memory-server` binary
compatibility) and frontend Vitest + Vite build. Keep new backend tests
hermetic (no real Mongo/Redis) — use `mongodb-memory-server` / mocks, matching
existing tests.

## Architecture

### Scope hierarchy: Escola → Gincana → everything else
This is a multi-tenant, multi-edition system. Every piece of data is scoped by
`gincana_id`, and every `Gincana` belongs to an `Escola` via `escola_id`, so
tenant isolation is transitive:

```
Escola  ->  Gincana  ->  Equipes / Provas / Resultados / Penalidades / ...
```

The frontend sends `X-Escola-Id` and `X-Gincana-Id` on every request
(`client/src/services/api.js`, sourced from `localStorage` via
`hooks/useEscola.jsx` / `hooks/useGincana.jsx`). Backend middleware in
`server/src/auth/authPermissions.js` resolves and enforces this, in order:

1. **`proteger`** — verifies the JWT, sets `req.usuario` from the token.
2. **`resolverEscola`** — validates `X-Escola-Id`, confirms the user has a
   vinculo with that escola, and **overwrites `req.usuario.tipo` with the
   user's role in THAT escola** (from `Usuario.vinculos`, not the token). This
   is why `autorizar(...)` and controllers didn't need to change when
   multi-escola was added — they already read `req.usuario.tipo`.
3. **`resolverGincana`** — validates `X-Gincana-Id` belongs to `req.escolaId`
   (this is what actually prevents cross-tenant data access — not just
   filtering, but a hard 404/400 if the gincana isn't in the active escola),
   rejects encerrada/arquivada editions, and confirms participation for
   non-admins.

Route handlers must be chained `proteger, resolverEscola, resolverGincana,
autorizar(...)` in that order (see any router in `server/src/*/`) — swapping
the order breaks the role-override or the tenant check.

When scope stored client-side is no longer valid, the API returns a `codigo`
the frontend acts on directly in `services/api.js`'s central `request()`
error handling (redirect to `/selecionar-gincana` or `/selecionar-escola`, not
a generic error banner):

| `codigo` | Meaning | Frontend action |
|---|---|---|
| `GINCANA_NAO_SELECIONADA` | switched escola, no gincana chosen yet | go to `/selecionar-gincana` |
| `GINCANA_ENCERRADA` | active edition ended (or year rolled over) | go to `/selecionar-gincana` |
| `SEM_VINCULO_ESCOLA` / `VINCULO_INATIVO` | lost access to active escola | go to `/selecionar-escola` |

Post-login flow is **escola → gincana → app** (`client/src/App.jsx`): a user
can't reach any page until `useEscola`/`useGincana` report loaded, because
pages fire requests on mount that need the headers set correctly.

### Roles: per-escola, not global
`Usuario.tipo` is only the **base** role (marks `SUPER_ADMIN`, and is the
default inherited when a new vinculo is created) — never use it to decide
permissions inside a escola. The actual role lives per-school in
`Usuario.vinculos[]` (`{ escola_id, tipo, turma, status }`), and
`resolverEscola` is what projects it onto `req.usuario.tipo` for the rest of
the request. Use `papelNaEscola(usuario, escolaId)` /
`getVinculo(usuario, escolaId)` from `server/src/escolas/escolaHelpers.js`
rather than reading `vinculos` by hand.

- `SUPER_ADMIN` is global (no vinculo needed), passes every `autorizar(...)`.
- Whether a role can hold vinculos in **multiple** escolas at once is decided
  by `PERFIS_MULTI_ESCOLA` in `server/src/models/Usuario.js` (currently
  `ADMIN`/`PROFESSOR`; participant-style roles — `ALUNO`, `COORDENADOR`,
  `PAI/MÃE` — are single-escola). Mirrored on the frontend in
  `client/src/lib/perfis.js`. The conflict check when adding/changing a
  vinculo is `conflitoMultiEscola()` (409 `PERFIL_ESCOLA_UNICA`).
- To move a student between schools, remove the old vinculo before adding the
  new one — a participant can't be in two escolas at once.

### Equipe (team) is per-gincana via a bridge table
`Equipe` is the "master" team record; a team's participation in one specific
gincana edition (points, coordinator limit) lives in a separate
`EquipeGincana` document (`equipe_id` + `gincana_id`, unique together). Team
membership (`EquipeMembros`) references the master `Equipe._id`, not
`EquipeGincana`.

**Multiple coordinators per team**: the source of truth for the *set* of
coordinators is `EquipeMembros.is_coordenador` — always go through the
helpers in `server/src/equipes/coordenadorEquipe.js`
(`getCoordenadoresIdsDaEquipe`, `isCoordenadorDaEquipe`,
`getEquipeGincanaDoCoordenador`) rather than querying
`EquipeGincana.coordenador_usuario_id` directly; that field is kept only as a
legacy "primary coordinator" pointer for display/notifications and is always
a member of the `is_coordenador` set.

### Notifications / email
Email delivery goes through BullMQ (`server/src/notificacoes/emailQueue.js`) —
requires `REDIS_URL` and the worker process running (`npm run worker`) to
actually send anything; `enqueue` from the controller is fire-and-forget. On
the free Render tier there's no separate background worker, so
`iniciarEmailWorker()` is started in-process from `server/src/index.js`
instead — kept alive by external pings to `/health` (see comments there and in
`.github/workflows/keep-alive.yml`). Jest mocks `bullmq` entirely in
`jestSetupAfterEnv.js`, so backend tests never touch Redis.

### Migrating an existing DB to multi-escola
All idempotent, run in order (see README for full detail): `seedAdmin.js` →
`seedGincanaPrincipal.js` → `npm run seed:escola` (creates `ESCOLA_PRINCIPAL`,
links existing users, promotes the first admin to `SUPER_ADMIN`) →
`npm run migrar:papeis` (converts legacy `Usuario.escolas` into
`Usuario.vinculos`). Step 4 is not optional — without it, everyone but
`SUPER_ADMIN` gets 403 `SEM_VINCULO_ESCOLA` and loops on the escola-selection
screen.

### Legacy fallback IDs
`GINCANA_FALLBACK_ID = 'GINCANA_PRINCIPAL'` and
`ESCOLA_FALLBACK_ID = 'ESCOLA_PRINCIPAL'` in
`server/src/auth/authPermissions.js` are used when a client doesn't send the
`X-Escola-Id`/`X-Gincana-Id` headers (old cached frontend, or a pre-multi-
tenant install). Don't remove these without checking both middlewares' full
fallback branches.

## Environment
Backend needs `server/.env` (see `server/.env.example`): `MONGO_URI`, `PORT`,
`JWT_SECRET`, plus Redis config for the email queue/worker. Frontend reads
`VITE_API_BASE_URL` (defaults to `http://localhost:5000/api`).
