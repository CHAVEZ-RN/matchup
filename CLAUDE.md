# CLAUDE.md — project context for Claude Code

## What this is
MatchUp: booking platform for Filipino sports coaches. Two parts sharing one
Supabase database: (1) `web/` coach console (React/Vite), (2) `bot/` Machi —
a Taglish Telegram booking assistant powered by the Claude API.
Read README.md for the architecture. The owner is a non-technical founder —
explain steps simply and do the heavy lifting.

## Design system (do not change without asking)
Posh gold & black. Tokens live in `web/src/App.jsx` as the `T` object:
bg #0E0C09, panel #17140F, gold #D4A93C, champagne #ECD9A0, text #F2EBDD.
Fonts: Marcellus (display), Inter (body). Mobile-first, max-width 460px,
bottom tab nav. Keep it minimal — 3 tabs, one decision per screen.

## Current state
- Web app is fully designed but runs on in-memory demo data (SEED array).
- Bot server is code-complete but never run; expect minor bugs on first deploy.
- machi-system-prompt.md is final — edit only with the owner's approval.

## TODO (in priority order)
1. **Wire web app to Supabase**: replace SEED/useState with real queries
   against `bookings` and `blocked_slots` (schema in db/schema.sql).
   Add Supabase Auth for the login page (email/password). Subscribe to
   realtime changes so pending bookings appear live.
2. **Approve/decline must notify the client**: after the web app updates a
   booking's status, call the bot server's `POST /notify-status` with
   { booking_id } — or set up a Supabase database webhook that does it.
3. **Deploy**: bot/ to Railway or Render (it's a long-running Express app —
   NOT ideal as a Vercel function because of cold starts on webhooks);
   web/ to Vercel. Help the owner set every env var in .env.example.
4. **Register the Telegram webhook** (curl command in README step 5).
5. **End-to-end test**: book via Telegram → approve in console → client
   gets the confirmation message.
6. Later/nice-to-have: settings page (working hours, rates), RLS policies,
   session reminders, multi-coach support (route by bot token or deep link).

## Gotchas
- All dates/times are Asia/Manila. The bot already handles this
  (manilaToday()); keep the web app consistent.
- bookings.status values: pending | upcoming | active | completed | declined.
  "active" = happening today/now; consider a cron or computed status later.
- The service_role key is ONLY for the bot server. The web app must use the
  anon key + Auth. Never expose service_role in web/.
- The owner previously built on Lovable; this is a fresh rebuild (pivot).
