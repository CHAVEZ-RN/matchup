// Machi bot server — Telegram <-> Claude <-> Supabase
// Deploy on Railway/Render/Fly (or adapt to a Vercel function).
// Required env vars: see .env.example

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

const TG = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const PROMPT_TEMPLATE = readFileSync(new URL("./machi-system-prompt.md", import.meta.url), "utf8");

/* ── helpers ─────────────────────────────────────────── */

async function tgSend(chatId, text) {
  await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

function manilaToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // YYYY-MM-DD
}

async function getCoach() {
  // Single-coach MVP: first coach row. Multi-coach later: route by bot or deep-link param.
  const { data, error } = await supabase.from("coaches").select("*").limit(1).single();
  if (error) throw error;
  return data;
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
      for (let h = 6; h <= 21; h++) {
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
        console.log("Notifying coach", coach.telegram_chat_id, "base:", JSON.stringify(base));
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
            console.error("Button message rejected by Telegram:", JSON.stringify(rj));
            await tgSend(coach.telegram_chat_id,
              `📩 New booking request: ${input.client_name} — ${input.date} ${input.time} (${input.duration_hours}h)\n\n` +
              `✅ Approve: ${approveUrl}\n❌ Decline: ${declineUrl}`);
          } else {
            console.log("Coach notified OK, message_id:", rj.result?.message_id);
          }
        } catch (e) {
          console.error("Coach notify failed:", String(e));
        }
      } else {
        console.error("No telegram_chat_id on coach row — coach NOT notified");
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

/* ── routes ─────────────────────────────────────────── */

// Telegram webhook: set with
// curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR-URL/webhook/<WEBHOOK_SECRET>"
app.post(`/webhook/:secret`, async (req, res) => {
  res.sendStatus(200); // ack immediately
  try {
    if (req.params.secret !== WEBHOOK_SECRET) return;
    const msg = req.body?.message;
    if (!msg) return;
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) { await tgSend(chatId, "Text po muna ako marunong basahin 😅 type niyo na lang po!"); return; }

    const coach = await getCoach();
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
    await supabase.from("bookings").update({ status }).eq("id", booking_id);
    const nice = new Date(b.date + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
    const t12 = (() => { const h = parseInt(b.time.slice(0, 2), 10); return `${((h + 11) % 12) + 1}${b.time.slice(2, 5)} ${h >= 12 ? "PM" : "AM"}`; })();
    if (status === "upcoming")
      await tgSend(b.telegram_user_id, `Confirmed na po! ✅ See you ${nice}, ${t12}. 🎾`);
    else
      await tgSend(b.telegram_user_id, `Hi po! Di po available si Coach sa ${nice} ${t12} 🙏 Message niyo lang po ako ulit para maghanap tayo ng ibang slot!`);
    await supabase.from("bookings").update({ notified: true }).eq("id", booking_id);
    res.send(`Booking ${action}d ✅ — ${b.client_name}, ${nice} ${t12}. Client has been notified. You can close this tab.`);
  } catch (e) {
    res.status(500).send("Error: " + String(e));
  }
});

// Called by the web app (or a Supabase webhook) after the coach approves/declines.
app.post("/notify-status", async (req, res) => {
  try {
    const { booking_id } = req.body;
    const { data: b } = await supabase.from("bookings").select("*").eq("id", booking_id).single();
    if (!b || b.notified) return res.json({ ok: true, skipped: true });
    const nice = new Date(b.date + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
    const t12 = (() => { const h = parseInt(b.time.slice(0, 2), 10); return `${((h + 11) % 12) + 1}${b.time.slice(2, 5)} ${h >= 12 ? "PM" : "AM"}`; })();
    if (b.status === "upcoming")
      await tgSend(b.telegram_user_id, `Confirmed na po! ✅ See you ${nice}, ${t12}. 🎾`);
    else if (b.status === "declined")
      await tgSend(b.telegram_user_id, `Hi po! Di po available si Coach sa ${nice} ${t12} 🙏 Message niyo lang po ako ulit para maghanap tayo ng ibang slot!`);
    await supabase.from("bookings").update({ notified: true }).eq("id", booking_id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/", (_, res) => res.send("Machi is awake 🤖"));
app.listen(PORT, () => console.log(`Machi listening on :${PORT}`));
