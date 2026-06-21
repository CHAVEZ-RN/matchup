import { useState, useEffect, useMemo, useRef } from "react";
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
    bg: "#FAFAF7", card: "#FFFFFF", card2: "#F3F3EF", soft: "#F7F6F2",
    line: "#E8E6DF", line2: "#D7D5CC",
    primary: "#2D6CDF", primaryInk: "#FFFFFF", primarySoft: "#E9F0FD",
    accent: "#C2922E", accentSoft: "#F8EFD8",
    text: "#191C20", text2: "#51575F", dim: "#8A8F98",
    telegram: "#229ED9",
    pending: "#9A6B12", pendingBg: "#FBF0D8", pendingDot: "#E2A226",
    upcoming: "#1F5BC4", upcomingBg: "#E7EFFD", upcomingDot: "#3B82F6",
    active: "#157F3C", activeBg: "#E6F6EC", activeDot: "#22C55E",
    completed: "#5A6068", completedBg: "#EFEFEC", completedDot: "#9AA0A8",
    declined: "#C32A2A", declinedBg: "#FBE9E9", declinedDot: "#EF4444",
    success: "#157F3C",
    shadow: "0 1px 2px rgba(16,24,40,.05), 0 2px 8px rgba(16,24,40,.06)",
    shadowLg: "0 10px 40px rgba(16,24,40,.16)",
    overlay: "rgba(20,22,26,.40)",
  },
  dark: {
    name: "dark",
    bg: "#14110D", card: "#1C1A15", card2: "#23201A", soft: "#1A1712",
    line: "#312C22", line2: "#403A2D",
    primary: "#E5B45B", primaryInk: "#1A1504", primarySoft: "#2A2316",
    accent: "#2DD4BF", accentSoft: "#10241F",
    text: "#F2EEE6", text2: "#CFC8B9", dim: "#9A9285",
    telegram: "#3BA7E0",
    pending: "#E8BE6A", pendingBg: "#2A2316", pendingDot: "#E5B45B",
    upcoming: "#8FB2E8", upcomingBg: "#162130", upcomingDot: "#5B8DE0",
    active: "#6FD295", activeBg: "#13241A", activeDot: "#4FC383",
    completed: "#AFA796", completedBg: "#221F19", completedDot: "#8E8775",
    declined: "#E68C7C", declinedBg: "#2A1714", declinedDot: "#E07A66",
    success: "#6FD295",
    shadow: "0 6px 24px rgba(0,0,0,.45)",
    shadowLg: "0 16px 50px rgba(0,0,0,.6)",
    overlay: "rgba(0,0,0,.55)",
  },
};

