// Machi bot server — Telegram <-> Claude <-> Supabase
// Multi-coach via deep links:
//   Booking link:  https://t.me/<YourBot>?start=<coach_slug>
//   Coach setup:   https://t.me/<YourBot>?start=setup_<coach_slug>
// Deploy on Render/Railway. Env vars: see bot/.env.example

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const {
  TELEGRAM_BOT_TOKEN,
  ANTHROPIC_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  WEBHOOK_SECRET = "machi-secret",
  PORT = 3000,
} = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const app = express();
app.use(express.json());

// Allow the website (browser) to call /notify-status cross-origin
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const TG = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const PROMPT_TEMPLATE = readFileSync(new URL("./machi-system-prompt.md", import.meta.url), "utf8");

/* ── helpers ─────────────────────────────────────────── */

async function tgSend(chatId, text, extra = {}) {
  await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

function manilaToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // YYYY-MM-DD
}

async function getCoachBySlug(slug) {
  const { data } = await supabase.from("coaches").select("*").eq("slug", slug).maybeSingle();
  return data || null;
}

async function setSession(telegramUserId, coachId) {
  await supabase.from("chat_sessions")
    .upsert({ telegram_user_id: telegramUserId, coach_id: coachId, updated_at: new Date().toISOString() });
}

async function getCoachForChat(telegramUserId) {
  const { data: sess } = await supabase.from("chat_sessions")
    .select("coach_id").eq("telegram_user_id", telegramUserId).maybeSingle();
  if (!sess) return null;
  const { data: coach } = await supabase.from("coaches").select("*").eq("id", sess.coach_id).maybeSingle();
  return coach || null;
}

// Parse "/start <param>" → { kind: 'setup' | 'book', slug } or null
function parseStart(text) {
  if (!text || !text.startsWith("/start")) return null;
  const parts = text.trim().split(/\s+/);
  const param = parts[1];
  if (!param) return { kind: "bare" };
  if (param.startsWith("setup_")) return { kind: "setup", slug: param.slice(6).toLowerCase() };
  return { kind: "book", slug: param.toLowerCase() };
}

function buildSystemPrompt(coach) {
  return PROMPT_TEMPLATE
    .replaceAll("{COACH_NAME}", coach.name)
    .replaceAll("{COACH_SPORT}", coach.sport)
    .replaceAll("{WORKING_HOURS}", coach.working_hours)
    .replaceAll("{COACH_INFO}", coach.info || "(none provided)")
    .replaceAll("{TODAY}", manilaToday())
    .replaceAll("{MAX_WEEKS_AHEAD}", String(coach.max_weeks_ahead))
    .replaceAll("{MAX_SESSION_HOURS}", String(coach.max_session_hours))
    .replaceAll("{MAX_PENDING_PER_CLIENT}", String(coach.max_pending_per_client));
}


async function sendCoachPicker(chatId, intro) {
  const { data: coaches } = await supabase.from("coaches").select("name, sport, slug").order("name");
  if (!coaches || coaches.length === 0) {
    await tgSend(chatId, "Wala pa pong available na coach ngayon 🙏");
    return;
  }
  const buttons = coaches.map((c) => [{ text: `${c.name} · ${c.sport}`, callback_data: `pick_${c.slug}` }]);
  await tgSend(chatId, intro || "Sino pong coach gusto niyong i-book? 👇", {
    reply_markup: { inline_keyboard: buttons },
  });
}

/* ── tools Machi can call ───────────────────────────── */

const TOOLS = [
  {
    name: "check_availability",
    description: "Get open, taken, and blocked hours for a date (YYYY-MM-DD).",
    input_schema: { type: "object", properties: { date: { type: "string" } }, required: ["date"] },
  },
  {
    name: "create_booking",
    description: "Create a pending booking after the client confirmed the echoed details.",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string" },
        date: { type: "string" },
        time: { type: "string", description: "HH:MM 24h" },
        duration_hours: { type: "integer" },
      },
      required: ["client_name", "date", "time", "duration_hours"],
    },
  },
  {
    name: "get_booking",
    description: "Get this client's current and recent bookings with statuses.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "flag_for_coach",
    description: "Privately alert the coach about something needing human attention.",
    input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
  },
];

