import { useState, useEffect, useMemo, useRef } from "react";
import { supabase, BOT_URL, BOT_USERNAME } from "./supabase";
import {
  CalendarDays, Inbox, ListChecks, Check, X, Send, Search, Clock, History,
  Sparkles, LogOut, Ban, AlertTriangle, Undo2, Globe, CalendarClock, Settings,
  Bell, Sun, Moon, ChevronRight, ChevronDown, MessageCircle, Wallet, ArrowRight,
  Eye, EyeOff, CheckCircle2, Repeat, User, Phone, Star, CalendarPlus,
} from "lucide-react";

/* =====================================================================
   THEME TOKENS — light (default) + warm-gold dark.
   Status colours are consistent across both: pending=amber, upcoming=blue,
   active=green, completed=neutral, declined/conflict=red.
   ===================================================================== */
const THEMES = {
  light: {
    name: "light",
    bg: "#F6F7F4", card: "#FFFFFF", card2: "#EFF1EC", soft: "#F1F3EE",
    line: "#E4E6E0", line2: "#D2D5CC",
    // brand: lime is the action color, charcoal-ink is the primary fill
    primary: "#1B1E24", primaryInk: "#FFFFFF", primarySoft: "#EAEBE6",
    accent: "#A6E22E", accentSoft: "#EEF8D6", accentInk: "#1B1E24",
    text: "#16181D", text2: "#4C515B", dim: "#878D96",
    telegram: "#1B1E24",
    // status — quiet, semantic, used only on tiny tags/dots
    pending: "#6E5A12", pendingBg: "#F6F1DD", pendingDot: "#C9A227",
    upcoming: "#2C3038", upcomingBg: "#ECEEE9", upcomingDot: "#1B1E24",
    active: "#3E7A12", activeBg: "#EDF7DD", activeDot: "#7DB52B",
    completed: "#5A6068", completedBg: "#EEEFEC", completedDot: "#9AA0A8",
    declined: "#A33A2A", declinedBg: "#F7E9E5", declinedDot: "#C85A45",
    success: "#3E7A12",
    shadow: "0 1px 2px rgba(16,24,40,.05), 0 2px 8px rgba(16,24,40,.06)",
    shadowLg: "0 10px 40px rgba(16,24,40,.16)",
    overlay: "rgba(16,18,21,.42)",
  },
  dark: {
    name: "dark",
    bg: "#121419", card: "#1A1D23", card2: "#22262E", soft: "#181B21",
    line: "#2A2E36", line2: "#383D47",
    primary: "#A6E22E", primaryInk: "#16181D", primarySoft: "#222A14",
    accent: "#A6E22E", accentSoft: "#222A14", accentInk: "#16181D",
    text: "#EDEFF2", text2: "#C2C7D0", dim: "#8A909B",
    telegram: "#A6E22E",
    pending: "#D8C26A", pendingBg: "#2A2614", pendingDot: "#CDB24A",
    upcoming: "#C7CDD6", upcomingBg: "#22262E", upcomingDot: "#AEB4BD",
    active: "#A6E22E", activeBg: "#1E2613", activeDot: "#A6E22E",
    completed: "#AEB4BD", completedBg: "#20242B", completedDot: "#828A95",
    declined: "#E8917E", declinedBg: "#2A1815", declinedDot: "#D9705A",
    success: "#A6E22E",
    shadow: "0 6px 24px rgba(0,0,0,.45)",
    shadowLg: "0 16px 50px rgba(0,0,0,.6)",
    overlay: "rgba(0,0,0,.58)",
  },
};

const COACH = { name: "Rio", sport: "Tennis", rate: 800, currency: "₱" };

/* ----------------------- REAL-DATA HELPERS ----------------------- */
const nowHourLocal = new Date().getHours();
function agoFrom(ts) {
  if (!ts) return "just now";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
// Supabase row -> the shape the UI components expect.
function mapBooking(row, rate) {
  const time = String(row.time).slice(0, 5);
  let status = row.status;
  if (status === "upcoming" && row.date === TODAY) {
    const sh = parseInt(time.slice(0, 2), 10);
    if (nowHourLocal >= sh && nowHourLocal < sh + row.duration_hours) status = "active";
  }
  return {
    id: row.id, client: row.client_name, tg: "Telegram",
    date: row.date, time, dur: row.duration_hours,
    status, via: row.via || "Machi", note: row.note || "",
    amount: (rate || 800) * row.duration_hours, paid: false,
    ago: agoFrom(row.created_at),
  };
}
function slugify(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "coach";
}
async function notifyBot(bookingId) {
  if (!BOT_URL) return;
  try {
    await fetch(`${BOT_URL}/notify-status`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
    });
  } catch (e) { /* non-fatal */ }
}

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
*{ -webkit-tap-highlight-color: transparent; }
.mu-display { font-family: 'Space Grotesk', -apple-system, system-ui, sans-serif; letter-spacing: -0.01em; font-weight: 600; }
.mu-body { font-family: 'Inter', -apple-system, system-ui, sans-serif; }
.mu-num { font-variant-numeric: tabular-nums; }
@keyframes mu-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes mu-in { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
@keyframes mu-up { from{opacity:0; transform:translateY(24px)} to{opacity:1; transform:none} }
@keyframes mu-fade { from{opacity:0} to{opacity:1} }
@keyframes mu-pop { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
.mu-in { animation: mu-in .35s ease both; }
.mu-sheet { animation: mu-up .28s cubic-bezier(.2,.9,.3,1) both; }
.mu-ov { animation: mu-fade .2s ease both; }
.mu-pop { animation: mu-pop .3s ease both; }
.mu-tap { transition: transform .08s ease, background .15s ease, border-color .15s ease; }
.mu-tap:active { transform: scale(.985); }
.mu-noscroll::-webkit-scrollbar{ display:none; }
.mu-noscroll{ scrollbar-width:none; -ms-overflow-style:none; }
input:focus, button:focus-visible { outline:none; }
.mu-focus:focus { box-shadow: 0 0 0 3px var(--ring); border-color: var(--ringb) !important; }
@media (max-width: 880px){
  .mu-hero { display:none !important; }
  .mu-loginwrap { max-width: 400px !important; }
}
`;

/* ----------------------- DATE / FORMAT HELPERS ----------------------- */
const d = (offset) => {
  const x = new Date();
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};
const TODAY = d(0);
const DAY_LABEL = (iso) => {
  const dt = new Date(iso + "T00:00:00");
  return {
    dow: dt.toLocaleDateString("en-PH", { weekday: "short" }),
    weekday: dt.toLocaleDateString("en-PH", { weekday: "long" }),
    day: dt.getDate(),
    full: dt.toLocaleDateString("en-PH", { month: "short", day: "numeric", weekday: "long" }),
    short: dt.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
  };
};
const fmt12 = (t) => {
  const h = parseInt(t.slice(0, 2), 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:00 ${ampm}`;
};
const fmtRange = (t, dur) => {
  const h = parseInt(t.slice(0, 2), 10);
  const end = `${String(h + dur).padStart(2, "0")}:00`;
  const a = fmt12(t), b = fmt12(end);
  const ap = a.slice(-2), bp = b.slice(-2);
  return ap === bp ? `${a.replace(" " + ap, "")}–${b}` : `${a}–${b}`;
};
const peso = (n) => `${COACH.currency}${n.toLocaleString("en-PH")}`;
const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

const AV_COLORS = ["#2D6CDF", "#16A34A", "#C2922E", "#7C5CD6", "#E0563B", "#0E9488", "#D6398B"];
const initials = (name) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const avColor = (name) => AV_COLORS[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];

/* ----------------------- DEMO DATA ----------------------- */
const S = COACH.sport;

const overlaps = (a, b) => {
  if (a.date !== b.date) return false;
  const a1 = parseInt(a.time, 10), a2 = a1 + a.dur;
  const b1 = parseInt(b.time, 10), b2 = b1 + b.dur;
  return a1 < b2 && b1 < a2;
};

/* ----------------------- SMALL PARTS ----------------------- */
function Avatar({ name, size = 38 }) {
  const c = avColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0,
      background: c + "22", color: c, display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700, fontSize: size * 0.36,
      fontFamily: "Inter, sans-serif",
    }}>{initials(name)}</div>
  );
}

