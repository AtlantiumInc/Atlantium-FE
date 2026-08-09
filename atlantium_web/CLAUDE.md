# Atlantium Project Notes

## Deployments
- **Xano backend**: Always deployed by the user manually. Do not attempt to push or deploy backend changes to Xano.
- **Frontend**: Cloudflare Pages project `atlantium-fe` (serves atlantium.ai / www.atlantium.ai). **Manual `wrangler` upload is the canonical deploy path — pushing to `main` does NOT deploy.** Full procedure in `../DEPLOYMENT_RUNBOOK.md`; do not deploy from this file alone. The short version:

  ```bash
  cd /Users/user/Documents/Atlantium/web/atlantium_web
  # 1. BUILD WITH PROD ENV INLINE — never a bare `npm run build`
  VITE_ATLANTIUM_API_BASE=https://api.atlantium.ai/v1 \
  VITE_BOOMIN_CONNECT_API_BASE=https://api.boomin.ai/v1/connect \
  VITE_BOOMIN_CONNECT_REDIRECT_URI=https://atlantium.ai/creator-program \
  npm run build
  # 2. GATE ON BOTH — first must print nothing, second must print prod URLs
  grep -rn "localhost:8788\|localhost:8787" dist
  grep -oh "https://api.atlantium.ai/v1\|https://api.boomin.ai/v1/connect" dist/assets/*.js | sort -u
  # 3. Deploy, then confirm the live bundle hash actually changed
  npx wrangler pages deploy dist --project-name atlantium-fe --branch main \
    --commit-hash "$(git -C .. rev-parse HEAD)" --commit-message "$(git -C .. log -1 --pretty=%s)"
  curl -s "https://atlantium.ai/?cb=$RANDOM" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
  ```

  Why the build command matters: `.env.local` exists and points `VITE_*` at `localhost`. Vite inlines those at build time, so a bare `npm run build` produces a bundle whose API calls go to `localhost:8788` — it looks fine on the landing page and fails for every real user. This shipped to production once (2026-08-08) and was caught only by grepping the deployed bundle. The greps in step 2 are the gate, not a formality.

  Why manual and not git: `atlantium-fe` has a Git provider attached, so every push to `main` also creates a Pages deployment — but the repo root has no `package.json` (the app lives in `atlantium_web/`), so that build publishes no assets and its deployment URL 404s. Every commit therefore has two deployments: a working manual upload and a broken git one. Failed git builds are not promoted, so the domain stays on the last good manual upload. Deploying is not done until step 3's curl shows the new hash.
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