async function runTool(name, input, ctx) {
  const { coach, telegramUserId } = ctx;
  try {
    if (name === "check_availability") {
      const { data: bk } = await supabase.from("bookings")
        .select("time,duration_hours,status").eq("coach_id", coach.id)
        .eq("date", input.date).in("status", ["pending", "upcoming", "active"]);
      const { data: bl } = await supabase.from("blocked_slots")
        .select("hour").eq("coach_id", coach.id).eq("date", input.date);
      const taken = [];
      for (const b of bk || []) {
        const start = parseInt(b.time.slice(0, 2), 10);
        for (let h = start; h < start + b.duration_hours; h++) taken.push(`${String(h).padStart(2, "0")}:00`);
      }
      const blocked = (bl || []).map((x) => x.hour.slice(0, 5));
      const open = [];
      const lo = Number.isInteger(coach.start_hour) ? coach.start_hour : 6;
      const hi = Number.isInteger(coach.end_hour) ? coach.end_hour : 21;
      for (let h = lo; h <= hi; h++) {
        const t = `${String(h).padStart(2, "0")}:00`;
        if (!taken.includes(t) && !blocked.includes(t)) open.push(t);
      }
      return { date: input.date, open, taken, blocked };
    }
    if (name === "create_booking") {
      const { count } = await supabase.from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coach.id).eq("telegram_user_id", telegramUserId).eq("status", "pending");
      if ((count || 0) >= coach.max_pending_per_client)
        return { ok: false, error: "client already has the maximum number of pending bookings" };
      const { data, error } = await supabase.from("bookings").insert({
        coach_id: coach.id, client_name: input.client_name, telegram_user_id: telegramUserId,
        date: input.date, time: input.time, duration_hours: input.duration_hours, status: "pending",
      }).select().single();
      if (error) return { ok: false, error: error.message };
      if (coach.telegram_chat_id) {
        const base = (process.env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
        const approveUrl = `${base}/act/${WEBHOOK_SECRET}/${data.id}/approve`;
        const declineUrl = `${base}/act/${WEBHOOK_SECRET}/${data.id}/decline`;
        try {
          const r = await fetch(`${TG}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: coach.telegram_chat_id,
              text: `📩 New booking request: ${input.client_name} — ${input.date} ${input.time} (${input.duration_hours}h)`,
              reply_markup: { inline_keyboard: [[
                { text: "✅ Approve", url: approveUrl },
                { text: "❌ Decline", url: declineUrl }
              ]]}
            }),
          });
          const rj = await r.json();
          if (!rj.ok) {
            await tgSend(coach.telegram_chat_id,
              `📩 New booking request: ${input.client_name} — ${input.date} ${input.time} (${input.duration_hours}h)\n\n` +
              `✅ Approve: ${approveUrl}\n❌ Decline: ${declineUrl}`);
          }
        } catch (e) {
          console.error("Coach notify failed:", String(e));
        }
      } else {
        console.error(`Coach ${coach.slug} has no telegram_chat_id — they haven't used their setup link yet.`);
      }
      return { ok: true, booking_id: data.id, status: "pending" };
    }
    if (name === "get_booking") {
      const { data } = await supabase.from("bookings")
        .select("client_name,date,time,duration_hours,status").eq("coach_id", coach.id)
        .eq("telegram_user_id", telegramUserId).order("created_at", { ascending: false }).limit(5);
      return { bookings: data || [] };
    }
    if (name === "flag_for_coach") {
      if (coach.telegram_chat_id) await tgSend(coach.telegram_chat_id, `🚩 Machi flag: ${input.reason}`);
      return { ok: true };
    }
    return { ok: false, error: "unknown tool" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* ── Claude conversation loop ───────────────────────── */

async function askMachi(coach, telegramUserId, history) {
  let messages = [...history];
  for (let round = 0; round < 6; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: buildSystemPrompt(coach),
        tools: TOOLS,
        messages,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const toolUses = (data.content || []).filter((c) => c.type === "tool_use");
    if (data.stop_reason === "tool_use" && toolUses.length) {
      messages.push({ role: "assistant", content: data.content });
      const results = [];
      for (const tu of toolUses) {
        const out = await runTool(tu.name, tu.input, { coach, telegramUserId });
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
      }
      messages.push({ role: "user", content: results });
      continue;
    }
    return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
  }
  return "Ay sorry po, medyo nagloloko ako 😅 Try niyo po ulit in a bit!";
}


/* ── client notifications (single source of truth) ──── */

function niceDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}
function nice12(t) {
  const h = parseInt(String(t).slice(0, 2), 10);
  return `${((h + 11) % 12) + 1}${String(t).slice(2, 5)} ${h >= 12 ? "PM" : "AM"}`;
}

// Sends a Telegram message and throws if Telegram rejects it.
async function tgSendStrict(chatId, text) {
  const r = await fetch(`${TG}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error("telegram send failed: " + JSON.stringify(j));
  return true;
}

// Notifies the client about an approval/decline. Race-safe: only one caller wins.
// If the Telegram send fails, the claim is released so the poller retries.
async function notifyClient(bookingId) {
  // claim: flip notified false -> true atomically; if 0 rows, someone already sent
  const { data: claimed } = await supabase.from("bookings")
    .update({ notified: true }).eq("id", bookingId).eq("notified", false).select();
  if (!claimed || claimed.length === 0) return false;
  const b = claimed[0];
  if (b.status !== "upcoming" && b.status !== "declined") {
    await supabase.from("bookings").update({ notified: false }).eq("id", bookingId);
    return false;
  }
  const msg = b.status === "upcoming"
    ? `Confirmed na po! ✅ See you ${niceDate(b.date)}, ${nice12(b.time)}.`
    : `Hi po! Pasensya na, di po available si Coach sa ${niceDate(b.date)} ${nice12(b.time)} 🙏 Message niyo lang po ako ulit para humanap tayo ng ibang slot!`;
  try {
    await tgSendStrict(b.telegram_user_id, msg);
    return true;
  } catch (e) {
    // release the claim so a later attempt (poller) can retry
    await supabase.from("bookings").update({ notified: false }).eq("id", bookingId);
    throw e;
  }
}

// Watch the DB: whenever a booking becomes upcoming/declined, tell the client.
// This makes approvals work no matter where they happen (website, Telegram, DB).
let watcherChannel = null;
function startBookingWatcher() {
  if (watcherChannel) { try { supabase.removeChannel(watcherChannel); } catch {} }
  watcherChannel = supabase
    .channel("booking-status-watch")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" },
      async (payload) => {
        const b = payload.new;
        if (!b || b.notified) return;
        if (b.status === "upcoming" || b.status === "declined") {
          try { await notifyClient(b.id); } catch (e) { console.error("notifyClient (realtime) failed:", String(e)); }
        }
      })
    .subscribe((status) => {
      console.log("Booking watcher:", status);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setTimeout(startBookingWatcher, 5000); // reconnect
      }
    });
}

// Safety net: every 12s, catch any approved/declined booking the realtime feed missed.
function startNotifyPoller() {
  setInterval(async () => {
    try {
      const { data } = await supabase.from("bookings")
        .select("id").eq("notified", false).in("status", ["upcoming", "declined"]).limit(20);
      for (const row of data || []) {
        try { await notifyClient(row.id); } catch (e) { console.error("poller notify failed:", String(e)); }
      }
    } catch (e) { console.error("poller error:", String(e)); }
  }, 12000);
}

/* ── routes ─────────────────────────────────────────── */

// Telegram webhook. Register with:
// curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR-BOT-URL>/webhook/<WEBHOOK_SECRET>"
app.post(`/webhook/:secret`, async (req, res) => {
  res.sendStatus(200); // ack immediately
  try {
    if (req.params.secret !== WEBHOOK_SECRET) return;

    // Handle taps on the coach-picker buttons
    const cq = req.body?.callback_query;
    if (cq) {
      const cbChatId = cq.message?.chat?.id;
      const data = cq.data || "";
      // acknowledge the tap so Telegram stops the loading spinner
      try { await fetch(`${TG}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cq.id }) }); } catch {}
      if (data.startsWith("pick_") && cbChatId) {
        const slug = data.slice(5).toLowerCase();
        const coach = await getCoachBySlug(slug);
        if (!coach) {
          await supabase.from("chat_sessions").delete().eq("telegram_user_id", cbChatId);
          await tgSend(cbChatId, "Hmm, di ko po mahanap yang coach na yan 🤔");
          return;
        }
        await setSession(cbChatId, coach.id);
        await tgSend(cbChatId, `Sige po! Si Coach ${coach.name} (${coach.sport}) na po. Anong araw at oras gusto niyong mag-book?`);
      }
      return;
    }

    const msg = req.body?.message;
    if (!msg) return;
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) { await tgSend(chatId, "Text po muna ako marunong basahin 😅 type niyo na lang po!"); return; }

    // 1) Handle deep-link /start params
    const start = parseStart(text);
    if (start) {
      if (start.kind === "setup") {
        const coach = await getCoachBySlug(start.slug);
        if (!coach) { await tgSend(chatId, "Hmm, di ko mahanap yang coach setup link na yan 🤔 Double-check niyo po."); return; }
        await supabase.from("coaches").update({ telegram_chat_id: chatId }).eq("id", coach.id);
        await setSession(chatId, coach.id);
        await tgSend(chatId, `✅ Connected na po, Coach ${coach.name}! Dito na darating ang booking requests niyo. I-share niyo na po ang booking link niyo sa clients.`);
        return;
      }
      if (start.kind === "book") {
        const coach = await getCoachBySlug(start.slug);
        if (!coach) {
          await supabase.from("chat_sessions").delete().eq("telegram_user_id", chatId);
          await tgSend(chatId, "Hmm, di ko mahanap yang coach na yan 🤔 Baka mali yung link? Pakibuksan ulit ang tamang MatchUp link ng coach niyo.");
          return;
        }
        await setSession(chatId, coach.id);
        await tgSend(chatId, `Hi po! 👋 Si Machi 'to, booking assistant ni Coach ${coach.name} (${coach.sport}). Anong araw at oras po gusto niyong mag-book?`);
        return;
      }
      // bare /start with no param → show a coach picker so they can choose
      await sendCoachPicker(chatId, "Hi po! 👋 Si Machi 'to. Sino pong coach gusto niyong i-book?");
      return;
    }

    // 1b) Let clients switch coaches anytime
    if (/^\/(coaches|switch)\b/i.test(text)) {
      await sendCoachPicker(chatId, "Sino pong coach gusto niyong i-book? 👇");
      return;
    }

    // 2) Normal message — find which coach this user is booking with
    const coach = await getCoachForChat(chatId);
    if (!coach) {
      await sendCoachPicker(chatId, "Hi po! 🙏 Para makapag-book, piliin niyo po muna ang coach niyo:");
      return;
    }

    await supabase.from("messages").insert({ coach_id: coach.id, telegram_user_id: chatId, role: "user", content: text });
    const { data: hist } = await supabase.from("messages")
      .select("role,content").eq("coach_id", coach.id).eq("telegram_user_id", chatId)
      .order("created_at", { ascending: false }).limit(20);
    const history = (hist || []).reverse().map((m) => ({ role: m.role, content: m.content }));

    const reply = await askMachi(coach, chatId, history);
    await supabase.from("messages").insert({ coach_id: coach.id, telegram_user_id: chatId, role: "assistant", content: reply });
    await tgSend(chatId, reply);
  } catch (e) {
    console.error("webhook error:", e);
    try { await tgSend(req.body.message.chat.id, "Ay teka po, nagloloko yung system ko saglit 😅 Try niyo po ulit mamaya ha."); } catch {}
  }
});

