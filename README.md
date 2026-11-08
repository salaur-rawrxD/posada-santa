# Posada Santa

Secret Santa con sabor: letters to Santa, piñata reveals, and the La Posada game.

Static site on Vercel and Supabase (project `posada-santa`) for letters and the live family leaderboard.

| Page | Path |
| --- | --- |
| Landing | `/` |
| Organizer console | `/host` |
| Letter to Santa | `/letter` |
| Piñata reveal | `/pinata` |
| La Posada game | `/play` |
| Privacy & terms | `/privacy` |

No build step. Vercel serves the files as they are (`cleanUrls` is on).

The Supabase anon key in the pages is public by design. The tables have no direct access. Everything goes through `register_group`, `submit_letter`, `fetch_letters` (which needs the organizer's key), `submit_score` and `get_board`.


## PostHog analytics

All HTML pages load `/posthog.js`, which records a sanitized page view and mirrors existing named `psTrack(eventName)` events to PostHog. Vercel Analytics continues working independently. No npm/build step is required.

**Finish setup before merging:**

1. Create a PostHog project at https://app.posthog.com or https://eu.posthog.com.
2. In PostHog **Project settings**, copy the **Project API key / project token** (public `phc_...` identifier; never a personal API key).
3. Edit `posthog.js` and replace `REPLACE_WITH_POSTHOG_PROJECT_TOKEN` with that token.
4. If your project is in the EU, update `API_HOST` from `https://us.i.posthog.com` to `https://eu.i.posthog.com`.
5. Merge this PR and wait for Vercel to deploy. Open the site and check **PostHog → Activity / Live events** for `$pageview` and selected interactions.

The placeholder prevents PostHog from loading until configured. PostHog's project token is intended for use in browser code. Do **not** put a private personal API key in the file.

**Privacy:** The implementation disables automatic interaction tracking, session recording, surveys, exception capture, and person profiles. It keeps analytics identity in session storage, strips URL queries/fragments, and forwards existing event **names only**, without event payloads. Do not add names, emails, gifts, phone numbers, invite codes, or secret mailbox data to tracked event names. Review the analytics privacy disclosure and your consent requirements before enabling optional tracking features.