const STATUS_LABEL = { pending: "Pending", upcoming: "Upcoming", active: "Active", completed: "Completed", declined: "Declined" };
function Badge({ T, status }) {
  return (
    <span className="mu-body" style={{
      color: T[status], background: T[status + "Bg"], fontSize: 11, fontWeight: 600,
      padding: "4px 10px", borderRadius: 99, display: "inline-flex", alignItems: "center",
      gap: 5, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: T[status + "Dot"] }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Sheet({ T, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="mu-ov" onClick={onClose} style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 60,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div className="mu-sheet mu-noscroll" onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460, background: T.card, borderTopLeftRadius: 22,
        borderTopRightRadius: 22, borderTop: `1px solid ${T.line}`, padding: "10px 18px 26px",
        maxHeight: "86vh", overflowY: "auto", boxShadow: T.shadowLg,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: T.line2, margin: "6px auto 16px" }} />
        {children}
      </div>
    </div>
  );
}

/* ----------------------- LOGIN ----------------------- */
function Brand({ T, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 16, flexShrink: 0,
      background: "#1B1E24", display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: T.shadow, border: T.name === "dark" ? "1px solid #2E333C" : "none",
    }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"
          fill="#FFFFFF" opacity="0.96" />
        <path d="M8.5 10.2l2.3 2.3 4.7-4.7" stroke="#A6E22E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function AuthScreen({ T, onTheme }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [sport, setSport] = useState("Tennis");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const ring = T.primary + "33", ringb = T.primary;
  const inputStyle = {
    width: "100%", boxSizing: "border-box", marginTop: 6, background: T.soft,
    border: `1px solid ${T.line2}`, borderRadius: 11, padding: "13px 14px",
    color: T.text, fontSize: 15, outline: "none", "--ring": ring, "--ringb": ringb,
  };

  async function createCoachRow(userId) {
    const base = slugify(name);
    for (let i = 0; i < 6; i++) {
      const slug = i === 0 ? base : `${base}${Math.floor(Math.random() * 900 + 100)}`;
      const { data, error } = await supabase.from("coaches").insert({
        user_id: userId, name: name.trim(), slug, sport,
        rate: 800, start_hour: 6, end_hour: 21,
        working_hours: "6:00 AM - 9:00 PM", info: "",
      }).select().single();
      if (!error) return data;
      if (error.code !== "23505") throw error;            // real error
      if ((error.message || "").includes("user_id")) return null; // already has a coach row
    }
    throw new Error("Couldn't make a unique link — try a slightly different name.");
  }

  async function submit() {
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
        // session change handled by the shell
      } else {
        if (!name.trim()) throw new Error("Please enter your name.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password: pw, options: { data: { name: name.trim(), sport } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Account created! If email confirmation is on, check your inbox, then sign in. (Tip: turn it off in Supabase for instant signup.)");
          setMode("login"); setBusy(false); return;
        }
        await createCoachRow(data.user.id);
        // session change handled by the shell
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) { setErr("Enter your email first, then tap Forgot."); return; }
    setErr(""); 
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setInfo(error ? "" : "Password reset link sent to your email.");
    if (error) setErr(error.message);
  }

  return (
    <div className="mu-body" style={{ minHeight: "100vh", background: T.bg, display: "flex" }}>
      {/* form side */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="mu-loginwrap mu-in" style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <Brand T={T} size={48} />
            <div>
              <h1 className="mu-display" style={{ color: T.text, fontSize: 26, margin: 0, lineHeight: 1 }}>MatchUp</h1>
              <p style={{ color: T.dim, fontSize: 12, margin: "4px 0 0" }}>powered by Machi 🤖</p>
            </div>
          </div>
          <h2 className="mu-display" style={{ color: T.text, fontSize: 22, margin: "0 0 6px", lineHeight: 1.25 }}>
            {mode === "login" ? <>Welcome back, Coach.</> : <>Your clients book on Telegram.<br />You just tap approve.</>}
          </h2>
          <p style={{ color: T.text2, fontSize: 14, margin: "0 0 20px", lineHeight: 1.5 }}>
            {mode === "login" ? "Sign in to your coach console." : "Create your account and get your own booking link."}
          </p>

          {mode === "signup" && (<>
            <label style={{ color: T.text2, fontSize: 13, fontWeight: 600 }}>Your name</label>
            <input className="mu-focus" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach Rio" style={inputStyle} />
            <div style={{ marginTop: 14 }}>
              <label style={{ color: T.text2, fontSize: 13, fontWeight: 600 }}>Sport</label>
              <input className="mu-focus" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Tennis" style={inputStyle} />
            </div>
          </>)}

          <div style={{ marginTop: mode === "signup" ? 14 : 0 }}>
            <label style={{ color: T.text2, fontSize: 13, fontWeight: 600 }}>Email</label>
            <input className="mu-focus" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@matchup.ph" style={inputStyle} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <label style={{ color: T.text2, fontSize: 13, fontWeight: 600 }}>Password</label>
            {mode === "login" && <a onClick={forgot} style={{ color: T.primary, fontSize: 12, cursor: "pointer" }}>Forgot?</a>}
          </div>
          <div style={{ position: "relative" }}>
            <input className="mu-focus" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} />
            <button onClick={() => setShow((s) => !s)} aria-label="Toggle password" style={{ position: "absolute", right: 8, top: 13, background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 6 }}>
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {err && <div style={{ marginTop: 12, color: T.declined, background: T.declinedBg, borderRadius: 10, padding: "9px 12px", fontSize: 13 }}>{err}</div>}
          {info && <div style={{ marginTop: 12, color: T.success, background: T.activeBg, borderRadius: 10, padding: "9px 12px", fontSize: 13 }}>{info}</div>}

          <button onClick={submit} disabled={busy} className="mu-tap" style={{
            width: "100%", marginTop: 18, background: T.primary, color: T.primaryInk, fontWeight: 700,
            fontSize: 15, border: "none", borderRadius: 11, padding: "14px 0", cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {busy ? "Please wait…" : (mode === "login" ? <>Sign in <ArrowRight size={16} /></> : <>Create account <ArrowRight size={16} /></>)}
          </button>

          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); setInfo(""); }}
            style={{ width: "100%", marginTop: 14, background: "none", border: "none", color: T.text2, fontSize: 13, cursor: "pointer" }}>
            {mode === "login" ? "New coach? Create an account →" : "Already have an account? Sign in →"}
          </button>
        </div>
      </div>

      {/* hero side */}
      <div className="mu-hero" style={{ flex: 1, background: T.card, borderLeft: `1px solid ${T.line}`, display: "flex", flexDirection: "column", justifyContent: "center", padding: 48, position: "relative" }}>
        <button onClick={onTheme} className="mu-tap" style={{ position: "absolute", top: 22, right: 22, background: T.soft, border: `1px solid ${T.line}`, borderRadius: 99, padding: 9, color: T.text2, cursor: "pointer" }}>
          {T.name === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div style={{ maxWidth: 360 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.activeBg, color: T.active, padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: T.activeDot }} /> Booking on autopilot for coaches
          </div>
          <div style={{ marginTop: 22, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 16, padding: 16, boxShadow: T.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: T.dim, fontSize: 12, fontWeight: 600 }}>
              <Send size={13} style={{ color: T.telegram }} /> Telegram · Machi
            </div>
            <div style={{ background: T.card2, color: T.text2, fontSize: 13, padding: "9px 12px", borderRadius: "12px 12px 12px 4px", maxWidth: "82%", marginBottom: 8 }}>
              coach pwede po bang mag-book bukas 9am? 🎾
            </div>
            <div style={{ background: T.telegram, color: "#fff", fontSize: 13, padding: "9px 12px", borderRadius: "12px 12px 4px 12px", maxWidth: "82%", marginLeft: "auto", marginBottom: 12 }}>
              Sige po! Naka-pending na — hihintayin natin i-confirm ✅
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 10 }}>
              <Avatar name="New Client" size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>New request</div>
                <div className="mu-num" style={{ color: T.dim, fontSize: 12 }}>Tomorrow · 9:00 AM</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ background: T.declinedBg, color: T.declined, borderRadius: 9, padding: 7, display: "flex" }}><X size={14} /></span>
                <span style={{ background: T.activeBg, color: T.active, borderRadius: 9, padding: 7, display: "flex" }}><Check size={14} /></span>
              </div>
            </div>
          </div>
          <p style={{ color: T.text2, fontSize: 14, marginTop: 20, lineHeight: 1.6, fontStyle: "italic" }}>
            "Dati nasa messages ko lahat ng booking, magulo. Ngayon tinatap ko lang."
          </p>
          <p style={{ color: T.dim, fontSize: 13, marginTop: 4 }}>— a MatchUp coach</p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- PENDING TAB ----------------------- */
