# Atlantium Deployment Runbook

This repo deploys in two parts:

- API Worker: `atlantium-api` at `api.atlantium.ai`
- Frontend Pages app: `atlantium-fe` at `atlantium.ai`

Deploy the API first, then the frontend. The frontend may depend on new API routes.

## Preflight

```bash
cd /Users/user/Documents/Atlantium/web
git status --short

cd services/api
npm run typecheck

cd ../../atlantium_web
npm run build
```

If API migrations changed, run them before deploying the Worker:

```bash
cd /Users/user/Documents/Atlantium/web/services/api
set -a; source .dev.vars; set +a; npm run db:migrate
```

## Deploy API

```bash
cd /Users/user/Documents/Atlantium/web/services/api
npm run deploy
```

Important production secrets for `atlantium-api`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `HANDOFF_SIGNING_SECRET`
- optional `RESEND_API_KEY`

Production vars live in `services/api/wrangler.toml`. `DEBUG_AUTH_CODES` must stay `false` in production.

## Deploy Frontend

The frontend is a Git-connected Cloudflare Pages project named `atlantium-fe`.
Production deploys from the `main` branch.

```bash
cd /Users/user/Documents/Atlantium/web
git add .
git commit -m "Refactor auth dashboard and move partnerships admin"
git push origin main
```

Cloudflare Pages should then build and deploy `atlantium-fe` automatically.

If Cloudflare records the commit but shows `No deployment available`, the Git trigger did not publish assets. Publish the already-built `dist` folder manually:

```bash
cd /Users/user/Documents/Atlantium/web/atlantium_web
VITE_ATLANTIUM_API_BASE=https://api.atlantium.ai/v1 VITE_BOOMIN_CONNECT_API_BASE=https://api.boomin.ai/v1/connect VITE_BOOMIN_CONNECT_REDIRECT_URI=https://atlantium.ai/creator-program npm run build
npx wrangler pages deploy dist --project-name atlantium-fe --branch main --commit-hash "$(git -C .. rev-parse HEAD)" --commit-message "$(git -C .. log -1 --pretty=%s)"
```

After a manual publish, confirm the custom domain is serving the latest bundle:

```bash
curl -s https://atlantium.ai/ | rg "assets/index-"
npx wrangler pages deployment list --project-name atlantium-fe
```

## Verify Production

After deploy:

- `https://atlantium.ai/login` signs in normal users and lands at `/dashboard`.
- `https://atlantium.ai/dashboard` refreshes without losing the session.
- `https://atlantium.ai/admin/login` accepts only admin users.
- `https://atlantium.ai/admin` loads for `kleveland.bishop@gmail.com`.
- `https://atlantium.ai/admin/partnerships` loads the Boomin partnerships table.
- `https://atlantium.ai/creator-program` still loads and can start Boomin handoff.

## Rollback

API rollback:

```bash
cd /Users/user/Documents/Atlantium/web/services/api
npx wrangler deployments list --config wrangler.toml
npx wrangler rollback --config wrangler.toml
```

Frontend rollback:

- Open Cloudflare dashboard.
- Go to Pages > `atlantium-fe` > Deployments.
- Promote the previous known-good deployment.
