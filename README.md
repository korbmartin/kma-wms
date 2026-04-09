# Martin Personal Project - WMS (Cloudflare + Supabase)

This project is migrated to run on Cloudflare Workers with static frontend assets and Supabase as the database.

## Architecture

- Frontend: static files from `frontend/`
- API: Cloudflare Worker in `cloudflare/worker.js`
- Database: Supabase Postgres via Supabase API

The frontend now calls same-origin `/api`.

## Config

`wrangler.toml` includes:

- Worker entry: `cloudflare/worker.js`
- Static assets binding: `frontend/`
- Supabase URL + publishable key

Current defaults are:

- `SUPABASE_URL = https://fvrvfioqfgvmvdgnniyu.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY = sb_publishable_s-f5r8mvwsUw2elcCidvgw_K0LawYRr`

Optional (recommended for full write access if RLS blocks anon key writes):

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Local Dev

```bash
npm install
npm run dev
```

Then open the local Worker URL printed by Wrangler.

## Deploy

```bash
npm run deploy
```

## Notes

- The old local Docker/Postgres + Express backend flow was removed.
- Database SQL/reference docs are kept under `db/` and `WMS_DATABASE_NOTES.txt`.
