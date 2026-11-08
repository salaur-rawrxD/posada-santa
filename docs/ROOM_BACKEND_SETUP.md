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
