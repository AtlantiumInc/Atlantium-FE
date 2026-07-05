# Atlantium Project Notes

## Deployments
- **Xano backend**: Always deployed by the user manually. Do not attempt to push or deploy backend changes to Xano.
- **Frontend**: Hosted on Cloudflare Pages project `atlantium-fe` (serves atlantium.ai / www.atlantium.ai). Deploy built `dist/` output with `npx wrangler pages deploy dist --project-name=atlantium-fe --branch=main --commit-dirty=true`.
- **API worker** (`../services/api`, worker `atlantium-api` on `api.atlantium.ai`): deploy with `npx wrangler deploy --config wrangler.toml` from `services/api`. Owns auth, profiles/onboarding persistence, and R2 asset upload (`POST /v1/upload`, served via `GET /v1/assets/:key`) bound to the `atlantium-assets` R2 bucket.
- **DB migrations** (`services/api`): `DATABASE_URL=<branch> npx tsx scripts/migrate.ts` (idempotent, tracked in `schema_migrations`). Neon branches: prod main = `ep-fragrant-truth-aklzp3fo`; dev = `ep-autumn-dew-akplbjoi` (in `.dev.vars`, prod creds in `.dev.vars.main.bak`).
- **OG meta worker**: `npx wrangler deploy --config workers/wrangler-og.toml`

## Project Structure
- `../backend/` — XanoScript tables, APIs, functions (synced to Xano by user). **These files are editable** — edit them here, then the user pushes to Xano manually.
- `src/` — React frontend (Vite, TailwindCSS, React Router)
- `workers/` — Cloudflare Workers for OG meta tag injection
- `../atlantium_ios/` — iOS app (separate git repo, gitignored from this repo)

## Xano Notes
- Nullable uuid/timestamp columns must use `null` — never insert empty strings (`""`) for these fields, as PostgreSQL will reject them with `INVALID TEXT REPRESENTATION`.
- Backend XanoScript files live at `../backend/` — edit them here, then the user pushes to Xano manually.