// One-tap approve/decline links (sent to the coach on Telegram).
app.get("/act/:secret/:booking_id/:action", async (req, res) => {
  try {
    const { secret, booking_id, action } = req.params;
    if (secret !== WEBHOOK_SECRET) return res.status(403).send("Nope.");
    if (!["approve", "decline"].includes(action)) return res.status(400).send("Bad action.");
    const { data: b } = await supabase.from("bookings").select("*").eq("id", booking_id).single();
    if (!b) return res.status(404).send("Booking not found.");
    if (b.status !== "pending") return res.send(`Already ${b.status}. ✋`);
    const status = action === "approve" ? "upcoming" : "declined";
    await supabase.from("bookings").update({ status, notified: false }).eq("id", booking_id);
    await notifyClient(booking_id);
    res.send(`Booking ${action}d ✅ — ${b.client_name}, ${niceDate(b.date)} ${nice12(b.time)}. Client has been notified. You can close this tab.`);
  } catch (e) {
    res.status(500).send("Error: " + String(e));
  }
});

// Called by the web app (or a Supabase webhook) after the coach approves/declines in the console.
app.post("/notify-status", async (req, res) => {
  try {
    const { booking_id } = req.body;
    await notifyClient(booking_id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/", (_, res) => res.send("Machi is awake 🤖"));
app.listen(PORT, () => {
  console.log(`Machi listening on :${PORT}`);
  startBookingWatcher();
  startNotifyPoller();
});
