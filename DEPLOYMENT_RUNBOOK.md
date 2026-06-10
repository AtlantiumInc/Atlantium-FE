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
VITE_ATLANTIUM_API_BASE=https://api.atlantium.ai/v1 VITE_BOOMIN_CONNECT_API_BASE=https://api.boomin.ai/v1/connect VITE_BOOMIN_CONNECT_REDIRECT_URI=https://atlantium.ai/creator-program npm run build
```

Never deploy a frontend bundle that was built with a plain `npm run build` from `atlantium_web` if `.env.local` exists. Vite embeds `VITE_*` values at build time, and the local file may contain `localhost` API URLs.

After every production frontend build, run these checks before deploying `dist`:

```bash
cd /Users/user/Documents/Atlantium/web/atlantium_web
rg -n "localhost:8788|localhost:8787" dist
rg -o "https://api.atlantium.ai/v1|https://api.boomin.ai/v1/connect" dist
```

The first command must print nothing. The second command must print the production Atlantium and Boomin API URLs.

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
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `RESEND_API_KEY` for emailed OTPs

Production vars live in `services/api/wrangler.toml`. `DEBUG_AUTH_CODES` must stay `false` in production.

Local auth note:

- If `services/api/.dev.vars` does not include `RESEND_API_KEY`, localhost will not send OTP emails.
- With `DEBUG_AUTH_CODES=true`, local login exposes the dev code on the OTP screen, accepts `123456`, and sends `123456` by email when `RESEND_API_KEY` is present.
- To test dynamic emailed OTPs, set `DEBUG_AUTH_CODES=false`, restart the Worker, and confirm `curl -s http://localhost:8788/health` reports `"resend":true`.

Lobby media will load chat and schedule without LiveKit, but users cannot join Office Hours media until the three LiveKit secrets are configured on the Worker.

## Lobby Release Checklist

Before releasing lobby changes:

```bash
cd /Users/user/Documents/Atlantium/web/services/api
set -a; source .dev.vars; set +a; npm run db:migrate
npm run typecheck

cd ../../atlantium_web
VITE_ATLANTIUM_API_BASE=https://api.atlantium.ai/v1 VITE_BOOMIN_CONNECT_API_BASE=https://api.boomin.ai/v1/connect VITE_BOOMIN_CONNECT_REDIRECT_URI=https://atlantium.ai/creator-program npm run build
rg -n "localhost:8788|localhost:8787" dist
```

The lobby migration creates:

- `memberships`
- `lobby_rooms`
- `lobby_events`
- `lobby_messages`
- `lobby_event_attendance`
- `lobby_room_roles`

Current `is_admin` users are implicit lobby moderators. Missing membership rows intentionally default to Free.

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

If Cloudflare records the commit but shows `No deployment available`, the Git trigger did not publish assets. Publish a production-built `dist` folder manually:

```bash
cd /Users/user/Documents/Atlantium/web/atlantium_web
VITE_ATLANTIUM_API_BASE=https://api.atlantium.ai/v1 VITE_BOOMIN_CONNECT_API_BASE=https://api.boomin.ai/v1/connect VITE_BOOMIN_CONNECT_REDIRECT_URI=https://atlantium.ai/creator-program npm run build
rg -n "localhost:8788|localhost:8787" dist
rg -o "https://api.atlantium.ai/v1|https://api.boomin.ai/v1/connect" dist
npx wrangler pages deploy dist --project-name atlantium-fe --branch main --commit-hash "$(git -C .. rev-parse HEAD)" --commit-message "$(git -C .. log -1 --pretty=%s)"
```

After a manual publish, confirm the custom domain is serving the latest bundle:

```bash
curl -s https://atlantium.ai/ | rg "assets/index-"
npx wrangler pages deployment list --project-name atlantium-fe
```

Then verify the live bundle itself:

```bash
curl -s https://atlantium.ai/login | rg "assets/index-"
curl -s https://atlantium.ai/assets/<bundle-from-login>.js | rg -o "localhost:8788|localhost:8787|https://api.atlantium.ai/v1|https://api.boomin.ai/v1/connect"
```

The live bundle check must show production API URLs and no `localhost:8788` or `localhost:8787`.

## Verify Production

After deploy:

- `https://atlantium.ai/login` signs in normal users and lands at `/dashboard`.
- `https://atlantium.ai/dashboard` refreshes without losing the session.
- `https://atlantium.ai/admin/login` accepts only admin users.
- `https://atlantium.ai/admin` loads for `kleveland.bishop@gmail.com`.
- `https://atlantium.ai/admin/partnerships` loads the Boomin partnerships table.
- `https://atlantium.ai/creator-program` still loads and can start Boomin handoff.
- `https://atlantium.ai/dashboard` > Lobby shows Lounge, Office Hours, daily noon ET events, and lets signed-in users send a lobby chat message.
- Free users can chat/watch; paid members or moderators can publish during live Office Hours.
- If Office Hours media fails with `livekit_not_configured`, set the LiveKit Worker secrets before retesting media.

OTP CORS smoke test:

```bash
curl -i -s -X OPTIONS https://api.atlantium.ai/v1/auth/otp -H "Origin: https://atlantium.ai" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
```

Expected result: `204` with `Access-Control-Allow-Origin: https://atlantium.ai`.

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