function PendingCard({ T, b, conflict, onOpen, onApprove, onDecline }) {
  const dl = DAY_LABEL(b.date);
  return (
    <div className="mu-tap" onClick={onOpen} style={{
      background: T.card, border: `1px solid ${conflict ? T.declinedDot + "66" : T.line}`,
      borderRadius: 16, padding: 15, marginBottom: 12, cursor: "pointer", boxShadow: T.shadow,
    }}>
      <div style={{ display: "flex", gap: 12 }}>
        <Avatar name={b.client} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>{b.client}</span>
            <span style={{ color: T.dim, fontSize: 11, whiteSpace: "nowrap" }}>{b.ago || "just now"}</span>
          </div>
          <div className="mu-num" style={{ color: T.text2, fontSize: 13, marginTop: 3 }}>
            {dl.short} · {fmtRange(b.time, b.dur)}
          </div>
          <div style={{ color: T.dim, fontSize: 13, marginTop: 6, fontStyle: "italic", display: "flex", gap: 6 }}>
            <MessageCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} /> "{b.note}"
          </div>
        </div>
      </div>
      {conflict && (
        <div style={{ marginTop: 11, background: T.declinedBg, borderRadius: 10, padding: "8px 11px", color: T.declined, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {conflict}
        </div>
      )}
      <div style={{ display: "flex", gap: 9, marginTop: 13 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onDecline} className="mu-tap" style={{
          flex: 1, background: "transparent", border: `1px solid ${T.line2}`, color: T.text2,
          borderRadius: 11, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <X size={16} /> Decline
        </button>
        <button onClick={onApprove} className="mu-tap" style={{
          flex: 1.4, background: T.accent, border: "none", color: T.accentInk,
          borderRadius: 11, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <Check size={16} /> Approve
        </button>
      </div>
    </div>
  );
}

function Pending({ T, bookings, blocked, gBlocked, conflictFor, onOpen, onApprove, onDecline, simulate, bookingLink, setupLink, telegramConnected }) {
  const pend = bookings.filter((b) => b.status === "pending");
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };
  return (
    <div className="mu-in">
      {/* Your booking link — share to get bookings */}
      {bookingLink && (
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "13px 14px", marginBottom: 16, boxShadow: T.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.text, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            <Send size={14} style={{ color: T.telegram }} /> Your booking link
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="mu-num" style={{ flex: 1, minWidth: 0, background: T.soft, border: `1px solid ${T.line2}`, borderRadius: 9, padding: "9px 11px", color: T.text2, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bookingLink}</div>
            <button onClick={() => copy(bookingLink)} className="mu-tap" style={{ flexShrink: 0, background: T.primary, color: T.primaryInk, border: "none", borderRadius: 9, padding: "9px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div style={{ color: T.dim, fontSize: 11.5, marginTop: 7 }}>Share this on your IG bio or with students — they tap it to book you.</div>
          {!telegramConnected && setupLink && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}`, fontSize: 12 }}>
              <span style={{ color: T.pending, fontWeight: 600 }}>⚠ Connect your Telegram once</span>
              <span style={{ color: T.text2 }}> so requests reach you: </span>
              <a href={setupLink} target="_blank" rel="noreferrer" style={{ color: T.primary, fontWeight: 600 }}>open setup link →</a>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <h2 className="mu-display" style={{ color: T.text, fontSize: 25, margin: 0 }}>For approval</h2>
        {pend.length > 0 && <span className="mu-num" style={{ color: T.pending, fontSize: 13, fontWeight: 700 }}>{pend.length} waiting</span>}
      </div>
      <p style={{ color: T.text2, fontSize: 13.5, marginTop: 4, marginBottom: 18 }}>
        Machi collected these from your clients on Telegram. Tap a card for details.
      </p>
      {pend.length === 0 && (
        <div style={{ border: `1px dashed ${T.line2}`, borderRadius: 16, padding: 34, textAlign: "center" }}>
          <CheckCircle2 size={30} style={{ color: T.success }} />
          <div style={{ color: T.text, fontWeight: 600, fontSize: 15, marginTop: 10 }}>All caught up, Coach! 🎾</div>
          <div style={{ color: T.dim, fontSize: 13, marginTop: 4 }}>Machi is watching your Telegram. New requests land here.</div>
        </div>
      )}
      {pend.map((b) => (
        <PendingCard key={b.id} T={T} b={b} conflict={conflictFor(b)}
          onOpen={() => onOpen(b)} onApprove={() => onApprove(b.id)} onDecline={() => onDecline(b)} />
      ))}
      {simulate && (
        <button onClick={simulate} style={{
          width: "100%", marginTop: 6, background: "transparent", border: `1px dashed ${T.line2}`,
          color: T.dim, borderRadius: 12, padding: "12px 0", fontSize: 12.5, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Sparkles size={13} /> Demo: simulate a Telegram booking
        </button>
      )}
    </div>
  );
}

/* ----------------------- CALENDAR TAB ----------------------- */
function Calendar({ T, bookings, blocked, gBlocked, toggleBlock, onOpen, startH = 6, endH = 21 }) {
  const days = Array.from({ length: 7 }, (_, i) => d(i));
  const HRS = Array.from({ length: Math.max(1, endH - startH + 1) }, (_, i) => `${String(startH + i).padStart(2, "0")}:00`);
  const [sel, setSel] = useState(days[0]);

  const [openGroups, setOpenGroups] = useState(new Set());
  const nowHour = new Date().getHours();

  const confirmed = bookings.filter((b) => b.date === sel && ["upcoming", "active", "completed"].includes(b.status));
  const pendings = bookings.filter((b) => b.date === sel && b.status === "pending");
  const findIn = (list, h) => list.find((b) => {
    const start = parseInt(b.time, 10), hh = parseInt(h, 10);
    return hh >= start && hh < start + b.dur;
  });
  const slotType = (h) => {
    const bk = findIn(confirmed, h); if (bk) return { type: "booked", data: bk, head: parseInt(bk.time, 10) === parseInt(h, 10) };
    const pd = findIn(pendings, h); if (pd) return { type: "pending", data: pd, head: parseInt(pd.time, 10) === parseInt(h, 10) };
    if (blocked.has(`${sel}_${h}`)) return { type: "blocked", scope: "day" };
    return { type: "free" };
  };

  // build rows, collapsing runs of >=3 free hours
  const rows = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    if (run.length >= 3) rows.push({ kind: "group", hours: [...run] });
    else run.forEach((h) => rows.push({ kind: "free", h }));
    run = [];
  };
  HRS.forEach((h) => {
    const s = slotType(h);
    if (s.type === "free") run.push(h);
    else { flush(); rows.push({ kind: s.type, h, s }); }
  });
  flush();

  const dayCount = (iso) => bookings.filter((b) => b.date === iso && ["upcoming", "active", "pending"].includes(b.status)).length;
  const NowLine = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 8px" }}>
      <span style={{ color: T.declinedDot, fontSize: 10, fontWeight: 700, width: 62, textAlign: "right" }}>NOW</span>
      <div style={{ flex: 1, height: 2, background: T.declinedDot, borderRadius: 9, position: "relative" }}>
        <span style={{ position: "absolute", left: 0, top: -3, width: 8, height: 8, borderRadius: 99, background: T.declinedDot }} />
      </div>
    </div>
  );
  const rowHasNow = (r) => sel === TODAY && (r.kind === "group" ? r.hours.some((h) => parseInt(h) === nowHour) : parseInt(r.h) === nowHour);

  return (
    <div className="mu-in">
      <h2 className="mu-display" style={{ color: T.text, fontSize: 25, margin: 0 }}>Calendar</h2>
      <p style={{ color: T.text2, fontSize: 13.5, marginTop: 4, marginBottom: 14 }}>
        Tap a free slot to block it — Machi won't offer blocked times.
      </p>

      {/* day strip */}
      <div className="mu-noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {days.map((iso) => {
          const dl = DAY_LABEL(iso), on = iso === sel, isToday = iso === TODAY, cnt = dayCount(iso);
          return (
            <button key={iso} onClick={() => setSel(iso)} className="mu-tap" style={{
              minWidth: 58, padding: "10px 0 9px", borderRadius: 14, cursor: "pointer", flexShrink: 0,
              background: on ? T.primary : T.card, border: `1px solid ${on ? T.primary : T.line}`,
              color: on ? T.primaryInk : T.text2, textAlign: "center", position: "relative", boxShadow: on ? T.shadow : "none",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: on ? 0.85 : 1 }}>{isToday ? "Today" : dl.dow}</div>
              <div className="mu-num" style={{ fontSize: 18, fontWeight: 700, marginTop: 1 }}>{dl.day}</div>
              {cnt > 0 && (
                <span className="mu-num" style={{
                  position: "absolute", top: 6, right: 8, fontSize: 9, fontWeight: 700,
                  background: on ? T.primaryInk : T.primary, color: on ? T.primary : T.primaryInk,
                  borderRadius: 99, minWidth: 14, height: 14, lineHeight: "14px", padding: "0 3px",
                }}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* blocking control */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "12px 14px", margin: "12px 0 14px", boxShadow: T.shadow }}>
        <div style={{ color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <CalendarClock size={15} style={{ color: T.accent }} /> Block time off
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.text2, fontSize: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: T.accent, flexShrink: 0 }} />
          <span>Tap a free slot below to block it on <b style={{ color: T.text }}>{sel === TODAY ? "today" : DAY_LABEL(sel).full}</b>. Machi won't offer blocked times.</span>
        </div>
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 12, paddingLeft: 2 }}>
        {[["Booked", T.activeDot], ["Pending", T.pendingDot], ["Blocked", T.dim]].map(([l, c]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 6, color: T.dim, fontSize: 11.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} /> {l}
          </span>
        ))}
      </div>

      {/* slots */}
      <div>
        {rows.map((r, i) => {
          const now = rowHasNow(r);
          if (r.kind === "booked") {
            const bk = r.s.data; if (!r.s.head) return null;
            return (
              <div key={i}>
                {now && <NowLine />}
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div className="mu-num" style={{ width: 62, color: T.text2, fontSize: 12, paddingTop: 13, flexShrink: 0, textAlign: "right" }}>{fmt12(bk.time)}</div>
                  <div onClick={() => onOpen(bk)} className="mu-tap" style={{ flex: 1, background: T.card, border: `1px solid ${T.line}`, borderLeft: `4px solid ${T.activeDot}`, borderRadius: 12, padding: "11px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, boxShadow: T.shadow }}>
                    <Avatar name={bk.client} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{bk.client}</span>
                        <span style={{ background: T.activeBg, color: T.active, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>Booked</span>
                      </div>
                      <div className="mu-num" style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>{fmtRange(bk.time, bk.dur)} · {bk.note}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: T.dim }} />
                  </div>
                </div>
              </div>
            );
          }
          if (r.kind === "pending") {
            const pd = r.s.data; if (!r.s.head) return null;
            return (
              <div key={i}>
                {now && <NowLine />}
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div className="mu-num" style={{ width: 62, color: T.text2, fontSize: 12, paddingTop: 13, flexShrink: 0, textAlign: "right" }}>{fmt12(pd.time)}</div>
                  <div onClick={() => onOpen(pd)} className="mu-tap" style={{ flex: 1, border: `1.5px dashed ${T.pendingDot}`, background: T.pendingBg, borderRadius: 12, padding: "11px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 11 }}>
                    <Avatar name={pd.client} size={34} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{pd.client}</span>
                      <div style={{ color: T.pending, fontSize: 12, marginTop: 2 }}>Awaiting your approval</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          if (r.kind === "blocked") {
            return (
              <div key={i}>
                {now && <NowLine />}
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div className="mu-num" style={{ width: 62, color: T.dim, fontSize: 12, paddingTop: 13, flexShrink: 0, textAlign: "right" }}>{fmt12(r.h)}</div>
                  <button onClick={() => toggleBlock(sel, r.h)} className="mu-tap" style={{
                    flex: 1, borderRadius: 12, cursor: "pointer", border: `1px solid ${T.line2}`,
                    background: `repeating-linear-gradient(45deg, ${T.card2}, ${T.card2} 6px, ${T.soft} 6px, ${T.soft} 12px)`,
                    color: T.dim, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px 0",
                  }}>
                    <Ban size={13} />
                    Blocked — tap to free
                  </button>
                </div>
              </div>
            );
          }
          if (r.kind === "free") {
            return (
              <div key={i}>
                {now && <NowLine />}
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div className="mu-num" style={{ width: 62, color: T.dim, fontSize: 12, paddingTop: 12, flexShrink: 0, textAlign: "right" }}>{fmt12(r.h)}</div>
                  <button onClick={() => toggleBlock(sel, r.h, mode)} className="mu-tap" style={{ flex: 1, borderRadius: 12, cursor: "pointer", border: `1px dashed ${T.line2}`, background: "transparent", color: T.dim, fontSize: 12.5, padding: "12px 0" }}>Available</button>
                </div>
              </div>
            );
          }
          // group of free hours
          const isOpen = openGroups.has(r.hours[0]);
          const first = r.hours[0], last = r.hours[r.hours.length - 1];
          return (
            <div key={i}>
              {now && <NowLine />}
              {!isOpen ? (
                <button onClick={() => setOpenGroups((s) => new Set(s).add(first))} className="mu-tap" style={{
                  width: "100%", borderRadius: 12, cursor: "pointer", border: `1px dashed ${T.line}`, background: "transparent",
                  color: T.dim, fontSize: 12.5, padding: "11px 12px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <span className="mu-num">{fmt12(first)} – {fmt12(last)}</span> · open ({r.hours.length} slots) <ChevronDown size={14} />
                </button>
              ) : (
                r.hours.map((h) => (
                  <div key={h} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div className="mu-num" style={{ width: 62, color: T.dim, fontSize: 12, paddingTop: 12, flexShrink: 0, textAlign: "right" }}>{fmt12(h)}</div>
                    <button onClick={() => toggleBlock(sel, h)} className="mu-tap" style={{ flex: 1, borderRadius: 12, cursor: "pointer", border: `1px dashed ${T.line2}`, background: "transparent", color: T.dim, fontSize: 12.5, padding: "12px 0" }}>Available</button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------- BOOKINGS TAB ----------------------- */
function Bookings({ T, bookings, onOpen }) {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const FILTERS = ["All", "Upcoming", "Active", "Completed", "Declined"];
  const list = bookings
    .filter((b) => b.status !== "pending")
    .filter((b) => filter === "All" || b.status === filter.toLowerCase())
    .filter((b) => b.client.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  return (
    <div className="mu-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="mu-display" style={{ color: T.text, fontSize: 25, margin: 0 }}>All bookings</h2>
        <span style={{ color: T.dim, fontSize: 11, fontWeight: 600, border: `1px solid ${T.line}`, borderRadius: 99, padding: "4px 11px", display: "flex", alignItems: "center", gap: 5 }}>
          <Star size={11} style={{ color: T.accent }} /> {COACH.sport} coach
        </span>
      </div>
      <div style={{ position: "relative", marginTop: 14 }}>
        <Search size={16} style={{ position: "absolute", left: 13, top: 13, color: T.dim }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client name" className="mu-focus" style={{
          width: "100%", boxSizing: "border-box", background: T.card, border: `1px solid ${T.line2}`, borderRadius: 11,
          padding: "11px 14px 11px 40px", color: T.text, fontSize: 14, outline: "none", "--ring": T.primary + "33", "--ringb": T.primary,
        }} />
      </div>
      <div className="mu-noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "12px 0 8px", paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="mu-tap" style={{
            padding: "8px 15px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            background: filter === f ? T.primary : "transparent", border: `1px solid ${filter === f ? T.primary : T.line2}`,
            color: filter === f ? T.primaryInk : T.text2,
          }}>{f}</button>
        ))}
      </div>
      <div style={{ color: T.dim, fontSize: 12, margin: "6px 2px 14px" }}>{list.length} booking{list.length !== 1 ? "s" : ""} · newest first</div>
      {list.length === 0 && (
        <div style={{ border: `1px dashed ${T.line2}`, borderRadius: 16, padding: 30, textAlign: "center", color: T.dim, fontSize: 13 }}>
          {q ? `No bookings found for "${q}".` : "No bookings here yet."}
        </div>
      )}
      {list.map((b) => {
        const dl = DAY_LABEL(b.date);
        const past = b.status === "completed" || b.status === "declined";
        return (
          <div key={b.id} onClick={() => onOpen(b)} className="mu-tap" style={{
            background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 13, marginBottom: 10,
            opacity: past ? 0.92 : 1, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", boxShadow: T.shadow,
          }}>
            <Avatar name={b.client} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 14.5 }}>{b.client}</div>
              <div className="mu-num" style={{ color: T.dim, fontSize: 12, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                {past ? <History size={12} /> : <Clock size={12} />} {dl.short} · {fmtRange(b.time, b.dur)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <Badge T={T} status={b.status} />
              <span style={{ color: T.dim, fontSize: 10 }}>via {b.via}</span>
            </div>
            <ChevronRight size={16} style={{ color: T.dim, flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------- DETAIL SHEET ----------------------- */
function DetailSheet({ T, booking, suggestion, rate = COACH.rate, onClose, onApprove, onDecline, onSuggest, onComplete, onNoShow }) {
  if (!booking) return null;
  const b = booking, dl = DAY_LABEL(b.date);
  const Row = ({ icon: Icon, label, value, color }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${T.line}` }}>
      <Icon size={16} style={{ color: T.dim }} />
      <span style={{ color: T.text2, fontSize: 13, flex: 1 }}>{label}</span>
      <span style={{ color: color || T.text, fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
  return (
    <Sheet T={T} open={!!booking} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Avatar name={b.client} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 18 }}>{b.client}</div>
          <a style={{ color: T.telegram, fontSize: 13, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <Send size={12} /> {b.tg}
          </a>
        </div>
        <Badge T={T} status={b.status} />
      </div>

      {b.note && b.status === "pending" && (
        <div style={{ background: T.soft, borderRadius: 12, padding: "10px 13px", color: T.text2, fontSize: 13.5, fontStyle: "italic", marginBottom: 6 }}>
          <MessageCircle size={13} style={{ color: T.dim, marginRight: 6, verticalAlign: -2 }} />"{b.note}"
        </div>
      )}
      <Row icon={CalendarDays} label="When" value={`${dl.full}`} />
      <Row icon={Clock} label="Time" value={`${fmtRange(b.time, b.dur)} (${b.dur}h)`} />
      <Row icon={ListChecks} label="Session" value={b.note?.includes("·") ? b.note.split("· ")[1] : COACH.sport} />
      <Row icon={Wallet} label="Payment"
        value={b.paid ? "Paid" : "Unpaid"} color={b.paid ? T.success : T.pending} />
      <Row icon={Wallet} label="Amount" value={peso(b.amount || rate * b.dur)} />
      <Row icon={Send} label="Source" value={`via ${b.via}`} />

      {b.status === "pending" && suggestion && (
        <div style={{ marginTop: 14, background: T.declinedBg, borderRadius: 12, padding: "11px 13px" }}>
          <div style={{ color: T.declined, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
            <AlertTriangle size={14} /> Conflicts with another booking
          </div>
          <button onClick={onSuggest} className="mu-tap" style={{ width: "100%", marginTop: 10, background: T.card, border: `1px solid ${T.line2}`, color: T.text, borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <Sparkles size={14} style={{ color: T.accent }} /> Suggest {fmt12(suggestion)} instead
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
        {b.status === "pending" && (<>
          <button onClick={() => onDecline(b)} className="mu-tap" style={{ flex: 1, background: "transparent", border: `1px solid ${T.line2}`, color: T.text2, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><X size={16} /> Decline</button>
          <button onClick={() => { onApprove(b.id); onClose(); }} className="mu-tap" style={{ flex: 1.4, background: T.accent, border: "none", color: T.accentInk, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Check size={16} /> Approve</button>
        </>)}
        {(b.status === "upcoming" || b.status === "active") && (<>
          <button onClick={() => { onNoShow(b.id); onClose(); }} className="mu-tap" style={{ flex: 1, background: "transparent", border: `1px solid ${T.line2}`, color: T.declined, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>No-show</button>
          <button onClick={() => { onComplete(b.id); onClose(); }} className="mu-tap" style={{ flex: 1.4, background: T.primary, border: "none", color: T.primaryInk, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><CheckCircle2 size={16} /> Mark complete</button>
        </>)}
        {(b.status === "completed" || b.status === "declined") && (
          <button onClick={onClose} className="mu-tap" style={{ flex: 1, background: T.soft, border: `1px solid ${T.line}`, color: T.text2, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Close</button>
        )}
      </div>
    </Sheet>
  );
}

/* ----------------------- CONFIRM DECLINE ----------------------- */
function ConfirmDecline({ T, booking, onClose, onConfirm }) {
  if (!booking) return null;
  return (
    <Sheet T={T} open={!!booking} onClose={onClose}>
      <div style={{ textAlign: "center", padding: "4px 6px 0" }}>
        <div style={{ width: 52, height: 52, borderRadius: 99, background: T.declinedBg, color: T.declined, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <X size={26} />
        </div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 18 }}>Decline {booking.client.split(" ")[0]}'s request?</div>
        <p style={{ color: T.text2, fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>
          Machi will let them know politely and offer other open slots. You can undo right after, or restore it later from the Declined tab.
        </p>
        <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
          <button onClick={onClose} className="mu-tap" style={{ flex: 1, background: T.soft, border: `1px solid ${T.line2}`, color: T.text, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Keep it</button>
          <button onClick={onConfirm} className="mu-tap" style={{ flex: 1, background: T.declined, border: "none", color: "#fff", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Yes, decline</button>
        </div>
      </div>
    </Sheet>
  );
}

/* ----------------------- SETTINGS ----------------------- */
function SettingsSheet({ T, open, onClose, onTheme, rate, startH, endH, onSave, onLogout, bookingLink, coachName, coachSlug }) {
  // local draft state so edits only apply on Save
  const [r, setR] = useState(rate);
  const [s, setS] = useState(startH);
  const [e, setE] = useState(endH);
  const [remind, setRemind] = useState(true);
  useEffect(() => { setR(rate); setS(startH); setE(endH); }, [rate, startH, endH, open]);
  if (!open) return null;

  const inputStyle = {
    boxSizing: "border-box", background: T.soft, border: `1px solid ${T.line2}`,
    borderRadius: 9, padding: "9px 11px", color: T.text, fontSize: 14, outline: "none",
    "--ring": T.primary + "33", "--ringb": T.primary,
  };
  const hourOpts = Array.from({ length: 19 }, (_, i) => 5 + i); // 5AM..11PM
  const Block = ({ icon: Icon, title, sub, children }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderTop: `1px solid ${T.line}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: T.soft, color: T.text2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={16} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ color: T.dim, fontSize: 12, marginBottom: 8 }}>{sub}</div>}
        {children}
      </div>
    </div>
  );
  const changed = r !== rate || s !== startH || e !== endH;

  return (
    <Sheet T={T} open={open} onClose={onClose}>
      <h3 className="mu-display" style={{ color: T.text, fontSize: 20, margin: "0 0 4px" }}>Settings</h3>

      <Block icon={Wallet} title="Session rate" sub="What Machi quotes clients per hour.">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: T.text2, fontSize: 15, fontWeight: 600 }}>{COACH.currency}</span>
          <input className="mu-focus" type="number" min="0" step="50" value={r}
            onChange={(ev) => setR(Math.max(0, parseInt(ev.target.value || "0", 10)))}
            style={{ ...inputStyle, width: 120 }} />
          <span style={{ color: T.dim, fontSize: 13 }}>/ hour</span>
        </div>
      </Block>

      <Block icon={Clock} title="Working hours" sub="Machi only offers slots inside these hours.">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select className="mu-focus" value={s} onChange={(ev) => setS(Math.min(parseInt(ev.target.value, 10), e - 1))} style={{ ...inputStyle, cursor: "pointer" }}>
            {hourOpts.filter((h) => h < e).map((h) => <option key={h} value={h}>{fmt12(`${String(h).padStart(2, "0")}:00`)}</option>)}
          </select>
          <span style={{ color: T.dim, fontSize: 13 }}>to</span>
          <select className="mu-focus" value={e} onChange={(ev) => setE(Math.max(parseInt(ev.target.value, 10), s + 1))} style={{ ...inputStyle, cursor: "pointer" }}>
            {hourOpts.filter((h) => h > s).map((h) => <option key={h} value={h}>{fmt12(`${String(h).padStart(2, "0")}:00`)}</option>)}
          </select>
        </div>
      </Block>

      <Block icon={Send} title="Telegram" sub="Connected · @MachiMatchUpBot">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.success, background: T.activeBg, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 99 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: T.activeDot }} /> Connected
        </span>
      </Block>

      <Block icon={CalendarPlus} title="Reminders" sub="Auto-remind clients 1 day & 1 hr before.">
        <button onClick={() => setRemind((v) => !v)} className="mu-tap" aria-label="Toggle reminders"
          style={{ width: 46, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: remind ? T.success : T.line2, position: "relative", transition: "background .15s" }}>
          <span style={{ position: "absolute", top: 3, left: remind ? 23 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .15s" }} />
        </button>
      </Block>

      <Block icon={T.name === "dark" ? Sun : Moon} title="Appearance" sub={T.name === "dark" ? "Dark (gold)" : "Light"}>
        <button onClick={onTheme} className="mu-tap" style={{ background: T.soft, border: `1px solid ${T.line2}`, color: T.text, borderRadius: 99, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Switch to {T.name === "dark" ? "light" : "dark"}
        </button>
      </Block>

      <button onClick={() => { onSave({ rate: r, startH: s, endH: e }); onClose(); }} disabled={!changed} className="mu-tap"
        style={{ width: "100%", marginTop: 16, background: changed ? T.primary : T.soft, color: changed ? T.primaryInk : T.dim,
          border: changed ? "none" : `1px solid ${T.line2}`, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700,
          cursor: changed ? "pointer" : "default" }}>
        {changed ? "Save changes" : "Saved"}
      </button>

      {bookingLink && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
          <div style={{ color: T.text2, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Your booking link</div>
          <div className="mu-num" style={{ background: T.soft, border: `1px solid ${T.line2}`, borderRadius: 9, padding: "9px 11px", color: T.text2, fontSize: 12, wordBreak: "break-all" }}>{bookingLink}</div>
          <button onClick={() => navigator.clipboard?.writeText(bookingLink)} className="mu-tap" style={{ marginTop: 8, background: T.soft, border: `1px solid ${T.line2}`, color: T.text, borderRadius: 9, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Copy link</button>
        </div>
      )}

      {onLogout && (
        <button onClick={onLogout} className="mu-tap"
          style={{ width: "100%", marginTop: 16, background: "transparent", color: T.declined,
            border: `1px solid ${T.declined}44`, borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Log out{coachName ? ` — ${coachName}` : ""}
        </button>
      )}
    </Sheet>
  );
}

/* ----------------------- NOTIFICATIONS ----------------------- */
function NotifSheet({ T, open, onClose, items }) {
  if (!open) return null;
  return (
    <Sheet T={T} open={open} onClose={onClose}>
      <h3 className="mu-display" style={{ color: T.text, fontSize: 20, margin: "0 0 10px" }}>Activity</h3>
      {items.length === 0 && <div style={{ color: T.dim, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Nothing new.</div>}
      {items.map((n, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "11px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: T.primary, marginTop: 6, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 13.5 }}>{n.msg}</div>
            <div style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>{n.when}</div>
          </div>
        </div>
      ))}
    </Sheet>
  );
}

/* ----------------------- APP SHELL ----------------------- */
export default function MatchUpCoach() {
  const [themeName, setThemeName] = useState("dark");
  const T = THEMES[themeName];
  const toggleTheme = () => setThemeName((n) => (n === "light" ? "dark" : "light"));

  // ---- auth + profile ----
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);      // the coach row
  const [loadingData, setLoadingData] = useState(false);

  // ---- live data ----
  const [tab, setTab] = useState("pending");
  const [bookings, setBookings] = useState([]);
  const [blocked, setBlocked] = useState(new Set());
  const gBlocked = useMemo(() => new Set(), []);       // no recurring blocks in this schema
  const [toast, setToast] = useState(null);
  const [rate, setRate] = useState(800);
  const [startH, setStartH] = useState(6);
  const [endH, setEndH] = useState(21);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const rateRef = useRef(800);
  useEffect(() => { rateRef.current = rate; }, [rate]);

  // listen to auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // load this coach's data
  async function loadData(coach) {
    const r = coach.rate ?? 800;
    const [{ data: bk }, { data: bl }] = await Promise.all([
      supabase.from("bookings").select("*").eq("coach_id", coach.id).order("date").order("time"),
      supabase.from("blocked_slots").select("*").eq("coach_id", coach.id),
    ]);
    setBookings((bk || []).map((row) => mapBooking(row, r)));
    setBlocked(new Set((bl || []).map((x) => `${x.date}_${String(x.hour).slice(0, 5)}`)));
  }

  // when session changes, fetch the coach profile + data
  useEffect(() => {
    if (!session) { setProfile(null); setBookings([]); setBlocked(new Set()); return; }
    let cancel = false;
    (async () => {
      setLoadingData(true);
      const { data: coach } = await supabase.from("coaches").select("*").eq("user_id", session.user.id).maybeSingle();
      if (cancel) return;
      setProfile(coach || null);
      if (coach) {
        setRate(coach.rate ?? 800); setStartH(coach.start_hour ?? 6); setEndH(coach.end_hour ?? 21);
        await loadData(coach);
      }
      setLoadingData(false);
    })();
    return () => { cancel = true; };
  }, [session]);

  // realtime: refetch when this coach's bookings change (e.g. a new Telegram booking)
  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel(`bk-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `coach_id=eq.${profile.id}` },
        () => loadData(profile))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- conflict / suggestion helpers ----
  const live = bookings.filter((b) => ["upcoming", "active"].includes(b.status));
  const conflictFor = (p) => {
    const hit = live.find((b) => overlaps(p, b));
    if (hit) return `Overlaps with ${hit.client} (${fmt12(hit.time)})`;
    for (let h = parseInt(p.time, 10); h < parseInt(p.time, 10) + p.dur; h++) {
      const hh = `${String(h).padStart(2, "0")}:00`;
      if (blocked.has(`${p.date}_${hh}`)) return "Falls on a blocked time slot";
    }
    return null;
  };
  const suggestFor = (p) => {
    if (!p || !conflictFor(p)) return null;
    for (let h = startH; h <= endH - p.dur; h++) {
      const cand = { ...p, time: `${String(h).padStart(2, "0")}:00` };
      if (!conflictFor(cand)) return cand.time;
    }
    return null;
  };

  // ---- actions (persist to Supabase + notify the client on Telegram) ----
  const setLocal = (id, patch) => setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const approve = async (id) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setLocal(id, { status: "upcoming" });
    await supabase.from("bookings").update({ status: "upcoming", notified: false }).eq("id", id);
    notifyBot(id);
    setToast({
      msg: `Approved — Machi messaged ${b.client.split(" ")[0]}: "Confirmed na po! 🎾"`,
      undo: async () => { setLocal(id, { status: "pending" }); await supabase.from("bookings").update({ status: "pending", notified: false }).eq("id", id); setToast(null); },
    });
  };
  const doDecline = async (id) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setLocal(id, { status: "declined" });
    setConfirm(null); setDetail(null);
    await supabase.from("bookings").update({ status: "declined", notified: false }).eq("id", id);
    notifyBot(id);
    setToast({
      msg: `Declined ${b.client.split(" ")[0]} — Machi let them know`,
      undo: async () => { setLocal(id, { status: "pending" }); await supabase.from("bookings").update({ status: "pending", notified: false }).eq("id", id); setToast(null); },
    });
  };
  const complete = async (id) => {
    setLocal(id, { status: "completed" }); setDetail(null);
    await supabase.from("bookings").update({ status: "completed" }).eq("id", id);
    setToast({ msg: "Marked complete ✅", undo: null });
  };
  const noShow = async (id) => {
    const b = bookings.find((x) => x.id === id);
    setLocal(id, { status: "declined" }); setDetail(null);
    await supabase.from("bookings").update({ status: "declined" }).eq("id", id);
    setToast({ msg: `${b ? b.client.split(" ")[0] : "Client"} marked as no-show`, undo: null });
  };
  const suggestSlot = async (p) => {
    const t = suggestFor(p); if (!t) return;
    setLocal(p.id, { time: t });
    setDetail((dd) => (dd ? { ...dd, time: t } : dd));
    await supabase.from("bookings").update({ time: `${t}:00` }).eq("id", p.id);
    setToast({ msg: `Moved ${p.client.split(" ")[0]} to ${fmt12(t)} 🤝`, undo: null });
  };

  const toggleBlock = async (sel, h) => {
    if (!profile) return;
    const key = `${sel}_${h}`;
    const hourFull = `${h}:00`; // "07:00" -> "07:00:00"
    if (blocked.has(key)) {
      setBlocked((s) => { const n = new Set(s); n.delete(key); return n; });
      await supabase.from("blocked_slots").delete().eq("coach_id", profile.id).eq("date", sel).eq("hour", hourFull);
    } else {
      setBlocked((s) => new Set(s).add(key));
      await supabase.from("blocked_slots").insert({ coach_id: profile.id, date: sel, hour: hourFull });
    }
  };

  const saveSettings = async ({ rate: nr, startH: ns, endH: ne }) => {
    setRate(nr); setStartH(ns); setEndH(ne);
    const wh = `${fmt12(`${String(ns).padStart(2, "0")}:00`)} - ${fmt12(`${String(ne).padStart(2, "0")}:00`)}`;
    if (profile) {
      await supabase.from("coaches").update({ rate: nr, start_hour: ns, end_hour: ne, working_hours: wh }).eq("id", profile.id);
      setProfile((p) => ({ ...p, rate: nr, start_hour: ns, end_hour: ne, working_hours: wh }));
    }
    setBookings((bs) => bs.map((b) => ({ ...b, amount: nr * b.dur })));
    setToast({ msg: `Settings saved — ${peso(nr)}/hr · ${wh}`, undo: null });
  };

  const logout = async () => { setShowSettings(false); await supabase.auth.signOut(); };

  // ---- gates ----
  if (authLoading) return (<><style>{FONTS}</style><div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 14 }}>Loading…</div></>);
  if (!session) return (<><style>{FONTS}</style><AuthScreen T={T} onTheme={toggleTheme} /></>);
  if (loadingData && !profile) return (<><style>{FONTS}</style><div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 14 }}>Setting up your console…</div></>);
  if (!profile) return (<><style>{FONTS}</style><div className="mu-body" style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, padding: 24, textAlign: "center" }}>
    <div style={{ color: T.text, fontWeight: 700, fontSize: 18 }}>Almost there</div>
    <div style={{ color: T.text2, fontSize: 14, maxWidth: 320 }}>Your account is missing a coach profile. Log out and sign up again, or add a coaches row in Supabase with your user_id.</div>
    <button onClick={logout} className="mu-tap" style={{ background: T.primary, color: T.primaryInk, border: "none", borderRadius: 11, padding: "11px 22px", fontWeight: 700, cursor: "pointer" }}>Log out</button>
  </div></>);

  // ---- derived header ----
  const coachName = profile.name || "Coach";
  const coachFirst = coachName.replace(/^coach\s+/i, "").split(" ")[0];
  const botUser = String(BOT_USERNAME).trim().replace(/^@/, "").replace(/\s+/g, "");
  const bookingLink = `https://t.me/${botUser}?start=${profile.slug}`;
  const setupLink = `https://t.me/${botUser}?start=setup_${profile.slug}`;
  const telegramConnected = !!profile.telegram_chat_id;

  const pendCount = bookings.filter((b) => b.status === "pending").length;
  const todays = bookings.filter((b) => b.date === TODAY && ["upcoming", "active"].includes(b.status)).sort((a, b) => (a.time < b.time ? -1 : 1));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
  const nowH = `${String(hour).padStart(2, "0")}:00`;
  const next = todays.find((b) => b.time >= nowH);
  const sessionLine = todays.length === 0 ? "No sessions today — rest day 💤"
    : `${todays.length} session${todays.length > 1 ? "s" : ""} today${next ? ` · next ${fmt12(next.time)}` : " · all done"}`;
  const todayLine = pendCount > 0 ? `${sessionLine}  ·  ${pendCount} request${pendCount > 1 ? "s" : ""} waiting` : sessionLine;

  // notifications derived from real data (latest pending requests)
  const notifs = bookings
    .filter((b) => b.status === "pending")
    .slice(-6).reverse()
    .map((b) => ({ msg: `New booking request from ${b.client}.`, when: b.ago }));

  const TABS = [
    { id: "pending", label: "Pending", icon: Inbox, badge: pendCount },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "bookings", label: "Bookings", icon: ListChecks },
  ];

  return (
    <div className="mu-body" style={{ background: T.bg, minHeight: "100vh" }}>
      <style>{FONTS}</style>
      <div style={{ background: T.bg, minHeight: "100vh", maxWidth: 460, margin: "0 auto", position: "relative", display: "flex", flexDirection: "column", borderLeft: `1px solid ${T.line}`, borderRight: `1px solid ${T.line}` }}>

        {/* header */}
        <div style={{ padding: "14px 16px 13px", borderBottom: `1px solid ${T.line}`, background: T.bg, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Brand T={T} size={38} />
              <div style={{ minWidth: 0 }}>
                <div className="mu-display" style={{ color: T.text, fontSize: 16, lineHeight: 1.1 }}>{greet}, {coachName}</div>
                <div className="mu-num" style={{ color: T.text2, fontSize: 11, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{todayLine}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setShowNotif(true)} className="mu-tap" aria-label="Activity" style={{ background: "none", border: "none", color: T.text2, cursor: "pointer", padding: 8, position: "relative" }}>
                <Bell size={18} />
                {notifs.length > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 99, background: T.declinedDot }} />}
              </button>
              <button onClick={() => setShowSettings(true)} className="mu-tap" aria-label="Settings" style={{ background: "none", border: "none", color: T.text2, cursor: "pointer", padding: 8 }}>
                <Settings size={18} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            {telegramConnected ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.success, background: T.activeBg, padding: "4px 10px", borderRadius: 99 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: T.activeDot, animation: "mu-pulse 1.8s infinite" }} /> Machi online
                </span>
                <span style={{ color: T.dim, fontSize: 11 }}>watching your Telegram</span>
              </>
            ) : (
              <a href={setupLink} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.pending, background: T.pendingBg || T.soft, padding: "4px 10px", borderRadius: 99, textDecoration: "none" }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: T.pendingDot }} /> Connect your Telegram →
              </a>
            )}
          </div>
        </div>

        {/* content */}
        <div className="mu-noscroll" style={{ flex: 1, overflowY: "auto", padding: "18px 16px 96px" }}>
          {tab === "pending" && <Pending T={T} bookings={bookings} blocked={blocked} gBlocked={gBlocked} conflictFor={conflictFor} onOpen={setDetail} onApprove={approve} onDecline={setConfirm} bookingLink={bookingLink} setupLink={setupLink} telegramConnected={telegramConnected} />}
          {tab === "calendar" && <Calendar T={T} bookings={bookings} blocked={blocked} gBlocked={gBlocked} toggleBlock={toggleBlock} onOpen={setDetail} startH={startH} endH={endH} />}
          {tab === "bookings" && <Bookings T={T} bookings={bookings} onOpen={setDetail} />}
        </div>

        {/* toast */}
        {toast && (
          <div className="mu-up" style={{ position: "fixed", bottom: 92, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 36px)", maxWidth: 424, background: T.name === "dark" ? T.card2 : "#1F2329", border: `1px solid ${T.name === "dark" ? T.line2 : "#2C3138"}`, borderRadius: 13, padding: "12px 14px", color: "#F5F6F7", fontSize: 13, display: "flex", gap: 9, alignItems: "center", boxShadow: T.shadowLg, zIndex: 55 }}>
            <BadgeCheckLite color={T.primary} />
            <span style={{ flex: 1, lineHeight: 1.35 }}>{toast.msg}</span>
            {toast.undo && (
              <button onClick={toast.undo} className="mu-tap" style={{ background: "#ffffff1A", border: "1px solid #ffffff33", color: "#fff", borderRadius: 9, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <Undo2 size={13} /> Undo
              </button>
            )}
          </div>
        )}

        {/* bottom nav */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 460, background: T.bg, borderTop: `1px solid ${T.line}`, display: "flex", padding: "9px 8px 13px", zIndex: 40 }}>
          {TABS.map(({ id, label, icon: Icon, badge }) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} className="mu-tap" style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: on ? T.primary : T.dim, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", padding: "5px 0" }}>
                <Icon size={21} strokeWidth={on ? 2.4 : 2} />
                <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 600 }}>{label}</span>
                {badge > 0 && <span className="mu-num" style={{ position: "absolute", top: -3, right: "26%", background: T.declinedDot, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "0px 5px", lineHeight: "16px", minWidth: 16, textAlign: "center" }}>{badge}</span>}
              </button>
            );
          })}
        </div>

        {/* sheets */}
        <DetailSheet T={T} booking={detail} suggestion={detail ? suggestFor(detail) : null} rate={rate} onClose={() => setDetail(null)} onApprove={approve} onDecline={setConfirm} onSuggest={() => suggestSlot(detail)} onComplete={complete} onNoShow={noShow} />
        <ConfirmDecline T={T} booking={confirm} onClose={() => setConfirm(null)} onConfirm={() => doDecline(confirm.id)} />
        <SettingsSheet T={T} open={showSettings} onClose={() => setShowSettings(false)} onTheme={toggleTheme}
          rate={rate} startH={startH} endH={endH} onSave={saveSettings}
          onLogout={logout} bookingLink={bookingLink} coachName={coachName} coachSlug={profile.slug} />
        <NotifSheet T={T} open={showNotif} onClose={() => setShowNotif(false)} items={notifs} />
      </div>
    </div>
  );
}

function BadgeCheckLite({ color }) {
  return <CheckCircle2 size={17} style={{ color, flexShrink: 0 }} />;
}
