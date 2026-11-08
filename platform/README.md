# Posada Santa platform core (foundation)

A **separate, non-deployed** TypeScript/Vite library for the future social gaming platform. It is intentionally isolated from the existing static site and the Facebook Instant Games packaging script.

## What exists

- Canonical catalog of the four currently deployed games and their routes.
- Shared room/player/score contracts for future integrations.
- Human-friendly room-code generation, invite URL helpers, and guest nickname normalization.
- Automated tests for the catalog, invite links, and validation.

## What does NOT exist yet

- No `/room` page has been deployed. Generated invite links are **not usable** until that route and the server-side room service are implemented.
- No Supabase tables, room persistence, presence, multiplayer synchronization, verified scores, or cross-platform login are implemented.
- Existing `/friends` challenges and La Posada scores are **unchanged**.

## Local development

```sh
cd platform
npm install
npm test
npm run typecheck
npm run build
```

Node.js 22+ recommended. The library build produces `platform/dist/platform-core.js`; it is not connected to Vercel or Facebook yet. `npm install` generates a lockfile for future CI hardening.

## Security boundaries

- Guest names are display-only and are never authorization credentials.
- Shareable room codes are discovery identifiers, **not** private access tokens.
- A backend must generate and validate room membership and permissions before any live room or score functionality ships.
- Score submissions from the browser must be treated as unverified unless server validation is introduced.
- Do not embed Supabase service-role keys or private Facebook app secrets in client code.
