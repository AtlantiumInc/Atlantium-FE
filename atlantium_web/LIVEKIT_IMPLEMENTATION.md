# LiveKit Integration into Atlantium Lobby

## Overview
LiveKit provides real-time audio/video media transport for the lobby feature. Xano Realtime continues handling lobby state (join/leave/move, presence). LiveKit handles media streams only.

**Room naming:** `lobby-{lobbyThreadId}` (derived from the singleton lobby thread)
**Token authority:** Xano backend generates signed LiveKit JWTs via HMAC-SHA256

---

## Backend Files (XanoScript — push to Xano manually)

Both files live in `Atlantium-BE/apis/application/`:

### `87_lobby_livekit_token_POST.xs`
**Endpoint:** `POST /lobby/livekit-token` (auth required)

**What it does:**
1. Finds the singleton lobby thread (`type == "lobby"`)
2. Verifies the authenticated user is a `thread_participants` record for that thread
3. Queries `users` table for `is_admin` flag and `thread_participants.role`
4. Determines admin status: `users.is_admin == true` OR `role` in (`owner`, `admin`)
5. Generates a LiveKit JWT via `api.lambda` using HMAC-SHA256:
   - Header: `{ alg: "HS256", typ: "JWT" }`
   - Claims: `iss` = API key, `sub` = user ID, `name` = display_name, `exp` = now + 6h
   - Video grants: `roomJoin`, `canPublish`, `canSubscribe`, `canPublishData` for all users
   - Admins additionally get `roomAdmin: true`
   - Room = `"lobby-" + lobbyThreadId`
6. Signs with `crypto.createHmac('sha256', apiSecret)` and base64url-encodes
7. Returns `{ success, token, url }` where `url` = `$env.LIVEKIT_WS_URL`

**Required Xano env vars:**
- `LIVEKIT_API_KEY` — your LiveKit API key
- `LIVEKIT_API_SECRET` — your LiveKit API secret
- `LIVEKIT_WS_URL` — your LiveKit WebSocket URL (e.g. `wss://your-app.livekit.cloud`)

### `88_lobby_admin_action_POST.xs`
**Endpoint:** `POST /lobby/admin-action` (auth required)
**Input:** `{ action: "mute"|"kick", target_user_id: string }` + optional `track_type` in body

**What it does:**
1. Validates `action` is "mute" or "kick"
2. For mute: reads `track_type` from raw body (`$input._body.track_type`), validates it's "audio" or "video"
3. Verifies caller is admin (same check as token endpoint)
4. Verifies target user is in the lobby
5. **Mute:** Broadcasts `admin_mute` event via Xano Realtime with `{ target_user_id, track_type, admin_user_id }`
6. **Kick:** Deletes the target's `thread_participants` record, then broadcasts both `admin_kick` and `lobby_leave` events

**Note:** `track_type` is NOT a declared input parameter (Xano requires all declared inputs). It's read from `$input._body` to keep it optional. Only sent for mute actions.

### Existing endpoints (unchanged)
- `83_lobby_GET.xs` — GET /lobby (auto-creates singleton lobby thread, returns members with positions)
- `84_lobby_join_POST.xs` — POST /lobby/join (assigns random open cell on 10×6 grid)
- `85_lobby_move_POST.xs` — POST /lobby/move (validates bounds, checks occupancy, broadcasts `position_update`)
- `86_lobby_leave_POST.xs` — POST /lobby/leave (deletes participant, broadcasts `lobby_leave`)

---

## Frontend Files

### Modified files

**`vite.config.ts`**
- Added `resolve.dedupe: ["react", "react-dom"]` — required because `@livekit/components-react` can cause duplicate React instances in Vite, which crashes with "Invalid hook call"

**`package.json`**
- Added `livekit-client` and `@livekit/components-react` dependencies
- Do NOT import `@livekit/components-styles` — it doesn't resolve in Vite builds (noted in MEMORY.md)

**`src/lib/types.ts`**
- Added `LobbyMember` interface: `{ user_id, position: {col, row}, username, display_name, avatar_url }`
- Added `LobbyState` interface: `{ thread_id, name, members: LobbyMember[] }`
- Added `LobbyJoinResponse`: `{ success, thread_id, position }`
- Added `LobbyLivekitTokenResponse`: `{ success, token, url }`

**`src/lib/realtime-types.ts`**
- Added actions to `RealtimeAction` union: `lobby_join`, `lobby_leave`, `position_update`, `admin_mute`, `admin_kick`
- Added payload interfaces: `LobbyJoinPayload`, `LobbyLeavePayload`, `PositionUpdatePayload`, `AdminMutePayload`, `AdminKickPayload`

**`src/lib/api.ts`**
- Added 6 methods to `ApiClient`:
  - `getLobby()` → GET /lobby
  - `joinLobby()` → POST /lobby/join
  - `moveLobby(col, row)` → POST /lobby/move
  - `leaveLobby()` → POST /lobby/leave
  - `getLobbyLivekitToken()` → POST /lobby/livekit-token
  - `lobbyAdminAction(action, targetUserId, trackType?)` → POST /lobby/admin-action
- `lobbyAdminAction` only includes `track_type` in payload when provided (omitted for kick)

**`src/pages/HomePage.tsx`**
- Imported `LobbyPage`
- Added `"lobby": "Lobby"` to `getPageTitle()` map
- Added `case "lobby": return <LobbyPage />` to `renderPage()` switch
- Added `"lobby"` to the full-bleed layout condition (same as messages: `h-[calc(100vh-3.5rem)]`, no padding)

