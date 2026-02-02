# Atlantium Project Notes

## Deployments
- **Xano backend**: Always deployed by the user manually. Do not attempt to push or deploy backend changes to Xano.
- **Frontend**: (Vite + React app at `src/`)
- **Cloudflare Workers**: Deployed via `npx wrangler deploy --config workers/<config>.toml`

## Project Structure
- `backend/` — XanoScript tables, APIs, functions (synced to Xano by user)
- `src/` — React frontend (Vite, TailwindCSS, React Router)
- `workers/` — Cloudflare Workers for OG meta tag injection