const COACH = { name: "Rio", sport: "Tennis", rate: 800, currency: "₱" };

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@400;500;600;700&display=swap');
*{ -webkit-tap-highlight-color: transparent; }
.mu-display { font-family: 'Marcellus', Georgia, serif; letter-spacing: 0.01em; }
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
const SEED = [
  { id: 1, client: "Andrea Reyes",  tg: "@andrea_r",  date: d(0),  time: "07:00", dur: 1, status: "active",    via: "Machi",  note: `${S} · fundamentals`, paid: true,  amount: 800 },
  { id: 2, client: "JM dela Cruz",  tg: "@jm_dc",     date: d(0),  time: "16:00", dur: 1, status: "upcoming",  via: "Machi",  note: `${S} · serve drills`, paid: false, amount: 800 },
  { id: 3, client: "Miguel Santos", tg: "@miguels",   date: d(1),  time: "09:00", dur: 2, status: "pending",   via: "Machi",  note: "pwede po ba sat 9am, 2 hrs?", ago: "4 min ago", amount: 1600 },
  { id: 4, client: "Kayla Lim",     tg: "@kaylalim",  date: d(0),  time: "16:00", dur: 1, status: "pending",   via: "Machi",  note: "gusto ko sana 4pm po today", ago: "12 min ago", amount: 800 },
  { id: 5, client: "Paolo Garcia",  tg: "@paolog",    date: d(-1), time: "08:00", dur: 1, status: "completed", via: "Machi",  note: `${S} · footwork`, paid: true,  amount: 800 },
  { id: 6, client: "Bea Tan",       tg: "@beatan",    date: d(-3), time: "17:00", dur: 1, status: "completed", via: "Manual", note: `${S} · conditioning`, paid: true, amount: 800 },
  { id: 7, client: "Carlos Uy",     tg: "@carlosuy",  date: d(3),  time: "10:00", dur: 1, status: "upcoming",  via: "Machi",  note: `${S} · first session`, paid: false, amount: 800 },
];
const NEW_REQUESTS = [
  { client: "Trisha Mendoza", tg: "@trisham", note: "hi po! free pa po ba bukas morning?", time: "08:00", dOff: 1, dur: 1 },
  { client: "Ken Villanueva", tg: "@kenv",    note: "coach pa-book ng sunday 4pm 🙏",      time: "16:00", dOff: 4, dur: 1 },
  { client: "Liza Fernandez", tg: "@lizaf",   note: "2 hours sana, weekend po",            time: "14:00", dOff: 5, dur: 2 },
];

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
      background: T.primary, display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: T.shadow,
    }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"
          fill={T.primaryInk} opacity="0.95" />
        <path d="M8.5 10.2l2.3 2.3 4.7-4.7" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Login({ T, onIn, onTheme }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const ring = T.primary + "33", ringb = T.primary;
  const inputStyle = {
    width: "100%", boxSizing: "border-box", marginTop: 6, background: T.soft,
    border: `1px solid ${T.line2}`, borderRadius: 11, padding: "13px 14px",
    color: T.text, fontSize: 15, outline: "none", "--ring": ring, "--ringb": ringb,
  };
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
            Your clients book on Telegram.<br />You just tap approve.
          </h2>
          <p style={{ color: T.text2, fontSize: 14, margin: "0 0 22px", lineHeight: 1.5 }}>
            Machi chats with your clients in Taglish and lines up the bookings. You stay in control.
          </p>

          <button onClick={onIn} className="mu-tap" style={{
            width: "100%", background: T.telegram, color: "#fff", fontWeight: 600, fontSize: 15,
            border: "none", borderRadius: 11, padding: "14px 0", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          }}>
            <Send size={17} /> Continue with Telegram
          </button>
          <button onClick={onIn} className="mu-tap" style={{
            width: "100%", marginTop: 10, background: T.card, color: T.text, fontWeight: 600, fontSize: 15,
            border: `1px solid ${T.line2}`, borderRadius: 11, padding: "13px 0", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-7.9Z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8L6 14.3Z"/><path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.6 6-4.6Z"/></svg>
            Sign in with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.line }} />
            <span style={{ color: T.dim, fontSize: 12 }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: T.line }} />
          </div>

          <label style={{ color: T.text2, fontSize: 13, fontWeight: 600 }}>Email</label>
          <input className="mu-focus" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@matchup.ph" style={inputStyle} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <label style={{ color: T.text2, fontSize: 13, fontWeight: 600 }}>Password</label>
            <a onClick={onIn} style={{ color: T.primary, fontSize: 12, cursor: "pointer" }}>Forgot?</a>
          </div>
          <div style={{ position: "relative" }}>
            <input className="mu-focus" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} />
            <button onClick={() => setShow((s) => !s)} aria-label="Toggle password" style={{ position: "absolute", right: 8, top: 13, background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 6 }}>
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button onClick={onIn} className="mu-tap" style={{
            width: "100%", marginTop: 18, background: T.primary, color: T.primaryInk, fontWeight: 700,
            fontSize: 15, border: "none", borderRadius: 11, padding: "14px 0", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            Sign in <ArrowRight size={16} />
          </button>
          <button onClick={onIn} style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: T.dim, fontSize: 13, cursor: "pointer" }}>
            Try the demo →
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
            <span style={{ width: 6, height: 6, borderRadius: 99, background: T.activeDot }} /> Trusted by coaches across Metro Manila
          </div>
          {/* mini conversation -> booking preview */}
          <div style={{ marginTop: 22, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 16, padding: 16, boxShadow: T.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: T.dim, fontSize: 12, fontWeight: 600 }}>
              <Send size={13} style={{ color: T.telegram }} /> Telegram · Machi
            </div>
            <div style={{ background: T.card2, color: T.text2, fontSize: 13, padding: "9px 12px", borderRadius: "12px 12px 12px 4px", maxWidth: "82%", marginBottom: 8 }}>
              coach pwede po bang mag-book ng tennis bukas 9am? 🎾
            </div>
            <div style={{ background: T.telegram, color: "#fff", fontSize: 13, padding: "9px 12px", borderRadius: "12px 12px 4px 12px", maxWidth: "82%", marginLeft: "auto", marginBottom: 12 }}>
              Sige po! Naka-pending na — paghihintayin natin si Coach Rio mag-confirm ✅
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 10 }}>
              <Avatar name="Bea Tan" size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>New request</div>
                <div className="mu-num" style={{ color: T.dim, fontSize: 12 }}>Tomorrow · 9:00 AM · Tennis</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ background: T.declinedBg, color: T.declined, borderRadius: 9, padding: 7, display: "flex" }}><X size={14} /></span>
                <span style={{ background: T.activeBg, color: T.active, borderRadius: 9, padding: 7, display: "flex" }}><Check size={14} /></span>
              </div>
            </div>
          </div>
          <p style={{ color: T.text2, fontSize: 14, marginTop: 20, lineHeight: 1.6, fontStyle: "italic" }}>
            "Dati nasa messages ko lahat ng booking, magulo. Ngayon tinatap ko lang. Game changer."
          </p>
          <p style={{ color: T.dim, fontSize: 13, marginTop: 4 }}>— Coach Marco, badminton · QC</p>
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
          flex: 1, background: "transparent", border: `1px solid ${T.line2}`, color: T.declined,
          borderRadius: 11, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <X size={16} /> Decline
        </button>
        <button onClick={onApprove} className="mu-tap" style={{
          flex: 1.4, background: T.active, border: "none", color: "#fff",
          borderRadius: 11, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <Check size={16} /> Approve
        </button>
      </div>
    </div>
  );
}

