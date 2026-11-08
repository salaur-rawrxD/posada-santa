# Posada Santa → social gaming platform

## Product goal

Five relatives on five phones open a shared browser link, join a room with nicknames, play two games, and see one scoreboard. No mandatory registration or Facebook dependency.

## Current reality (2026-11)

The live site is static HTML/CSS/JS hosted on Vercel. It has four games, a Supabase-backed friends challenge flow for **La Posada**, and a separate Facebook Instant Games ZIP. `friends.js` uses `posada-friends-v1` local storage, `register_group`, `submit_score`, and `get_board` RPCs. These are asynchronous leaderboard groups, **not** synchronized real-time rooms. Scores are not server-verified.

## Phased rollout

1. **Foundation — this PR:** isolated Vite/TypeScript platform core; shared game catalog, room/player contracts, room-code and invite utilities, and tests. No production changes.
2. **Real room service:** design Supabase schema and secure RPC/Edge Functions; short-lived guest sessions, host controls, membership authorization, rate limits, expirations, and abuse protections. Use Supabase Realtime for lobby presence. Do not assume the existing `friends` RPCs provide secure room membership.
3. **Room UI:** bilingual, mobile-first `/room` lobby; create/join/share with WhatsApp, Messenger, QR, and copy-link; nickname entry and reconnect behavior. Invite URL format `https://posadaxmas.com/room#code=XXXXXXXX` will work only after this route is implemented.
4. **First two games:** adapt La Posada and Tamalazo to emit a common game-result contract; keep gameplay independent of room lifecycle. Aggregate family scoreboard. Begin with asynchronous scores before synchronous turns.
5. **Shared game builds:** incrementally extract inline scripts/styles, add regression tests, then connect the site and Facebook to one game core via platform adapters. Preserve existing public routes and current Secret Santa features.
6. **Live party modes:** host-selected game rounds, lobby presence, rematches and team scores. Introduce a dedicated authoritative game server only if latency-sensitive gameplay requires it.

## Acceptance criteria for first public room release

- Five players join from separate devices, including Safari on iPhone and Android browsers.
- Refresh/reconnect does not duplicate participants or lose an active room.
- Host can start and end rounds; only members can access room state.
- Scores for La Posada and Tamalazo appear together, with clear indication of verification status.
- Shared invite works from WhatsApp and Messenger as a **web** link; never depend on Meta native-app deep linking.
- Existing `/friends`, `/play`, `/juegos`, and Facebook Instant Games continue working.

## Deployment policy

Ship each phase as a reviewable pull request. The platform core package is **not** a root-level Vite app, so adding it does not change Vercel's existing no-build static deployment behavior. No database schema should be applied without a reviewed migration and authorization policy.
