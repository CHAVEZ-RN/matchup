# MatchUp — Coach-First Booking Platform (with Machi 🤖)

A booking platform for Filipino sports coaches. Clients book by chatting with
**Machi**, a Taglish AI assistant on Telegram. Coaches approve/decline and manage
their calendar in a gold-and-black web console.

## What's in this folder

```
matchup/
├── web/        Coach Console (React + Vite) — login, pending approvals,
│               calendar + time blocking, all bookings. Currently runs on
│               demo data; needs Supabase wiring.
├── bot/        Machi bot server (Node + Express) — Telegram webhook,
│               Claude API with tools, Supabase read/write. Code complete,
│               needs deployment + keys.
│   └── machi-system-prompt.md   Machi's full personality & safety spec
└── db/
    └── schema.sql               Run this in Supabase SQL editor
```

## How the system works

Client texts Machi on Telegram → bot server sends the chat to Claude →
Claude extracts name/date/time, checks Supabase for conflicts, creates a
PENDING booking → coach sees it in the web console → coach approves/declines
→ server messages the client the result. One database, two doors.

## Setup (in order)

1. **Accounts**: github.com, vercel.com, supabase.com (free tiers).
2. **Telegram bot**: message @BotFather → /newbot → save the token.
3. **Claude API key**: console.anthropic.com.
4. **Database**: create a Supabase project → SQL Editor → paste & run
   `db/schema.sql` → edit the seeded coach row with the real coach's details.
5. **Bot server**: deploy `bot/` to Railway/Render (or similar), set env vars
   from `bot/.env.example`, then register the webhook:
   `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR-BOT-URL>/webhook/<WEBHOOK_SECRET>"`
6. **Web app**: wire `web/src/App.jsx` to Supabase (replace demo SEED data
   with real queries — see CLAUDE.md TODOs), then deploy `web/` to Vercel.
7. **Test**: text your bot, book a session, approve it in the console,
   confirm the Telegram message arrives.

## Status

- [x] Coach Console UI (demo data)
- [x] Machi system prompt (hardened v2)
- [x] Bot server code
- [x] Database schema
- [ ] Web app ↔ Supabase wiring (auth + live data)
- [ ] Deployment
- [ ] Coach gets /notify-status called on approve/decline (see CLAUDE.md)

Built with Claude. Continue development by opening this folder in Claude Code.
