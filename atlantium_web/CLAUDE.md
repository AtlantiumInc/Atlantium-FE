# Atlantium Project Notes

## Deployments
- **Xano backend**: Always deployed by the user manually. Do not attempt to push or deploy backend changes to Xano.
- **Frontend**: Hosted on Cloudflare Pages project `atlantium-web`. Deploy built `dist/` output with `npx wrangler pages deploy dist --project-name=atlantium-web --branch=main`.
- **Cloudflare Workers**: Deployed via `npx wrangler deploy --config workers/<config>.toml`

## Project Structure
- `../backend/` — XanoScript tables, APIs, functions (synced to Xano by user). **These files are editable** — edit them here, then the user pushes to Xano manually.
- `src/` — React frontend (Vite, TailwindCSS, React Router)
- `workers/` — Cloudflare Workers for OG meta tag injection
- `../atlantium_ios/` — iOS app (separate git repo, gitignored from this repo)

## Xano Notes
- Nullable uuid/timestamp columns must use `null` — never insert empty strings (`""`) for these fields, as PostgreSQL will reject them with `INVALID TEXT REPRESENTATION`.
- Backend XanoScript files live at `../backend/` — edit them here, then the user pushes to Xano manually.