function Pending({ T, bookings, blocked, gBlocked, conflictFor, onOpen, onApprove, onDecline, simulate }) {
  const pend = bookings.filter((b) => b.status === "pending");
  return (
    <div className="mu-in">
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
      <button onClick={simulate} style={{
        width: "100%", marginTop: 6, background: "transparent", border: `1px dashed ${T.line2}`,
        color: T.dim, borderRadius: 12, padding: "12px 0", fontSize: 12.5, fontWeight: 600,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Sparkles size={13} /> Demo: simulate a Telegram booking
      </button>
    </div>
  );
}

/* ----------------------- CALENDAR TAB ----------------------- */
function Calendar({ T, bookings, blocked, gBlocked, toggleBlock, onOpen, startH = 6, endH = 21 }) {
  const days = Array.from({ length: 7 }, (_, i) => d(i));
  const HRS = Array.from({ length: Math.max(1, endH - startH + 1) }, (_, i) => `${String(startH + i).padStart(2, "0")}:00`);
  const [sel, setSel] = useState(days[0]);
  const [mode, setMode] = useState("day");
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
    if (gBlocked.has(h)) return { type: "blocked", scope: "global" };
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
        <div style={{ color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <CalendarClock size={15} style={{ color: T.accent }} /> Block time off
        </div>
        <div style={{ color: T.dim, fontSize: 12, marginBottom: 9 }}>Choose how long, then tap a free slot below.</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["day", sel === TODAY ? "Just today" : `Just ${DAY_LABEL(sel).short}`, CalendarDays], ["global", `Every ${DAY_LABEL(sel).weekday}`, Repeat]].map(([m, label, Icon]) => (
            <button key={m} onClick={() => setMode(m)} className="mu-tap" style={{
              flex: 1, padding: "10px 6px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              background: mode === m ? T.primarySoft : "transparent", border: `1px solid ${mode === m ? T.primary : T.line2}`,
              color: mode === m ? T.primary : T.text2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}><Icon size={13} /> {label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, color: T.text2, fontSize: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: T.accent, flexShrink: 0 }} />
          {mode === "day"
            ? <span>Tapping a slot blocks it <b style={{ color: T.text }}>only on {sel === TODAY ? "today" : DAY_LABEL(sel).short}</b>.</span>
            : <span>Tapping a slot blocks that hour <b style={{ color: T.text }}>every {DAY_LABEL(sel).weekday}</b> (e.g. a weekly lunch break).</span>}
        </div>
        {gBlocked.size > 0 && (
          <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
            <div style={{ color: T.dim, fontSize: 11, marginBottom: 7 }}>Blocked every week — tap to remove:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[...gBlocked].sort().map((h) => (
                <button key={h} onClick={() => toggleBlock(sel, h, "global")} title="Tap to remove" className="mu-tap" style={{
                  background: T.accentSoft, border: `1px solid ${T.accent}55`, color: T.accent, borderRadius: 99,
                  padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}><Repeat size={10} /> {fmt12(h)} <X size={11} /></button>
              ))}
            </div>
          </div>
        )}
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
                  <button onClick={() => toggleBlock(sel, r.h, r.s.scope)} className="mu-tap" style={{
                    flex: 1, borderRadius: 12, cursor: "pointer", border: `1px solid ${T.line2}`,
                    background: `repeating-linear-gradient(45deg, ${T.card2}, ${T.card2} 6px, ${T.soft} 6px, ${T.soft} 12px)`,
                    color: T.dim, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px 0",
                  }}>
                    {r.s.scope === "global" ? <Repeat size={13} /> : <Ban size={13} />}
                    {r.s.scope === "global" ? "Blocked every week — tap to free" : "Blocked — tap to free"}
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
                    <button onClick={() => toggleBlock(sel, h, mode)} className="mu-tap" style={{ flex: 1, borderRadius: 12, cursor: "pointer", border: `1px dashed ${T.line2}`, background: "transparent", color: T.dim, fontSize: 12.5, padding: "12px 0" }}>Available</button>
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
          <button onClick={() => onDecline(b)} className="mu-tap" style={{ flex: 1, background: "transparent", border: `1px solid ${T.line2}`, color: T.declined, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><X size={16} /> Decline</button>
          <button onClick={() => { onApprove(b.id); onClose(); }} className="mu-tap" style={{ flex: 1.4, background: T.active, border: "none", color: "#fff", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Check size={16} /> Approve</button>
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
function SettingsSheet({ T, open, onClose, onTheme, rate, startH, endH, onSave }) {
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
  const [themeName, setThemeName] = useState("light");
  const T = THEMES[themeName];
  const toggleTheme = () => setThemeName((n) => (n === "light" ? "dark" : "light"));

  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("pending");
  const [bookings, setBookings] = useState(SEED);
  const [blocked, setBlocked] = useState(new Set());
  const [gBlocked, setGBlocked] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [reqIdx, setReqIdx] = useState(0);
  const [rate, setRate] = useState(COACH.rate);
  const [startH, setStartH] = useState(6);
  const [endH, setEndH] = useState(21);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState([
    { msg: "Machi confirmed tomorrow's reminder to Andrea Reyes.", when: "1 hr ago" },
    { msg: "New booking request from Kayla Lim.", when: "12 min ago" },
  ]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5200);
    return () => clearTimeout(t);
  }, [toast]);

  const live = bookings.filter((b) => ["upcoming", "active"].includes(b.status));
  const conflictFor = (p) => {
    const hit = live.find((b) => overlaps(p, b));
    if (hit) return `Overlaps with ${hit.client} (${fmt12(hit.time)})`;
    for (let h = parseInt(p.time, 10); h < parseInt(p.time, 10) + p.dur; h++) {
      const hh = `${String(h).padStart(2, "0")}:00`;
      if (blocked.has(`${p.date}_${hh}`) || gBlocked.has(hh)) return "Falls on a blocked time slot";
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

  const approve = (id) => {
    const b = bookings.find((x) => x.id === id);
    setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: "upcoming" } : x)));
    setToast({ msg: `Approved — Machi messaged ${b.client.split(" ")[0]}: "Confirmed na po! 🎾"`, undo: () => { setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: "pending" } : x))); setToast(null); } });
  };
  const doDecline = (id) => {
    const b = bookings.find((x) => x.id === id);
    setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: "declined" } : x)));
    setConfirm(null); setDetail(null);
    setToast({ msg: `Declined ${b.client.split(" ")[0]} — Machi offered other slots`, undo: () => { setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: "pending" } : x))); setToast(null); } });
  };
  const complete = (id) => { setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: "completed", paid: true } : x))); setToast({ msg: "Marked complete ✅", undo: null }); };
  const noShow = (id) => { const b = bookings.find((x) => x.id === id); setToast({ msg: `${b.client.split(" ")[0]} marked as no-show`, undo: null }); };
  const suggestSlot = (p) => {
    const t = suggestFor(p); if (!t) return;
    setBookings((bs) => bs.map((x) => (x.id === p.id ? { ...x, time: t } : x)));
    setDetail((dd) => (dd ? { ...dd, time: t } : dd));
    setToast({ msg: `Machi proposed ${fmt12(t)} to ${p.client.split(" ")[0]} 🤝`, undo: null });
  };

  const toggleBlock = (sel, h, mode) => {
    if (mode === "global") setGBlocked((s) => { const n = new Set(s); n.has(h) ? n.delete(h) : n.add(h); return n; });
    else { const key = `${sel}_${h}`; setBlocked((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; }); }
  };

  const simulate = () => {
    const r = NEW_REQUESTS[reqIdx % NEW_REQUESTS.length];
    setReqIdx((i) => i + 1);
    const nb = { id: Date.now(), client: r.client, tg: r.tg, date: d(r.dOff), time: r.time, dur: r.dur, status: "pending", via: "Machi", note: r.note, ago: "just now", amount: rate * r.dur };
    setBookings((bs) => [...bs, nb]);
    setNotifs((ns) => [{ msg: `New booking request from ${r.client}.`, when: "just now" }, ...ns]);
    setToast({ msg: `Machi forwarded a new request from ${r.client.split(" ")[0]} 📩`, undo: null });
  };

  if (!authed) return (<><style>{FONTS}</style><Login T={T} onIn={() => setAuthed(true)} onTheme={toggleTheme} /></>);

  const pendCount = bookings.filter((b) => b.status === "pending").length;
  const todays = bookings.filter((b) => b.date === TODAY && ["upcoming", "active"].includes(b.status)).sort((a, b) => (a.time < b.time ? -1 : 1));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
  const nowH = `${String(hour).padStart(2, "0")}:00`;
  const next = todays.find((b) => b.time >= nowH);
  const sessionLine = todays.length === 0 ? "No sessions today — rest day 💤"
    : `${todays.length} session${todays.length > 1 ? "s" : ""} today${next ? ` · next ${fmt12(next.time)}` : " · all done"}`;
  const todayLine = pendCount > 0 ? `${sessionLine}  ·  ${pendCount} request${pendCount > 1 ? "s" : ""} waiting` : sessionLine;

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
                <div className="mu-display" style={{ color: T.text, fontSize: 16, lineHeight: 1.1 }}>{greet}, Coach {COACH.name}</div>
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
            <span title="Machi is connected to your Telegram and watching for bookings" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.success, background: T.activeBg, padding: "4px 10px", borderRadius: 99 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: T.activeDot, animation: "mu-pulse 1.8s infinite" }} /> Machi online
            </span>
            <span style={{ color: T.dim, fontSize: 11 }}>watching your Telegram</span>
          </div>
        </div>

        {/* content */}
        <div className="mu-noscroll" style={{ flex: 1, overflowY: "auto", padding: "18px 16px 96px" }}>
          {tab === "pending" && <Pending T={T} bookings={bookings} blocked={blocked} gBlocked={gBlocked} conflictFor={conflictFor} onOpen={setDetail} onApprove={approve} onDecline={setConfirm} simulate={simulate} />}
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
          rate={rate} startH={startH} endH={endH}
          onSave={({ rate: nr, startH: ns, endH: ne }) => {
            setRate(nr); setStartH(ns); setEndH(ne);
            setToast({ msg: `Settings saved — ${peso(nr)}/hr · ${fmt12(`${String(ns).padStart(2, "0")}:00`)}–${fmt12(`${String(ne).padStart(2, "0")}:00`)}`, undo: null });
          }} />
        <NotifSheet T={T} open={showNotif} onClose={() => setShowNotif(false)} items={notifs} />
      </div>
    </div>
  );
}

function BadgeCheckLite({ color }) {
  return <CheckCircle2 size={17} style={{ color, flexShrink: 0 }} />;
}
