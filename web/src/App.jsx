import { useState, useEffect, useRef } from "react";
import {
  CalendarDays, Inbox, ListChecks, Check, X, Lock, Send, Search,
  Clock, BadgeCheck, CircleDot, History, Sparkles, LogOut, Ban,
  AlertTriangle, Undo2, Globe, CalendarClock
} from "lucide-react";

/* ----------------------- DESIGN TOKENS ----------------------- */
const T = {
  bg: "#0E0C09",
  panel: "#17140F",
  panel2: "#1E1A13",
  line: "#2B2519",
  gold: "#D4A93C",
  champagne: "#ECD9A0",
  text: "#F2EBDD",
  dim: "#9C9180",
  green: "#7FBE8E",
  red: "#D77A6A",
  blue: "#8FA8C9",
  purple: "#B49AE8",
};

const SPORT = "Tennis"; // single-sport coach (demo assumption)

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@400;500;600;700&display=swap');
.mu-display { font-family: 'Marcellus', Georgia, serif; letter-spacing: 0.02em; }
.mu-body { font-family: 'Inter', -apple-system, sans-serif; }
.mu-num { font-variant-numeric: tabular-nums; }
@keyframes mu-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes mu-in { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
.mu-in { animation: mu-in .35s ease both; }
input::placeholder { color: #9C918077; }
`;

/* ----------------------- DATA HELPERS ----------------------- */
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
    day: dt.getDate(),
    full: dt.toLocaleDateString("en-PH", { month: "short", day: "numeric", weekday: "long" }),
  };
};
const fmt12 = (t) => {
  const h = parseInt(t.slice(0, 2), 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:00 ${ampm}`;
};
const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

const SEED = [
  { id: 1, client: "Andrea Reyes",  date: d(0), time: "07:00", dur: 1, status: "active",    via: "Machi",  note: `${SPORT} · fundamentals` },
  { id: 2, client: "JM dela Cruz",  date: d(0), time: "16:00", dur: 1, status: "upcoming",  via: "Machi",  note: `${SPORT} · serve drills` },
  { id: 3, client: "Miguel Santos", date: d(1), time: "09:00", dur: 2, status: "pending",   via: "Machi",  note: "\u201cpwede po ba sat 9am, 2 hrs?\u201d" },
  { id: 4, client: "Kayla Lim",     date: d(0), time: "16:00", dur: 1, status: "pending",   via: "Machi",  note: "\u201cgusto ko sana 4pm po today\u201d" },
  { id: 5, client: "Paolo Garcia",  date: d(-1), time: "08:00", dur: 1, status: "completed", via: "Machi",  note: `${SPORT} · footwork` },
  { id: 6, client: "Bea Tan",       date: d(-3), time: "17:00", dur: 1, status: "completed", via: "Manual", note: `${SPORT} · conditioning` },
  { id: 7, client: "Carlos Uy",     date: d(3), time: "10:00", dur: 1, status: "upcoming",  via: "Machi",  note: `${SPORT} · first session` },
];

const NEW_REQUESTS = [
  { client: "Trisha Mendoza", note: "\u201chi po! free pa po ba bukas morning?\u201d", time: "08:00", dOff: 1 },
  { client: "Ken Villanueva", note: "\u201ccoach pa-book ng sunday 4pm \ud83d\ude4f\u201d", time: "16:00", dOff: 4 },
  { client: "Liza Fernandez", note: "\u201c2 hours sana, weekend po\u201d", time: "14:00", dOff: 5 },
];

const overlaps = (a, b) => {
  if (a.date !== b.date) return false;
  const a1 = parseInt(a.time, 10), a2 = a1 + a.dur;
  const b1 = parseInt(b.time, 10), b2 = b1 + b.dur;
  return a1 < b2 && b1 < a2;
};

/* ----------------------- SMALL PARTS ----------------------- */
const STATUS_STYLE = {
  pending:   { c: T.gold,   label: "Pending" },
  upcoming:  { c: T.blue,   label: "Upcoming" },
  active:    { c: T.green,  label: "Active" },
  completed: { c: T.purple, label: "Completed" },
  declined:  { c: T.red,    label: "Declined" },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="mu-body" style={{
      color: s.c, border: `1px solid ${s.c}55`, background: `${s.c}14`,
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
      display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
    }}>
      <CircleDot size={10} /> {s.label}
    </span>
  );
}

