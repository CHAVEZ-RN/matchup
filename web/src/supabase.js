import { createClient } from "@supabase/supabase-js";

// These come from Vercel Environment Variables (must start with VITE_).
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon);

// Your deployed bot's public URL (Railway), e.g. https://matchup-production.up.railway.app
// Used to tell the client on Telegram when you approve/decline from the website.
export const BOT_URL = (import.meta.env.VITE_BOT_URL || "").replace(/\/+$/, "");

// Your bot's Telegram username (no @). Used to build each coach's booking link.
export const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "MachiMatchUpBot";
