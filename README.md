# Posada Santa

Secret Santa con sabor: letters to Santa, piñata reveals, and the La Posada game.

Static site on Vercel and Supabase (project `posada-santa`) for letters and the live family leaderboard.

Live at https://posadaxmas.com (www redirects to the apex).

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