function GoldRule() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${T.gold}66, transparent)` }} />;
}

/* ----------------------- LOGIN ----------------------- */
function Login({ onIn }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div className="mu-body" style={{ minHeight: 640, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="mu-in" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, margin: "0 auto 16px", borderRadius: 99,
            border: `1px solid ${T.gold}88`, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${T.gold}22 inset`,
          }}>
            <span className="mu-display" style={{ color: T.gold, fontSize: 26 }}>M</span>
          </div>
          <h1 className="mu-display" style={{ color: T.text, fontSize: 32, margin: 0 }}>MatchUp</h1>
          <p style={{ color: T.dim, fontSize: 13, marginTop: 6 }}>Coach Console · powered by Machi</p>
        </div>
        <GoldRule />
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: 24, marginTop: 28 }}>
          <label style={{ color: T.dim, fontSize: 12, fontWeight: 600 }}>EMAIL</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@matchup.ph"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 6, marginBottom: 16, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "13px 14px", color: T.text, fontSize: 14, outline: "none" }} />
          <label style={{ color: T.dim, fontSize: 12, fontWeight: 600 }}>PASSWORD</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 6, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "13px 14px", color: T.text, fontSize: 14, outline: "none" }} />
          <button onClick={onIn} style={{
            width: "100%", marginTop: 22, background: `linear-gradient(180deg, ${T.gold}, #B8902C)`,
            color: "#1A1504", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 10,
            padding: "14px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Lock size={15} /> Sign in
          </button>
          <p style={{ color: T.dim, fontSize: 12, textAlign: "center", marginTop: 14, marginBottom: 0 }}>
            Demo mode — any credentials work
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- SWIPE CARD ----------------------- */
function SwipeCard({ conflict, onAct, children }) {
  const [dx, setDx] = useState(0);
  const [snap, setSnap] = useState(false);
  const startX = useRef(null);
  const leaving = useRef(false);

  const down = (e) => {
    if (leaving.current) return;
    startX.current = e.clientX;
    setSnap(false);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (startX.current == null || leaving.current) return;
    setDx(e.clientX - startX.current);
  };
  const up = () => {
    if (startX.current == null || leaving.current) return;
    startX.current = null;
    if (dx > 90) {
      leaving.current = true; setSnap(true); setDx(480);
      setTimeout(() => onAct(true), 220);
    } else if (dx < -90) {
      leaving.current = true; setSnap(true); setDx(-480);
      setTimeout(() => onAct(false), 220);
    } else {
      setSnap(true); setDx(0);
    }
  };

  const rightOp = Math.min(Math.max(dx, 0) / 90, 1);
  const leftOp = Math.min(Math.max(-dx, 0) / 90, 1);

  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: 14, display: "flex",
        alignItems: "center", justifyContent: "space-between", padding: "0 20px",
        background: dx >= 0 ? `${T.green}1A` : `${T.red}1A`,
        border: `1px solid ${dx >= 0 ? T.green : T.red}44`,
      }}>
        <span style={{ color: T.green, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6, opacity: rightOp }}>
          <Check size={16} /> Approve
        </span>
        <span style={{ color: T.red, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6, opacity: leftOp }}>
          Decline <X size={16} />
        </span>
      </div>
      <div
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{
          transform: `translateX(${dx}px) rotate(${dx / 40}deg)`,
          transition: snap ? "transform .22s ease" : "none",
          touchAction: "pan-y", cursor: "grab", userSelect: "none",
          background: T.panel, border: `1px solid ${conflict ? T.red + "55" : T.line}`,
          borderLeft: `3px solid ${conflict ? T.red : T.gold}`,
          borderRadius: 14, padding: 16, position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ----------------------- PENDING TAB ----------------------- */
function Pending({ bookings, blocked, gBlocked, act, simulate }) {
  const pend = bookings.filter((b) => b.status === "pending");
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
  return (
    <div className="mu-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <h2 className="mu-display" style={{ color: T.text, fontSize: 24, margin: 0 }}>For approval</h2>
        <span className="mu-num" style={{ color: T.gold, fontSize: 13, fontWeight: 600 }}>{pend.length} pending</span>
      </div>
      <p style={{ color: T.dim, fontSize: 13, marginTop: 4, marginBottom: 18 }}>
        Machi collected these from your clients on Telegram.
      </p>
      {pend.length === 0 && (
        <div style={{ border: `1px dashed ${T.line}`, borderRadius: 14, padding: 28, textAlign: "center", color: T.dim, fontSize: 13 }}>
          All clear. New requests from Machi will appear here.
        </div>
      )}
      {pend.map((b) => {
        const dl = DAY_LABEL(b.date);
        const conflict = conflictFor(b);
        return (
          <SwipeCard key={b.id} conflict={conflict} onAct={(ok) => act(b.id, ok)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>{b.client}</div>
                <div className="mu-num" style={{ color: T.champagne, fontSize: 13, marginTop: 3 }}>
                  {dl.full} · {fmt12(b.time)} · {b.dur} hr{b.dur > 1 ? "s" : ""}
                </div>
                <div style={{ color: T.dim, fontSize: 12, marginTop: 5, fontStyle: "italic" }}>{b.note}</div>
              </div>
              <div style={{ color: T.dim, fontSize: 11, display: "flex", alignItems: "flex-start", gap: 4, whiteSpace: "nowrap" }}>
                <Send size={11} style={{ marginTop: 1 }} /> via Machi
              </div>
            </div>
            {conflict && (
              <div style={{ marginTop: 10, background: `${T.red}12`, border: `1px solid ${T.red}44`, borderRadius: 9, padding: "8px 11px", color: T.red, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {conflict}
              </div>
            )}
            <div style={{ marginTop: 12, color: `${T.dim}AA`, fontSize: 11, textAlign: "center" }}>
              ← swipe left to decline · swipe right to approve →
            </div>
          </SwipeCard>
        );
      })}
      <button onClick={simulate} style={{ width: "100%", marginTop: 8, background: "transparent", border: `1px dashed ${T.gold}55`, color: T.gold, borderRadius: 12, padding: "13px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Sparkles size={14} /> Simulate a new Telegram booking
      </button>
    </div>
  );
}

/* ----------------------- CALENDAR TAB ----------------------- */
function Calendar({ bookings, blocked, gBlocked, toggleBlock }) {
  const days = Array.from({ length: 7 }, (_, i) => d(i));
  const [sel, setSel] = useState(days[0]);
  const [mode, setMode] = useState("day"); // 'day' | 'global'
  const confirmed = bookings.filter((b) => b.date === sel && ["upcoming", "active", "completed"].includes(b.status));
  const pendings = bookings.filter((b) => b.date === sel && b.status === "pending");
  const findIn = (list, h) => list.find((b) => {
    const start = parseInt(b.time, 10), hh = parseInt(h, 10);
    return hh >= start && hh < start + b.dur;
  });
  return (
    <div className="mu-in">
      <h2 className="mu-display" style={{ color: T.text, fontSize: 24, margin: 0 }}>Calendar</h2>
      <p style={{ color: T.dim, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        Tap a free slot to block it. Machi won't offer blocked times.
      </p>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
        {days.map((iso) => {
          const dl = DAY_LABEL(iso);
          const on = iso === sel;
          const isToday = iso === TODAY;
          return (
            <button key={iso} onClick={() => setSel(iso)} style={{
              minWidth: 56, padding: "10px 0 8px", borderRadius: 12, cursor: "pointer",
              background: on ? `linear-gradient(180deg, ${T.gold}, #B8902C)` : T.panel,
              border: `1px solid ${on ? T.gold : T.line}`,
              color: on ? "#1A1504" : T.dim, textAlign: "center",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{isToday ? "Today" : dl.dow}</div>
              <div className="mu-num" style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{dl.day}</div>
            </button>
          );
        })}
      </div>

      {/* time blocking mode */}
      <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px", margin: "6px 0 14px" }}>
        <div style={{ color: T.champagne, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
          <CalendarClock size={14} /> Time blockings
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMode("day")} style={{
            flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: mode === "day" ? `${T.gold}1F` : "transparent",
            border: `1px solid ${mode === "day" ? T.gold : T.line}`,
            color: mode === "day" ? T.champagne : T.dim,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <CalendarDays size={13} /> This day only
          </button>
          <button onClick={() => setMode("global")} style={{
            flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: mode === "global" ? `${T.gold}1F` : "transparent",
            border: `1px solid ${mode === "global" ? T.gold : T.line}`,
            color: mode === "global" ? T.champagne : T.dim,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Globe size={13} /> All days
          </button>
        </div>
        <div style={{ color: `${T.dim}AA`, fontSize: 11, marginTop: 8 }}>
          {mode === "day" ? `Tapping a slot blocks it for ${sel === TODAY ? "today" : DAY_LABEL(sel).full} only.` : "Tapping a slot blocks that time on EVERY day (e.g. lunch break)."}
        </div>
        {gBlocked.size > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {[...gBlocked].sort().map((h) => (
              <button key={h} onClick={() => toggleBlock(sel, h, "global")} title="Tap to remove" style={{
                background: `${T.gold}14`, border: `1px solid ${T.gold}55`, color: T.champagne,
                borderRadius: 99, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Globe size={10} /> {fmt12(h)} <X size={10} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {HOURS.map((h) => {
          const bk = findIn(confirmed, h);
          const pd = findIn(pendings, h);
          const key = `${sel}_${h}`;
          const isDayBlocked = blocked.has(key);
          const isGlobalBlocked = gBlocked.has(h);
          return (
            <div key={h} style={{ display: "flex", gap: 10, alignItems: "stretch", marginBottom: 6 }}>
              <div className="mu-num" style={{ width: 62, color: T.dim, fontSize: 12, paddingTop: 11, flexShrink: 0, textAlign: "right" }}>{fmt12(h)}</div>
              {bk ? (
                <div style={{ flex: 1, background: T.panel2, border: `1px solid ${T.gold}44`, borderLeft: `3px solid ${T.gold}`, borderRadius: 10, padding: "9px 12px" }}>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{bk.client}</div>
                  <div style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>{bk.note}</div>
                </div>
              ) : pd ? (
                <div style={{ flex: 1, border: `1.5px dashed ${T.gold}77`, borderRadius: 10, padding: "9px 12px", background: `${T.gold}08` }}>
                  <div style={{ color: T.champagne, fontSize: 13, fontWeight: 600 }}>{pd.client}</div>
                  <div style={{ color: T.gold, fontSize: 11, marginTop: 2 }}>Awaiting your approval</div>
                </div>
              ) : (isDayBlocked || isGlobalBlocked) ? (
                <button onClick={() => toggleBlock(sel, h, isGlobalBlocked ? "global" : "day")} style={{
                  flex: 1, borderRadius: 10, cursor: "pointer", border: `1px solid ${T.line}`,
                  background: `repeating-linear-gradient(45deg, ${T.panel}, ${T.panel} 6px, #14110C 6px, #14110C 12px)`,
                  color: T.dim, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0",
                }}>
                  {isGlobalBlocked ? <Globe size={13} /> : <Ban size={13} />}
                  {isGlobalBlocked ? "Blocked (all days) — tap to free" : "Blocked — tap to free"}
                </button>
              ) : (
                <button onClick={() => toggleBlock(sel, h, mode)} style={{ flex: 1, borderRadius: 10, cursor: "pointer", border: `1px dashed ${T.line}`, background: "transparent", color: `${T.dim}88`, fontSize: 12, padding: "12px 0" }}>
                  Available
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------- BOOKINGS TAB ----------------------- */
function Bookings({ bookings }) {
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
        <h2 className="mu-display" style={{ color: T.text, fontSize: 24, margin: 0 }}>All bookings</h2>
        <span style={{ color: T.dim, fontSize: 11, fontWeight: 600, border: `1px solid ${T.line}`, borderRadius: 99, padding: "3px 10px" }}>{SPORT} coach</span>
      </div>
      <div style={{ position: "relative", marginTop: 14 }}>
        <Search size={15} style={{ position: "absolute", left: 13, top: 13, color: T.dim }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client name"
          style={{ width: "100%", boxSizing: "border-box", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: "11px 14px 11px 38px", color: T.text, fontSize: 14, outline: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "12px 0 16px", paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "8px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            background: filter === f ? `${T.gold}1F` : "transparent",
            border: `1px solid ${filter === f ? T.gold : T.line}`,
            color: filter === f ? T.champagne : T.dim,
          }}>{f}</button>
        ))}
      </div>
      {list.length === 0 && (
        <div style={{ border: `1px dashed ${T.line}`, borderRadius: 14, padding: 28, textAlign: "center", color: T.dim, fontSize: 13 }}>
          {q ? `No bookings found for \u201c${q}\u201d.` : "No bookings here yet."}
        </div>
      )}
      {list.map((b) => {
        const dl = DAY_LABEL(b.date);
        const past = b.status === "completed" || b.status === "declined";
        return (
          <div key={b.id} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 10, opacity: past ? 0.8 : 1, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{b.client}</div>
              <div className="mu-num" style={{ color: T.dim, fontSize: 12, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                {past ? <History size={12} /> : <Clock size={12} />} {dl.full} · {fmt12(b.time)} · {b.dur}h
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <Badge status={b.status} />
              <span style={{ color: `${T.dim}99`, fontSize: 10 }}>via {b.via}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------- APP SHELL ----------------------- */
export default function MatchUpCoach() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("pending");
  const [bookings, setBookings] = useState(SEED);
  const [blocked, setBlocked] = useState(new Set());
  const [gBlocked, setGBlocked] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [reqIdx, setReqIdx] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  const act = (id, approve) => {
    const b = bookings.find((x) => x.id === id);
    setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: approve ? "upcoming" : "declined" } : x)));
    setToast({
      msg: approve
        ? `Approved — Machi messaged ${b.client.split(" ")[0]}: "Confirmed na po! \ud83c\udfbe"`
        : `Declined — Machi let ${b.client.split(" ")[0]} know & offered other slots`,
      undo: () => {
        setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: "pending" } : x)));
        setToast(null);
      },
    });
  };

  const toggleBlock = (sel, h, mode) => {
    if (mode === "global") {
      setGBlocked((s) => {
        const n = new Set(s);
        n.has(h) ? n.delete(h) : n.add(h);
        return n;
      });
    } else {
      const key = `${sel}_${h}`;
      setBlocked((s) => {
        const n = new Set(s);
        n.has(key) ? n.delete(key) : n.add(key);
        return n;
      });
    }
  };

  const simulate = () => {
    const r = NEW_REQUESTS[reqIdx % NEW_REQUESTS.length];
    setReqIdx((i) => i + 1);
    setBookings((bs) => [...bs, { id: Date.now(), client: r.client, date: d(r.dOff), time: r.time, dur: 1, status: "pending", via: "Machi", note: r.note }]);
    setToast({ msg: `Machi forwarded a new request from ${r.client.split(" ")[0]} \ud83d\udce9`, undo: null });
  };

  if (!authed) return (<><style>{FONTS}</style><Login onIn={() => setAuthed(true)} /></>);

  const pendCount = bookings.filter((b) => b.status === "pending").length;
  const todays = bookings
    .filter((b) => b.date === TODAY && ["upcoming", "active"].includes(b.status))
    .sort((a, b) => (a.time < b.time ? -1 : 1));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
  const nowH = `${String(hour).padStart(2, "0")}:00`;
  const next = todays.find((b) => b.time >= nowH);
  const todayLine = todays.length === 0
    ? "No sessions today — rest day \ud83d\udca4"
    : `${todays.length} session${todays.length > 1 ? "s" : ""} today${next ? ` · next at ${fmt12(next.time)}` : " · all done for today"}`;

  const TABS = [
    { id: "pending", label: "Pending", icon: Inbox, badge: pendCount },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "bookings", label: "Bookings", icon: ListChecks },
  ];

  return (
    <div className="mu-body" style={{ background: T.bg, minHeight: 640, maxWidth: 460, margin: "0 auto", position: "relative", display: "flex", flexDirection: "column" }}>
      <style>{FONTS}</style>

      {/* header */}
      <div style={{ padding: "16px 18px 14px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${T.gold}88`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="mu-display" style={{ color: T.gold, fontSize: 16 }}>M</span>
            </div>
            <div>
              <div className="mu-display" style={{ color: T.text, fontSize: 16, lineHeight: 1.1 }}>{greet}, Coach Rio</div>
              <div className="mu-num" style={{ color: T.champagne, fontSize: 11, marginTop: 3 }}>{todayLine}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.green, border: `1px solid ${T.green}44`, background: `${T.green}10`, padding: "4px 10px", borderRadius: 99 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: T.green, animation: "mu-pulse 1.8s infinite" }} />
              Machi
            </span>
            <button onClick={() => setAuthed(false)} title="Sign out" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 0 }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px 90px" }}>
        {tab === "pending" && <Pending bookings={bookings} blocked={blocked} gBlocked={gBlocked} act={act} simulate={simulate} />}
        {tab === "calendar" && <Calendar bookings={bookings} blocked={blocked} gBlocked={gBlocked} toggleBlock={toggleBlock} />}
        {tab === "bookings" && <Bookings bookings={bookings} />}
      </div>

      {/* toast */}
      {toast && (
        <div className="mu-in" style={{ position: "absolute", bottom: 86, left: 18, right: 18, background: T.panel2, border: `1px solid ${T.gold}66`, borderRadius: 12, padding: "12px 14px", color: T.champagne, fontSize: 13, display: "flex", gap: 8, alignItems: "center", boxShadow: "0 8px 30px rgba(0,0,0,.5)", zIndex: 20 }}>
          <BadgeCheck size={16} style={{ color: T.gold, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{toast.msg}</span>
          {toast.undo && (
            <button onClick={toast.undo} style={{ background: `${T.gold}1F`, border: `1px solid ${T.gold}66`, color: T.gold, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <Undo2 size={13} /> Undo
            </button>
          )}
        </div>
      )}

      {/* bottom nav */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `${T.panel}F2`, backdropFilter: "blur(8px)", borderTop: `1px solid ${T.line}`, display: "flex", padding: "10px 8px 14px" }}>
        {TABS.map(({ id, label, icon: Icon, badge }) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: on ? T.gold : T.dim, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", padding: "4px 0" }}>
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
              {badge > 0 && (
                <span className="mu-num" style={{ position: "absolute", top: -4, right: "28%", background: T.gold, color: "#1A1504", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