### New files

**`src/hooks/useLobbyChannel.ts`**
- Follows the same pattern as `useThreadChannel.ts`
- Subscribes to Xano Realtime channel `thread/{threadId}` for the lobby thread
- Unwraps Xano's event wrapper: `{ action: "event", payload: { data: { action, payload } } }`
- Dispatches callbacks: `onLobbyJoin`, `onLobbyLeave`, `onPositionUpdate`, `onAdminMute`, `onAdminKick`
- Uses refs for callbacks to avoid re-subscribing on every render
- Also exports `broadcastPosition()` for client-side position broadcasting

**`src/components/pages/LobbyPage.tsx`**
- Main orchestrator component
- **Init flow:** getLobby() → joinLobby() → getLobby() (re-fetch for own position) → getLobbyLivekitToken()
- Uses `useLobbyChannel` for realtime grid events
- Wraps content in `<LiveKitRoom>` when token is available, falls back to grid-only if LiveKit fails
- `hasJoinedRef` prevents double-join on React strict mode re-renders
- Cleanup on unmount: calls `leaveLobby()`
- Handles admin mute via CustomEvent dispatch (`lobby-admin-mute`) for cross-component communication
- Handles admin kick by clearing state + showing toast
- LiveKit starts with `audio={false} video={false}` (mic/camera off by default)

**`src/components/lobby/LobbyGrid.tsx`**
- 10×6 grid rendered with CSS grid
- Maps members to cells via `{col},{row}` key lookup
- Shows avatar image or initial letter for each member
- Current user has a primary ring highlight
- Speaking users (from LiveKit) get a green ring indicator
- Empty cells are clickable (triggers move)
- Occupied cells show user name tooltip

**`src/components/lobby/LobbyMediaPanel.tsx`**
- Uses `useTracks` from `@livekit/components-react` to get camera and microphone tracks
- Renders `<VideoTrack>` tiles in a 2-column grid with participant name overlay
- Renders `<AudioTrack>` elements (hidden, for playback)
- Shows placeholder with user initial when camera is off
- Only rendered when LiveKit is connected

**`src/components/lobby/LobbyControls.tsx`**
- Uses `useLocalParticipant` from `@livekit/components-react`
- Three buttons: mic toggle, camera toggle, leave
- Mic/camera buttons switch between secondary (on) and destructive (off) variants
- Calls `localParticipant.setMicrophoneEnabled()` / `setCameraEnabled()` which triggers browser permission prompt
- Only rendered inside `<LiveKitRoom>` context

**`src/components/lobby/AdminPanel.tsx`**
- Shows list of other lobby members with mute audio, mute video, and kick buttons
- Calls `api.lobbyAdminAction()` for each action
- Shows success/error toasts via sonner
- Only rendered when `isLobbyAdmin` is true in LobbyPage

---

## User Flow

1. User clicks "Lobby" in sidebar → `activePage` = "lobby" → `LobbyPage` mounts
2. `LobbyPage` init: GET /lobby → POST /lobby/join → GET /lobby → POST /lobby/livekit-token
3. `<LiveKitRoom>` connects with token, mic/camera off by default
4. `useLobbyChannel` subscribes to Xano Realtime for grid events
5. User clicks mic/camera toggle → browser permission prompt → stream starts
6. User clicks empty grid cell → POST /lobby/move → backend broadcasts `position_update`
7. Other users' events arrive via Xano Realtime → grid updates in real-time
8. On leave/navigate away → POST /lobby/leave, LiveKit disconnects on unmount

### Admin flow
1. Admin sees `<AdminPanel>` with participant list
2. "Mute Audio" → POST /lobby/admin-action `{action:"mute", target_user_id, track_type:"audio"}`
3. Target receives `admin_mute` via Xano Realtime → toast notification shown
4. "Kick" → POST /lobby/admin-action `{action:"kick", target_user_id}` → target disconnected

---

## Known Issues / Status

### Duplicate React crash (FIXED)
`@livekit/components-react` caused "Invalid hook call" in Vite dev mode. Fixed by adding `resolve.dedupe: ["react", "react-dom"]` to `vite.config.ts`.

### `@livekit/components-styles` (DO NOT USE)
This import doesn't resolve in Vite builds. We use custom Tailwind styling instead.

### `error_type = "forbidden"` (FIXED)
Xano only accepts `"inputerror"` and `"notfound"` as precondition error types. All preconditions now use one of these two.

### `track_type` as required input (FIXED)
XanoScript declared inputs are always required. `track_type` is now read from `$input._body.track_type` instead, making it optional for kick actions.

---

## Debugging Tips

- **LiveKit token:** Decode at jwt.io to verify room/identity/grants are correct
- **Console logs:** Look for `[Lobby]` and `[LobbyChannel]` prefixed messages
- **If no mic/camera prompt:** Check if LiveKit token is being returned (console should show "LiveKit token received"). If not, check Xano env vars
- **If grid works but no video:** LiveKit connection failed — check browser console for WebSocket errors to the LiveKit URL
- **Xano Realtime events:** All lobby events use channel `thread/{lobbyThreadId}` with actions: `lobby_join`, `lobby_leave`, `position_update`, `admin_mute`, `admin_kick`
