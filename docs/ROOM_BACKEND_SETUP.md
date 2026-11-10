# Secure social game rooms — rollout notes

This migration is **committed but not applied**. The current live website and Facebook ZIP are unchanged.

## Supabase prerequisites

1. In the existing Supabase project, enable **Authentication → Providers → Anonymous Sign-Ins**. This is a Supabase Auth guest account, not a fake player name. Each device receives a real authenticated session and can reconnect with the same local session.
2. Review the SQL in `supabase/migrations/20261108180000_social_game_rooms.sql` and apply it through Supabase SQL Editor or the CLI after testing on a staging project. Never run unreviewed SQL on production.
3. In `platform/.env.local` set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public publishable/anon key, never service-role).
4. `cd platform && npm install && npm run dev` then open `http://localhost:5173/room.html` once the UI is added.
5. Only after browser and authorization tests should the room page be integrated with the production Vercel site.

## Access model

- Authenticated users, including Supabase anonymous users, call seven narrowly scoped SECURITY DEFINER RPCs.
- All three new tables have RLS enabled and **no client table grants**. No direct SELECT/INSERT/UPDATE/DELETE.
- A room has one host, max 12 members, and expires after 24 hours. Host controls game selection and status. Leaving as host closes the room.
- Room codes are **discovery codes, not secrets**. A holder of the code may join an unstarted room. Never put personal information in nicknames.
- Room scores are client-submitted and explicitly marked **unverified**. No financial prizes or trusted rankings.
- Room presence is polling-based for this first iteration. Realtime publication and client subscriptions can follow after secure room reads are established.

## Required security tests before deployment

- Signed-out requests fail; anonymous-auth users can create/join.
- User A cannot read or mutate a room without joining, even with a known room UUID.
- A guest cannot select a game or start/end a room.
- A second user cannot impersonate an existing session by choosing the same nickname.
- A 13th participant cannot join; an expired room cannot be joined.
- Scores for an unrelated game or room are rejected; points are bounded.
- Direct table reads and writes are denied for browser roles.
- Shared links opened from WhatsApp/Messenger work as ordinary web links, not dependent on Facebook deep linking.

## Known limits

Anonymous sessions can be lost if browser storage is cleared. The same human on another device becomes a different guest. No cross-device account linking, anti-cheat, Realtime presence, cleanup job, or game integration exists yet.

## Separate Vercel preview project (recommended)

The existing Vercel `posada-santa` project serves the production website from the repository root. **Do not change its Root Directory or build settings.**

Create a second Vercel project from the same GitHub repository, under the **EVA Systems Projects** team, with:

| Setting | Value |
| --- | --- |
| Project Name | `posada-santa-rooms-preview` |
| Repository | `salaur-rawrxD/posada-santa` |
| Root Directory | `platform` |
| Framework | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build:room` |
| Output Directory | `dist-room` |
| Environment variable | `VITE_SUPABASE_URL` = the project's public Supabase URL |
| Environment variable | `VITE_SUPABASE_ANON_KEY` = the project's browser-safe publishable or anon key |

Do **not** set a Supabase service role secret in any `VITE_*` variable. The credentials are embedded in browser JavaScript.

The room preview source is on `feature/social-gaming-platform-foundation`, not `main`. Once the new project exists, deploy **that exact feature branch**, not the main branch. Initial imports of `main` are expected to fail until this feature is merged. The preview URL will end with `/room.html`, and invite links generated there will point back to that same preview deployment.

For a working preview, make the preview project's initial production branch the feature branch, **or** create the project and explicitly deploy the feature branch through Vercel afterward. Keep the preview project separate from `posada-santa`. Do not connect production domains to it.

If Vercel deploy protection is enabled, invited family members may be asked to authenticate with Vercel. For two-device testing, use the approved access controls rather than disabling protection globally.

## Browser smoke test after deployment

1. On Phone A open `https://<preview-deployment>/room.html` and create a room with a nickname.
2. Share the invitation by WhatsApp or copy the link; confirm it includes `/room.html#code=XXXXXXXX`.
3. Open the invitation on Phone B in a normal browser. Enter a different nickname and join. Confirm both players appear within ~5 seconds.
4. As host, select La Posada; verify the other device sees the selection. Start and finish the room. Refresh both phones.
5. Confirm an unrelated third anonymous user **cannot** query the room UUID without joining.
6. Repeat with an expired or malformed invite, and confirm the app declines it.

Current lobby code uses polling rather than Supabase Realtime. It does not yet launch a game inside the room or submit actual game scores.
