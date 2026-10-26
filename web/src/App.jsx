// ─────────────────────────────────────────────────────────────────
// MatchUp · Business console (v2, real onboarding + real services + real QR)
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import {
  Inbox, CalendarDays, ListChecks, Check, X, Clock, Search,
  Sparkles, LogOut, Ban, AlertTriangle, Undo2, ChevronRight, ChevronLeft,
  ArrowRight, Eye, EyeOff, User, Phone, Settings, Bell, Share2, Link2,
  ShieldCheck, Loader2, Plus, Trash2, QrCode, Download, Store, Scissors,
  Stethoscope, GraduationCap, Dumbbell, Heart, Wrench, ArrowLeft, Briefcase, Gift, Users, ClipboardList,
} from "lucide-react";

const T = {
  ink:"#0F1114", ink2:"#171A20", ink3:"#1E222A",
  line:"#252932", line2:"#333844",
  fg:"#F1F3F6", fg2:"#B7BDC7", mute:"#7C8290",
  lime:"#B9F531", limeInk:"#0F1114",
  limeSoft:"#B9F53119", limeSoft2:"#B9F53133",
  warn:"#E3B341", warnSoft:"#E3B34118",
  err:"#F08C7A", errSoft:"#F08C7A18",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body, #root { margin: 0; padding: 0; background: ${T.ink}; }
body { text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
.m-body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: ${T.fg}; }
.m-serif { font-family: 'Space Grotesk', -apple-system, system-ui, sans-serif; letter-spacing: -0.02em; font-weight: 600; }
.m-h   { font-family: 'Inter', -apple-system, system-ui, sans-serif; letter-spacing: -0.02em; font-weight: 600; }
.m-num { font-variant-numeric: tabular-nums; }
.m-tap { transition: transform .08s, background .18s, border-color .18s, color .18s, opacity .18s; }
.m-tap:active { transform: scale(.98); }
.m-focus:focus { outline: none; border-color: ${T.lime}; box-shadow: 0 0 0 3px ${T.lime}33; }
.m-noscroll::-webkit-scrollbar { display: none; }
.m-noscroll { scrollbar-width: none; -ms-overflow-style: none; }
@keyframes m-spin { to { transform: rotate(360deg); } } .m-spin { animation: m-spin .8s linear infinite; }
@keyframes m-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.m-in { animation: m-in .28s cubic-bezier(.2,.6,.2,1) both; }
@keyframes m-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.m-sheet { animation: m-up .28s cubic-bezier(.2,.9,.3,1) both; }
@keyframes m-fade { from { opacity: 0; } to { opacity: 1; } } .m-ov { animation: m-fade .2s ease both; }
@keyframes m-drop { 0% { opacity: 0; transform: translate(-50%, -30px) scale(.9); } 60% { transform: translate(-50%, 4px) scale(1.02); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
.m-drop { animation: m-drop .38s cubic-bezier(.2,1.3,.3,1) both; }
input, button, textarea, select { font-family: inherit; }
input::placeholder, textarea::placeholder { color: ${T.mute}; }
input:-webkit-autofill { -webkit-text-fill-color: ${T.fg}; -webkit-box-shadow: 0 0 0 1000px ${T.ink2} inset; transition: background-color 9999s; }
@media (max-width: 880px) { .m-hero { display: none !important; } }
`;

const TODAY = new Date().toLocaleDateString("en-CA");
const nowH = new Date().getHours();
const fmt12 = (hhmm) => { const [H,M]=String(hhmm).split(":").map(Number); return `${((H+11)%12)+1}:${String(M).padStart(2,"0")}${H>=12?"pm":"am"}`; };
const fmt12short = (hhmm) => { const H=parseInt(String(hhmm).slice(0,2),10); return `${((H+11)%12)+1}${H>=12?"pm":"am"}`; };
const fmtRange = (hhmm, dur) => { const H=parseInt(String(hhmm).slice(0,2),10); return `${fmt12short(hhmm)}–${fmt12short(`${String(H+dur).padStart(2,"0")}:00`)}`; };
const dateKey = (d) => d.toLocaleDateString("en-CA");
function DAY_LABEL(dk) {
  const [y,m,d] = dk.split("-").map(Number);
  const date = new Date(y, m-1, d);
  return {
    short: date.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }),
    full: date.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" }),
    dow: date.toLocaleDateString("en-PH", { weekday: "short" }).toUpperCase(),
    dnum: d,
    dmon: date.toLocaleDateString("en-PH", { month: "short" }).toLowerCase(),
  };
}
function overlaps(a, b) {
  if (a.date !== b.date) return false;
  const s1=parseInt(String(a.time).slice(0,2),10), e1=s1+a.dur;
  const s2=parseInt(String(b.time).slice(0,2),10), e2=s2+b.dur;
  return s1 < e2 && s2 < e1;
}
function agoFrom(ts) {
  if (!ts) return "just now";
  const mins = Math.max(0, Math.floor((Date.now()-new Date(ts).getTime())/60000));
  if (mins < 1) return "just now"; if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins/60); if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}
function mapBooking(row) {
  const time = String(row.time).slice(0,5);
  let status = row.status;
  if (status === "upcoming" && row.date === TODAY) {
    const sh = parseInt(time.slice(0,2), 10);
    if (nowH >= sh && nowH < sh + row.duration_hours) status = "active";
  }
  return {
    id: row.id, client: row.client_name, phone: row.client_phone||"",
    service: row.service||"", note: row.note||"",
    date: row.date, time, dur: row.duration_hours,
    status, via: row.via||"Web",
    amount: row.price || 0,
    ago: agoFrom(row.created_at),
  };
}
const initials = (n) => (n||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();

function Mark({ size = 32 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.26, background:T.lime, display:"grid", placeItems:"center", flexShrink:0 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M13 47 L23 19 L32 40 L41 19 L51 47" fill="none" stroke={T.limeInk} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
function Avatar({ name, size = 40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:99, flexShrink:0, background:T.ink3, color:T.fg2, display:"grid", placeItems:"center", fontWeight:600, fontSize:size*0.36, fontFamily:"Inter, sans-serif", letterSpacing:"-0.02em", border:`1px solid ${T.line2}` }}>{initials(name)}</div>
  );
}

function Eyebrow({ children }) {
  return <div style={{ color: T.mute, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", marginBottom: 8, textTransform: "uppercase" }}>{children}</div>;
}
function Chip({ children, tone = "mute" }) {
  const map = {
    mute: { bg: T.ink3, fg: T.fg2, bd: T.line },
    lime: { bg: T.limeSoft, fg: T.lime, bd: T.limeSoft2 },
    warn: { bg: T.warnSoft, fg: T.warn, bd: `${T.warn}44` },
    err:  { bg: T.errSoft, fg: T.err, bd: `${T.err}44` },
  }[tone];
  return (
    <span className="m-num" style={{ background: map.bg, color: map.fg, border: `1px solid ${map.bd}`, borderRadius: 99, padding: "3px 9px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, lineHeight: 1.3 }}>
      {children}
    </span>
  );
}
function StatusChip({ status }) {
  if (status === "pending")   return <Chip tone="warn">Pending</Chip>;
  if (status === "upcoming")  return <Chip tone="lime">Confirmed</Chip>;
  if (status === "active")    return <Chip tone="lime">Now</Chip>;
  if (status === "completed") return <Chip tone="mute">Done</Chip>;
  if (status === "declined")  return <Chip tone="err">Declined</Chip>;
  return null;
}
function Btn({ kind = "primary", size = "md", children, onClick, disabled, busy, style, type }) {
  const sizes = { sm:{p:"8px 12px",f:13}, md:{p:"12px 16px",f:14}, lg:{p:"15px 18px",f:15} }[size];
  const kinds = {
    primary:{bg:T.lime,fg:T.limeInk,bd:"none"},
    ghost:{bg:"transparent",fg:T.fg,bd:`1px solid ${T.line2}`},
    soft:{bg:T.ink2,fg:T.fg,bd:`1px solid ${T.line}`},
    danger:{bg:"transparent",fg:T.err,bd:`1px solid ${T.err}44`},
  }[kind];
  const isD = disabled || busy;
  return (
    <button type={type||"button"} onClick={onClick} disabled={isD} className="m-tap"
      style={{ background: isD?T.ink3:kinds.bg, color: isD?T.mute:kinds.fg, border: kinds.bd, borderRadius: 12, padding: sizes.p, fontSize: sizes.f, fontWeight: 700, cursor: isD?"default":"pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, lineHeight: 1.2, letterSpacing: "-0.01em", ...style }}>
      {busy ? <Loader2 size={16} className="m-spin" /> : children}
    </button>
  );
}
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? "m-tap" : ""}
      style={{ background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 16, padding: 16, cursor: onClick?"pointer":"default", ...style }}>
      {children}
    </div>
  );
}
function Sheet({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <>
      <div className="m-ov" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(4,6,9,.66)", backdropFilter: "blur(4px)", zIndex: 60 }} />
      <div className="m-sheet" style={{ position: "fixed", left: "50%", bottom: 0, transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: T.ink2, borderTop: `1px solid ${T.line}`, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: `calc(20px + env(safe-area-inset-bottom))`, zIndex: 70, maxHeight: "90vh", overflowY: "auto" }} className="m-noscroll">
        <div style={{ width: 40, height: 4, borderRadius: 99, background: T.line2, margin: "0 auto 16px" }} />
        {title && <h3 className="m-h" style={{ fontSize: 18, margin: "0 0 4px" }}>{title}</h3>}
        {children}
      </div>
    </>
  );
}
function Input(props) {
  const { icon: Icon, ...rest } = props;
  return (
    <div style={{ position: "relative" }}>
      {Icon && <Icon size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.mute, pointerEvents: "none" }} />}
      <input className="m-focus" {...rest}
        style={{ width: "100%", background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 12, padding: Icon?"13px 15px 13px 40px":"13px 15px", color: T.fg, fontSize: 16, lineHeight: 1.3, ...rest.style }} />
    </div>
  );
}
function Toast({ msg, tone = "success", onUndo }) {
  const isSuccess = tone === "success";
  return (
    <div className="m-drop" style={{ position: "fixed", top: `calc(20px + env(safe-area-inset-top))`, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 24px)", maxWidth: 420, background: isSuccess ? T.lime : T.ink3, color: isSuccess ? T.limeInk : T.fg, border: isSuccess ? "none" : `1px solid ${T.line2}`, borderRadius: 16, padding: "13px 16px", fontSize: 14, display: "flex", alignItems: "center", gap: 12, zIndex: 90, boxShadow: "0 20px 40px rgba(0,0,0,.6), 0 4px 12px rgba(0,0,0,.4)" }}>
      <div style={{ width: 26, height: 26, borderRadius: 99, background: isSuccess ? T.limeInk : T.lime, color: isSuccess ? T.lime : T.limeInk, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Check size={15} strokeWidth={2.8} />
      </div>
      <span style={{ flex: 1, lineHeight: 1.35, fontWeight: 600 }}>{msg}</span>
      {onUndo && <button onClick={onUndo} className="m-tap" style={{ background: isSuccess ? "rgba(15,17,20,.12)" : "rgba(255,255,255,.08)", border: "none", color: isSuccess ? T.limeInk : T.fg, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Undo2 size={12} /> Undo</button>}
    </div>
  );
}

/* ─── Auth screen ────────────────────────────────────────────── */
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(""); const [info, setInfo] = useState("");

  async function submit() {
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
      } else {
        if (pw.length < 8) throw new Error("Password must be at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password: pw,
        });
        if (error) throw error;
        if (!data.session) { setInfo("Account created. Check your email to confirm, then sign in."); setMode("login"); return; }
      }
    } catch (e) { setErr(e.message || String(e)); } finally { setBusy(false); }
  }

  async function forgot() {
    if (!email.trim()) { setErr("Enter your email first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setErr(error.message); else setInfo("Password reset link sent.");
  }

  return (
    <div className="m-body" style={{ minHeight: "100vh", background: T.ink, display: "flex" }}>
      <style>{FONTS}</style>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div className="m-in" style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <Mark size={40} />
            <div>
              <div className="m-serif" style={{ fontSize: 22, lineHeight: 1 }}>MatchUp</div>
              <div style={{ color: T.mute, fontSize: 12, marginTop: 4 }}>Booking, on autopilot</div>
            </div>
          </div>

          {mode === "login" ? (
            <>
              <h1 className="m-serif" style={{ fontSize: 30, lineHeight: 1.05, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Welcome back.</h1>
              <p style={{ color: T.fg2, fontSize: 15, margin: "0 0 26px", lineHeight: 1.5 }}>Sign in to your MatchUp console.</p>
            </>
          ) : (
            <>
              <h1 className="m-serif" style={{ fontSize: 30, lineHeight: 1.05, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                Fewer missed bookings.<br /><span style={{ color: T.lime }}>More filled hours.</span>
              </h1>
              <p style={{ color: T.fg2, fontSize: 15, margin: "0 0 26px", lineHeight: 1.5 }}>Set up in 60 seconds. Get bookings the same day.</p>
            </>
          )}

          <Eyebrow>Email</Eyebrow>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.ph" autoComplete="email" />
          <div style={{ height: 14 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Eyebrow>Password</Eyebrow>
            {mode === "login" && (
              <button onClick={forgot} style={{ background: "none", border: "none", color: T.mute, fontSize: 11, cursor: "pointer", padding: 0 }}>Forgot?</button>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <Input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••" style={{ paddingRight: 44 }} />
            <button onClick={() => setShow(s => !s)} aria-label="Toggle password" className="m-tap" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: T.mute, cursor: "pointer", padding: 8 }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {err && <div role="alert" style={{ marginTop: 14, background: T.errSoft, color: T.err, border: `1px solid ${T.err}44`, borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.4 }}>{err}</div>}
          {info && <div style={{ marginTop: 14, background: T.limeSoft, color: T.lime, border: `1px solid ${T.limeSoft2}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.4 }}>{info}</div>}
          <div style={{ marginTop: 22 }}>
            <Btn kind="primary" size="lg" onClick={submit} busy={busy} style={{ width: "100%" }}>
              {mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} />
            </Btn>
          </div>
          <button onClick={() => { setMode(mode==="login"?"signup":"login"); setErr(""); setInfo(""); }} style={{ width: "100%", marginTop: 16, background: "none", border: "none", color: T.mute, fontSize: 13, cursor: "pointer", padding: 8 }}>
            {mode === "login" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
      <div className="m-hero" style={{ flex: 1, background: T.ink2, borderLeft: `1px solid ${T.line}`, display: "flex", flexDirection: "column", justifyContent: "center", padding: 48 }}>
        <div style={{ maxWidth: 400 }}>
          <Eyebrow>Loved by service businesses</Eyebrow>
          <h2 className="m-serif" style={{ fontSize: 36, lineHeight: 1.05, margin: "8px 0 20px", letterSpacing: "-0.03em" }}>
            One link.<br />Every booking.<br /><span style={{ color: T.lime }}>Zero missed hours.</span>
          </h2>
          <p style={{ color: T.fg2, fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            Give your customers a link or QR code. They pick a service and a time. You approve. Done.
          </p>
          <div style={{ background: T.ink, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18 }}>
            <FeatureRow icon={ShieldCheck} text="No app or login for your customers" />
            <FeatureRow icon={QrCode} text="Printable QR code for your counter" />
            <FeatureRow icon={CalendarDays} text="Real availability, zero double-booking" last />
          </div>
        </div>
      </div>
    </div>
  );
}
function FeatureRow({ icon: Icon, text, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: last ? "none" : `1px solid ${T.line}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: T.limeSoft, display: "grid", placeItems: "center", color: T.lime, flexShrink: 0 }}><Icon size={14} /></div>
      <div style={{ color: T.fg, fontSize: 14 }}>{text}</div>
    </div>
  );
}

/* ─── Onboarding Wizard ──────────────────────────────────────── */
const KINDS = [
  { key: "salon",    icon: Scissors,      label: "Salon / Barber",   suggest: [{n:"Haircut", d:0.5, p:200}, {n:"Haircut + shave", d:1, p:400}, {n:"Color", d:2, p:1500}] },
  { key: "nails",    icon: Sparkles,      label: "Nails",            suggest: [{n:"Manicure", d:0.5, p:150}, {n:"Mani + pedi", d:1.5, p:400}, {n:"Gel polish", d:1, p:500}] },
  { key: "spa",      icon: Heart,         label: "Spa / Massage",    suggest: [{n:"Swedish 1hr", d:1, p:600}, {n:"Full body 2hr", d:2, p:1200}, {n:"Hot stone", d:1.5, p:1500}] },
  { key: "clinic",   icon: Stethoscope,   label: "Clinic / Derma",   suggest: [{n:"Consultation", d:0.5, p:500}, {n:"Follow-up", d:0.5, p:300}] },
  { key: "coach",    icon: Dumbbell,      label: "Sports coach",     suggest: [{n:"1-hour session", d:1, p:800}, {n:"Group session", d:1, p:400}] },
  { key: "tutor",    icon: GraduationCap, label: "Tutor",            suggest: [{n:"Regular session", d:1, p:400}, {n:"Cram session", d:2, p:1000}] },
  { key: "consult",  icon: Briefcase,     label: "Consultant",       suggest: [{n:"Discovery call", d:0.5, p:0}, {n:"Strategy session", d:1, p:2500}] },
  { key: "wedding",  icon: Gift,          label: "Wedding / Events", suggest: [{n:"Initial consult", d:1, p:0}, {n:"Planning session", d:2, p:3000}] },
  { key: "other",    icon: Wrench,        label: "Something else",   suggest: [{n:"Standard session", d:1, p:500}] },
];

function Wizard({ profile, onDone }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile.name || "");
  const [slug, setSlug] = useState(profile.slug || "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [kindKey, setKindKey] = useState("");
  const [services, setServices] = useState([]);
  const [newSvc, setNewSvc] = useState({ n: "", d: 1, p: "" });
  const [startH, setStartH] = useState(9);
  const [endH, setEndH] = useState(19);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // auto-generate slug from name unless the user has edited it
  useEffect(() => {
    if (slugTouched) return;
    const auto = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
    setSlug(auto);
  }, [name, slugTouched]);

  // check slug availability (debounced)
  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugTaken(false); return; }
    if (slug === profile.slug) { setSlugTaken(false); return; }
    setSlugChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("coaches").select("id").eq("slug", slug).maybeSingle();
      setSlugTaken(!!data && data.id !== profile.id);
      setSlugChecking(false);
    }, 350);
    return () => clearTimeout(t);
  }, [slug, profile.id, profile.slug]);

  const kind = KINDS.find(k => k.key === kindKey);

  function pickKind(k) {
    setKindKey(k.key);
    setServices(k.suggest.map(s => ({ name: s.n, duration_hours: s.d, price: s.p })));
    // no auto-advance per designer feedback #7
  }
  function addSvc() {
    if (!newSvc.n.trim()) return;
    setServices(arr => [...arr, { name: newSvc.n.trim(), duration_hours: parseFloat(newSvc.d)||1, price: parseInt(newSvc.p)||0 }]);
    setNewSvc({ n: "", d: 1, p: "" });
  }
  function removeSvc(i) { setServices(arr => arr.filter((_, j) => j !== i)); }

  async function finish() {
    setErr(""); setBusy(true);
    try {
      if (slugTaken) { setErr("That link is taken. Try another."); setBusy(false); return; }
      if (!slug || slug.length < 3) { setErr("Your link needs at least 3 characters."); setBusy(false); return; }
      // Save business
      const { error: e1 } = await supabase.from("coaches").update({
        name: name.trim(),
        slug: slug.trim(),
        sport: kind.label,
        rate: services[0]?.price || 500,
        start_hour: startH, end_hour: endH,
        info: info.trim(),
        is_onboarded: true,
      }).eq("id", profile.id);
      if (e1) {
        if (e1.code === "23505") { setErr("That link is taken. Try another."); setBusy(false); return; }
        throw e1;
      }
      // Save services (delete old, insert new)
      await supabase.from("services").delete().eq("coach_id", profile.id);
      if (services.length > 0) {
        const rows = services.map((s, i) => ({
          coach_id: profile.id, name: s.name,
          duration_hours: s.duration_hours, price: s.price, sort_order: i,
        }));
        const { error: e2 } = await supabase.from("services").insert(rows);
        if (e2) throw e2;
      }
      onDone();
    } catch (e) { setErr(e.message || "Something went wrong."); } finally { setBusy(false); }
  }

  const hours = Array.from({length: 18}, (_, i) => 5 + i);
  const canNext = {
    1: name.trim().length >= 2,
    2: !!kindKey,
    3: services.length >= 1 && services.every(s => s.name.trim() && s.duration_hours > 0),
    4: startH < endH && slug.length >= 3 && !slugTaken && !slugChecking,
  }[step];

  return (
    <div className="m-body" style={{ minHeight: "100vh", background: T.ink }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 100px" }}>

        {/* Minimal header — designer feedback #6 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="m-tap" aria-label="Back" style={{ background: "transparent", border: "none", color: T.fg2, cursor: "pointer", padding: 6, marginLeft: -6 }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="m-num" style={{ color: T.mute, fontSize: 12, fontWeight: 500 }}>Step {step} of 4</div>
        </div>
        {/* Subtle 1px progress line */}
        <div style={{ height: 1, background: T.line, marginBottom: 32, overflow: "hidden" }}>
          <div style={{ width: `${(step/4)*100}%`, height: "100%", background: T.lime, transition: "width .3s" }} />
        </div>

        {/* STEP 1: business name */}
        {step === 1 && (
          <div className="m-in">
            <h1 className="m-h" style={{ fontSize: 26, lineHeight: 1.1, margin: "0 0 8px", letterSpacing: "-0.02em" }}>What's your business called?</h1>
            <p style={{ color: T.fg2, fontSize: 15, margin: "0 0 22px", lineHeight: 1.5 }}>This is what customers will see on your booking page.</p>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rio's Barbershop" autoFocus />
          </div>
        )}

        {/* STEP 2: kind */}
        {step === 2 && (
          <div className="m-in">
            <h1 className="m-h" style={{ fontSize: 26, lineHeight: 1.1, margin: "0 0 8px", letterSpacing: "-0.02em" }}>What kind of business?</h1>
            <p style={{ color: T.fg2, fontSize: 15, margin: "0 0 22px", lineHeight: 1.5 }}>We'll suggest starter services. You can edit anything.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {KINDS.map(k => {
                const on = k.key === kindKey;
                return (
                  <button key={k.key} onClick={() => pickKind(k)} className="m-tap"
                    style={{ background: on?T.limeSoft:T.ink2, border: `1px solid ${on?T.lime:T.line}`, borderRadius: 14, padding: "18px 14px", cursor: "pointer", color: T.fg, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: on?T.lime:T.ink3, color: on?T.limeInk:T.fg, display: "grid", placeItems: "center" }}>
                      <k.icon size={20} />
                    </div>
                    <span className="m-serif" style={{ fontSize: 13, textAlign: "center" }}>{k.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: services */}
        {step === 3 && (
          <div className="m-in">
            <h1 className="m-h" style={{ fontSize: 26, lineHeight: 1.1, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Your services.</h1>
            <p style={{ color: T.fg2, fontSize: 15, margin: "0 0 22px", lineHeight: 1.5 }}>Add what customers can book. Prices in pesos.</p>

            {services.map((s, i) => (
              <div key={i} style={{ background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <input value={s.name} onChange={e => setServices(arr => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    style={{ background: "transparent", border: "none", color: T.fg, fontSize: 14, fontWeight: 600, width: "100%", padding: 0, outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
                    <input type="text" inputMode="decimal" value={s.duration_hours} onChange={e => setServices(arr => arr.map((x, j) => j === i ? { ...x, duration_hours: parseFloat(e.target.value)||1 } : x))} style={{ width: 44, background: T.ink, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "3px 6px", color: T.fg2, fontSize: 12, boxSizing: "border-box", MozAppearance: "textfield" }} />
                    <span style={{ color: T.mute, fontSize: 12 }}>hr</span>
                    <span style={{ color: T.line2, fontSize: 12 }}>·</span>
                    <span style={{ color: T.mute, fontSize: 12 }}>₱</span>
                    <input type="text" inputMode="numeric" value={s.price} onChange={e => setServices(arr => arr.map((x, j) => j === i ? { ...x, price: parseInt(e.target.value)||0 } : x))} style={{ width: 62, background: T.ink, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "3px 6px", color: T.fg2, fontSize: 12, boxSizing: "border-box", MozAppearance: "textfield" }} />
                  </div>
                </div>
                <button onClick={() => removeSvc(i)} className="m-tap" aria-label="Remove" style={{ flexShrink: 0, background: "transparent", border: "none", color: T.mute, cursor: "pointer", padding: 6 }}><Trash2 size={16} /></button>
              </div>
            ))}

            {/* add new */}
            <div style={{ marginTop: 12, padding: 12, background: T.ink, border: `1px dashed ${T.line2}`, borderRadius: 12 }}>
              <input value={newSvc.n} onChange={e => setNewSvc({...newSvc, n: e.target.value})} placeholder="Service name" style={{ width: "100%", background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", color: T.fg, fontSize: 14, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 6, overflow: "hidden" }}>
                <input type="text" inputMode="decimal" value={newSvc.d} onChange={e => setNewSvc({...newSvc, d: e.target.value})} placeholder="1" style={{ flex: 1, minWidth: 0, background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", color: T.fg, fontSize: 14, boxSizing: "border-box" }} />
                <input type="text" inputMode="numeric" value={newSvc.p} onChange={e => setNewSvc({...newSvc, p: e.target.value})} placeholder="₱ price" style={{ flex: 1, minWidth: 0, background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", color: T.fg, fontSize: 14, boxSizing: "border-box" }} />
                <button onClick={addSvc} className="m-tap" aria-label="Add" style={{ flexShrink: 0, background: T.lime, color: T.limeInk, border: "none", borderRadius: 8, padding: "0 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Plus size={14} /></button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: hours */}
        {step === 4 && (
          <div className="m-in">
            <h1 className="m-h" style={{ fontSize: 26, lineHeight: 1.1, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Your working hours.</h1>
            <p style={{ color: T.fg2, fontSize: 15, margin: "0 0 22px", lineHeight: 1.5 }}>Machi only offers times you're actually available.</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <Eyebrow>Open at</Eyebrow>
                <select value={startH} onChange={e => setStartH(parseInt(e.target.value))} style={selStyle()}>
                  {hours.map(h => <option key={h} value={h}>{fmt12(`${String(h).padStart(2,"0")}:00`)}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <Eyebrow>Close at</Eyebrow>
                <select value={endH} onChange={e => setEndH(parseInt(e.target.value))} style={selStyle()}>
                  {hours.map(h => <option key={h} value={h}>{fmt12(`${String(h).padStart(2,"0")}:00`)}</option>)}
                </select>
              </div>
            </div>

            <Eyebrow>Your booking link</Eyebrow>
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: T.ink2, border: `1px solid ${slugTaken ? T.err : T.line}`, borderRadius: 12, padding: "0 15px", marginBottom: 6 }}>
              <span className="m-num" style={{ color: T.mute, fontSize: 14 }}>matchup.app/book/</span>
              <input value={slug} onChange={e => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)); }}
                className="m-num" placeholder="yourbiz" spellCheck={false} autoCapitalize="none"
                style={{ flex: 1, background: "transparent", border: "none", color: T.fg, fontSize: 14, padding: "13px 0", outline: "none", fontWeight: 600 }} />
              {slugChecking && <Loader2 size={14} className="m-spin" style={{ color: T.mute }} />}
              {!slugChecking && slug.length >= 3 && !slugTaken && <Check size={14} style={{ color: T.lime }} />}
            </div>
            <div style={{ color: slugTaken ? T.err : T.mute, fontSize: 11, marginBottom: 18, lineHeight: 1.4 }}>
              {slugTaken ? "That link is already taken. Try another." : "Lowercase letters and numbers only. Change any time."}
            </div>

            <Eyebrow>Location / notes (optional)</Eyebrow>
            <textarea value={info} onChange={e => setInfo(e.target.value)} placeholder="e.g. Marikina Sports Center. Bring your own racket." rows={3} style={{ width: "100%", background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 15px", color: T.fg, fontSize: 15, resize: "vertical", lineHeight: 1.4 }} />
          </div>
        )}

        {err && <div role="alert" style={{ marginTop: 14, background: T.errSoft, color: T.err, border: `1px solid ${T.err}44`, borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>{err}</div>}

        <div style={{ marginTop: 30 }}>
          {step < 4 ? (
            <Btn kind="primary" size="lg" onClick={() => setStep(s => s + 1)} disabled={!canNext} style={{ width: "100%" }}>
              Continue <ArrowRight size={16} />
            </Btn>
          ) : (
            <Btn kind="primary" size="lg" onClick={finish} busy={busy} disabled={!canNext} style={{ width: "100%" }}>
              Get my link <Check size={16} />
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
function selStyle() {
  return { width: "100%", background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 12, padding: "13px 15px", color: T.fg, fontSize: 15, appearance: "none", cursor: "pointer" };
}

/* ─── QR Page ────────────────────────────────────────────────── */
function QRPage({ profile, onBack }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/book/${profile.slug}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = await import("https://esm.sh/qrcode@1.5.4");
        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "H", margin: 2, scale: 12,
          color: { dark: "#0F1114", light: "#FFFFFF" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (e) { console.error("QR error", e); }
    })();
    return () => { cancelled = true; };
  }, [url]);

  function download() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `matchup-${profile.slug}-qr.png`;
    a.click();
  }
  function copy() {
    navigator.clipboard?.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  }
  function share() {
    if (navigator.share) navigator.share({ title: `Book ${profile.name}`, url }).catch(() => {});
    else copy();
  }
  function print() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!doctype html><html><head><title>${profile.name} — Booking QR</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        @page { size: A6; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, sans-serif; padding: 24px; text-align: center; }
        .card { width: 100%; max-width: 400px; margin: 0 auto; border: 2px dashed #ccc; border-radius: 16px; padding: 24px; }
        .top { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 20px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 16px; letter-spacing: .05em; text-transform: uppercase; }
        img { width: 250px; height: 250px; display: block; margin: 0 auto 12px; }
        .biz { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 22px; margin-bottom: 4px; letter-spacing: -0.02em; }
        .url { color: #666; font-size: 11px; font-family: monospace; word-break: break-all; margin-bottom: 12px; }
        .cta { background: #B9F531; color: #0F1114; font-weight: 700; padding: 10px 20px; border-radius: 999px; display: inline-block; font-size: 13px; }
        .foot { color: #999; font-size: 10px; margin-top: 12px; }
      </style></head><body>
        <div class="card">
          <div class="top">SCAN TO BOOK</div>
          <div class="sub">no app · no login</div>
          <img src="${qrDataUrl}" />
          <div class="biz">${profile.name}</div>
          <div class="url">${url}</div>
          <div class="cta">Scan with your camera</div>
          <div class="foot">Powered by MatchUp</div>
        </div>
        <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div className="m-body" style={{ minHeight: "100vh", background: T.ink }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <button onClick={onBack} className="m-tap" aria-label="Back" style={{ background: "transparent", border: "none", color: T.fg2, cursor: "pointer", padding: 6, marginLeft: -6 }}>
            <ArrowLeft size={20} />
          </button>
          <div className="m-h" style={{ fontSize: 17 }}>Your QR code</div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 24, marginBottom: 20, display: "grid", placeItems: "center", position: "relative" }}>
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="QR code" style={{ width: "100%", maxWidth: 260, display: "block" }} />
              {/* M mark centered — smaller for better scan reliability */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#FFFFFF", padding: 5, borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.lime, display: "grid", placeItems: "center" }}>
                  <svg width="32" height="32" viewBox="0 0 64 64"><path d="M13 47 L23 19 L32 40 L41 19 L51 47" fill="none" stroke={T.limeInk} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 80 }}><Loader2 size={22} className="m-spin" style={{ color: T.mute }} /></div>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="m-h" style={{ fontSize: 20, marginBottom: 10 }}>{profile.name}</div>
        </div>
        {/* URL field with copy inline — proves what the QR encodes */}
        <div style={{ display: "flex", alignItems: "stretch", background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
          <div className="m-num" style={{ flex: 1, padding: "11px 13px", color: T.fg2, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>{url}</div>
          <button onClick={copy} aria-label={copied ? "Copied" : "Copy link"} className="m-tap"
            style={{ background: copied ? T.lime : "transparent", color: copied ? T.limeInk : T.fg2, border: "none", borderLeft: `1px solid ${T.line}`, padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {copied ? <Check size={16} strokeWidth={2.6} /> : <Link2 size={16} />}
          </button>
        </div>
        <Btn kind="primary" size="lg" onClick={download} disabled={!qrDataUrl} style={{ width: "100%", marginBottom: 8 }}>
          <Download size={16} /> Download QR code
        </Btn>
        {/* Open the booking page in a new tab — tap-test same URL as QR */}
        <a href={url} target="_blank" rel="noreferrer" className="m-tap"
          style={{ display: "block", textAlign: "center", background: "transparent", color: T.fg2, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          Preview booking page →
        </a>
        <p style={{ color: T.mute, fontSize: 11, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
          Both the QR code and the link above open the same booking page.
        </p>
      </div>
    </div>
  );
}

/* ─── Tabs (Pending / Calendar / Bookings) ───────────────────── */
function LinkCard({ bookingLink, onShowQR }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(bookingLink); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Book me on MatchUp", url: bookingLink }); } catch {} }
    else copy();
  };
  return (
    <div style={{ marginBottom: 16 }}>
      {/* URL field with copy INSIDE — designer feedback #4, #11 */}
      <div style={{ display: "flex", alignItems: "stretch", background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div className="m-num" style={{ flex: 1, minWidth: 0, padding: "12px 14px", color: T.fg2, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>{bookingLink}</div>
        <button onClick={copy} aria-label={copied ? "Copied" : "Copy link"} className="m-tap"
          style={{ background: copied ? T.lime : "transparent", color: copied ? T.limeInk : T.fg2, border: "none", borderLeft: `1px solid ${T.line}`, padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center" }}>
          {copied ? <Check size={16} strokeWidth={2.6} /> : <Link2 size={16} />}
        </button>
      </div>
      {/* Share & QR as quieter secondary row */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={share} aria-label="Share" className="m-tap"
          style={{ flex: 1, background: "transparent", border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 0", color: T.fg2, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Share2 size={13} /> Share
        </button>
        <button onClick={onShowQR} aria-label="Show QR code" className="m-tap"
          style={{ flex: 1, background: "transparent", border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 0", color: T.fg2, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <QrCode size={13} /> QR code
        </button>
      </div>
    </div>
  );
}

function StatsRow({ bookings }) {
  const stats = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0,0,0,0);
    const isEarned = (b) => ["upcoming","active","completed"].includes(b.status);
    const wk = bookings.filter(b => {
      const [y,m,d] = b.date.split("-").map(Number);
      return new Date(y, m-1, d) >= start && isEarned(b);
    });
    const all = bookings.filter(isEarned);
    return {
      weekRev: wk.reduce((s, b) => s + (b.amount || 0), 0),
      weekCount: wk.length,
      allRev: all.reduce((s, b) => s + (b.amount || 0), 0),
      allCount: all.length,
    };
  }, [bookings]);
  const Stat = ({ label, value, sub }) => (
    <div style={{ background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14 }}>
      <div style={{ color: T.mute, fontSize: 10, fontWeight: 700, letterSpacing: ".06em" }}>{label}</div>
      <div className="m-h m-num" style={{ fontSize: 24, marginTop: 4 }}>₱{value.toLocaleString()}</div>
      <div className="m-num" style={{ color: T.fg2, fontSize: 11, marginTop: 2 }}>{sub}</div>
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      <Stat label="THIS WEEK" value={stats.weekRev} sub={`${stats.weekCount} booking${stats.weekCount !== 1 ? "s" : ""}`} />
      <Stat label="ALL TIME" value={stats.allRev} sub={`${stats.allCount} booking${stats.allCount !== 1 ? "s" : ""}`} />
    </div>
  );
}

function PendingCard({ b, conflict, onOpen, onApprove, onDecline }) {
  return (
    <Card onClick={onOpen} style={{ marginBottom: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <Avatar name={b.client} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <div className="m-serif" style={{ fontSize: 15, color: T.fg, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{b.client}</div>
            <div className="m-num" style={{ color: T.fg, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", textAlign: "right", lineHeight: 1.2 }}>
              {DAY_LABEL(b.date).short}
              <div style={{ color: T.fg2, fontSize: 11, fontWeight: 500, marginTop: 1 }}>{fmtRange(b.time, b.dur)}</div>
            </div>
          </div>
          {b.phone && (
            <a href={`tel:${b.phone}`} onClick={e => e.stopPropagation()} className="m-num"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.fg2, fontSize: 12, marginTop: 3, textDecoration: "none" }}>
              <Phone size={10} /> {b.phone}
            </a>
          )}
          {b.service && <div style={{ color: T.mute, fontSize: 11, marginTop: 2 }}>{b.service}{b.amount>0 && ` · ₱${b.amount.toLocaleString()}`}</div>}
        </div>
      </div>
      {b.note && <div style={{ marginTop: 8, background: T.ink3, borderRadius: 10, padding: "7px 10px", color: T.fg2, fontSize: 12, lineHeight: 1.4 }}>{b.note}</div>}
      {conflict && (
        <div style={{ marginTop: 8, background: T.warnSoft, color: T.warn, border: `1px solid ${T.warn}44`, borderRadius: 10, padding: "6px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={12} /> {conflict}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
        <Btn kind="ghost" size="sm" onClick={onDecline} style={{ flex: 1 }}><X size={14} /> Decline</Btn>
        <Btn kind="primary" size="sm" onClick={onApprove} style={{ flex: 1.3 }}><Check size={14} /> Approve</Btn>
      </div>
    </Card>
  );
}

function Pending({ bookings, conflictFor, onOpen, onApprove, onDecline, bookingLink, onShowQR }) {
  const pend = bookings.filter(b => b.status === "pending");
  return (
    <div className="m-in">
      <LinkCard bookingLink={bookingLink} onShowQR={onShowQR} />
      <StatsRow bookings={bookings} />
      {pend.length > 0 && (
        <div className="m-num" style={{ color: T.warn, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", marginBottom: 10 }}>
          {pend.length} WAITING FOR APPROVAL
        </div>
      )}
      {pend.length === 0 && (
        <div style={{ background: T.ink2, border: `1px dashed ${T.line2}`, borderRadius: 16, padding: "30px 20px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 99, background: T.limeSoft, color: T.lime, display: "grid", placeItems: "center" }}><Check size={20} /></div>
          </div>
          <div className="m-serif" style={{ fontSize: 16, color: T.fg }}>All caught up.</div>
          <div style={{ color: T.fg2, fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>Share your link or QR — new requests land here.</div>
        </div>
      )}
      {pend.map(b => (
        <PendingCard key={b.id} b={b} conflict={conflictFor(b)} onOpen={() => onOpen(b)} onApprove={() => onApprove(b.id)} onDecline={() => onDecline(b)} />
      ))}
    </div>
  );
}

function Calendar({ bookings, blocked, toggleBlock, onOpen, startH = 6, endH = 21 }) {
  const [sel, setSel] = useState(TODAY);
  const days = useMemo(() => {
    const arr = []; const t = new Date(); t.setHours(0,0,0,0);
    for (let i = 0; i < 14; i++) { const d = new Date(t); d.setDate(t.getDate() + i); arr.push(dateKey(d)); }
    return arr;
  }, []);
  const dayB = bookings.filter(b => b.date === sel && !["declined","completed"].includes(b.status));
  const bookedByHour = new Map();
  for (const b of dayB) {
    const H = parseInt(String(b.time).slice(0,2), 10);
    for (let h = H; h < H + b.dur; h++) bookedByHour.set(h, b);
  }
  const blocks = new Set([...blocked].filter(k => k.startsWith(sel + "_")).map(k => parseInt(k.split("_")[1].slice(0,2), 10)));
  const rows = [];
  for (let h = startH; h <= endH; h++) {
    const b = bookedByHour.get(h);
    if (b) rows.push({ h, kind: b.status === "pending" ? "pending" : "booked", b });
    else if (blocks.has(h)) rows.push({ h, kind: "blocked" });
    else rows.push({ h, kind: "free" });
  }
  return (
    <div className="m-in">
      <h2 className="m-h" style={{ fontSize: 22, margin: "0 0 14px" }}>Calendar</h2>
      <div className="m-noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 12px", margin: "0 -16px 16px", paddingLeft: 16, paddingRight: 16 }}>
        {days.map(dk => {
          const dl = DAY_LABEL(dk);
          const active = dk === sel;
          const isTd = dk === TODAY;
          const count = bookings.filter(b => b.date === dk && ["pending","upcoming","active"].includes(b.status)).length;
          return (
            <button key={dk} onClick={() => setSel(dk)} className="m-tap"
              style={{ flexShrink: 0, background: active?T.lime:T.ink2, color: active?T.limeInk:T.fg, border: `1px solid ${active?T.lime:T.line}`, borderRadius: 14, padding: "10px 12px", cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 60 }}>
              {isTd && !active && <span style={{ position: "absolute", top: 5, right: 8, width: 5, height: 5, borderRadius: 99, background: T.lime }} />}
              <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 600, letterSpacing: ".06em" }}>{dl.dow}</div>
              <div className="m-serif m-num" style={{ fontSize: 20, fontWeight: 600, marginTop: 1 }}>{dl.dnum}</div>
              <div style={{ fontSize: 9, opacity: 0.65 }}>{dl.dmon}</div>
              {count > 0 && !active && <div className="m-num" style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: T.lime }}>{count}</div>}
            </button>
          );
        })}
      </div>
      <div>
        {rows.map(r => (
          <div key={r.h} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0" }}>
            <div className="m-num" style={{ width: 52, fontSize: 12, color: T.mute, textAlign: "right" }}>{fmt12short(`${String(r.h).padStart(2,"0")}:00`)}</div>
            {r.kind === "booked" && (
              <div onClick={() => onOpen(r.b)} className="m-tap" style={{ flex: 1, background: T.limeSoft, border: `1px solid ${T.limeSoft2}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={r.b.client} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="m-h" style={{ color: T.fg, fontSize: 13 }}>{r.b.client}</div>
                  <div className="m-num" style={{ color: T.fg2, fontSize: 11 }}>{fmtRange(r.b.time, r.b.dur)}</div>
                </div>
                <ChevronRight size={14} style={{ color: T.mute }} />
              </div>
            )}
            {r.kind === "pending" && (
              <div onClick={() => onOpen(r.b)} className="m-tap" style={{ flex: 1, background: T.warnSoft, border: `1px solid ${T.warn}44`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={r.b.client} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="m-h" style={{ color: T.fg, fontSize: 13 }}>{r.b.client} <span style={{ color: T.warn, fontSize: 11, fontWeight: 700, marginLeft: 4 }}>· pending</span></div>
                  <div className="m-num" style={{ color: T.fg2, fontSize: 11 }}>{fmtRange(r.b.time, r.b.dur)}</div>
                </div>
                <ChevronRight size={14} style={{ color: T.mute }} />
              </div>
            )}
            {r.kind === "blocked" && (
              <button onClick={() => toggleBlock(sel, `${String(r.h).padStart(2,"0")}:00`)} className="m-tap" style={{ flex: 1, background: `repeating-linear-gradient(45deg, ${T.ink2}, ${T.ink2} 6px, ${T.ink3} 6px, ${T.ink3} 12px)`, border: `1px solid ${T.line2}`, borderRadius: 12, padding: "10px 12px", color: T.mute, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Ban size={12} /> Blocked — tap to free
              </button>
            )}
            {r.kind === "free" && (
              <button onClick={() => toggleBlock(sel, `${String(r.h).padStart(2,"0")}:00`)} className="m-tap" style={{ flex: 1, background: "transparent", border: `1px dashed ${T.line2}`, borderRadius: 12, padding: "10px 12px", color: T.mute, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={11} /> Free
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bookings({ bookings, onOpen }) {
  const [q, setQ] = useState(""); const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => {
    let arr = bookings;
    if (filter !== "all") arr = arr.filter(b => b.status === filter);
    if (q.trim()) { const s = q.toLowerCase(); arr = arr.filter(b => (b.client||"").toLowerCase().includes(s) || (b.phone||"").includes(s)); }
    return arr.sort((a,b) => (a.date+a.time) > (b.date+b.time) ? -1 : 1);
  }, [bookings, q, filter]);
  return (
    <div className="m-in">
      <h2 className="m-h" style={{ fontSize: 22, margin: "0 0 14px" }}>All bookings</h2>
      <Input icon={Search} value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or phone" />
      <div className="m-noscroll" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 2px 8px", margin: "0 -16px", paddingLeft: 16, paddingRight: 16 }}>
        {[["all","All"],["upcoming","Upcoming"],["active","Now"],["completed","Done"],["declined","Declined"]].map(([k,label]) => {
          const on = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)} className="m-tap" style={{ flexShrink: 0, background: on?T.lime:T.ink2, color: on?T.limeInk:T.fg, border: `1px solid ${on?T.lime:T.line}`, borderRadius: 99, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
          );
        })}
      </div>
      <div className="m-num" style={{ color: T.mute, fontSize: 11, margin: "6px 2px 10px", fontWeight: 600, letterSpacing: ".04em" }}>
        {filtered.length} {filtered.length === 1 ? "BOOKING" : "BOOKINGS"}
      </div>
      {filtered.length === 0 && (
        <div style={{ background: T.ink2, border: `1px dashed ${T.line2}`, borderRadius: 16, padding: 30, textAlign: "center", color: T.fg2, fontSize: 14 }}>
          <ListChecks size={24} style={{ color: T.mute, marginBottom: 8 }} />
          <div className="m-serif" style={{ fontSize: 16, color: T.fg }}>Nothing here yet.</div>
        </div>
      )}
      {filtered.map(b => (
        <Card key={b.id} onClick={() => onOpen(b)} style={{ marginBottom: 8, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={b.client} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="m-h" style={{ color: T.fg, fontSize: 14 }}>{b.client}</div>
                <StatusChip status={b.status} />
              </div>
              <div className="m-num" style={{ color: T.fg2, fontSize: 12, marginTop: 2 }}>
                {DAY_LABEL(b.date).short} · {fmtRange(b.time, b.dur)}
              </div>
              {b.service && <div style={{ color: T.mute, fontSize: 11, marginTop: 2 }}>{b.service}</div>}
            </div>
            <ChevronRight size={16} style={{ color: T.mute, flexShrink: 0 }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─── Sheets ─────────────────────────────────────────────────── */
function WaitlistTab({ items, onNotify, onRemove }) {
  const waiting = items.filter(w => w.status === "waiting");
  const notified = items.filter(w => w.status === "notified");
  return (
    <div className="m-in">
      <h2 className="m-h" style={{ fontSize: 22, margin: "0 0 6px" }}>Waitlist</h2>
      <p style={{ color: T.fg2, fontSize: 13, margin: "0 0 18px", lineHeight: 1.5 }}>Customers waiting for an open slot. When one opens up, text them first.</p>

      {items.length === 0 && (
        <div style={{ background: T.ink2, border: `1px dashed ${T.line2}`, borderRadius: 14, padding: "28px 20px", textAlign: "center" }}>
          <ClipboardList size={22} style={{ color: T.mute, marginBottom: 10 }} />
          <div className="m-h" style={{ fontSize: 15, color: T.fg }}>Nobody waiting yet.</div>
          <div style={{ color: T.fg2, fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>When a day fills up, customers can join your waitlist.</div>
        </div>
      )}

      {waiting.length > 0 && (
        <div className="m-num" style={{ color: T.warn, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", marginBottom: 10 }}>
          {waiting.length} WAITING
        </div>
      )}
      {waiting.map(w => <WaitRow key={w.id} w={w} onNotify={onNotify} onRemove={onRemove} />)}

      {notified.length > 0 && (
        <div className="m-num" style={{ color: T.mute, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", margin: "20px 0 10px" }}>
          NOTIFIED
        </div>
      )}
      {notified.map(w => <WaitRow key={w.id} w={w} onNotify={onNotify} onRemove={onRemove} />)}
    </div>
  );
}

function WaitRow({ w, onNotify, onRemove }) {
  const [copied, setCopied] = useState(false);
  const smsCopy = () => {
    const first = (w.client_name || "").split(" ")[0];
    const dateLabel = DAY_LABEL(w.date).full;
    const msg = `Hi ${first}! Good news — may open slot na po on ${dateLabel}${w.service ? ` for ${w.service}` : ""}. Pwede po ba to book? Reply niyo na lang po para ma-confirm.`;
    navigator.clipboard?.writeText(msg);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Card style={{ marginBottom: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <Avatar name={w.client_name} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <div className="m-h" style={{ fontSize: 15, color: T.fg }}>{w.client_name}</div>
            <div className="m-num" style={{ color: T.fg2, fontSize: 11, fontWeight: 600, textAlign: "right" }}>{DAY_LABEL(w.date).short}</div>
          </div>
          <a href={`tel:${w.client_phone}`} className="m-num" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.fg2, fontSize: 12, marginTop: 3, textDecoration: "none" }}>
            <Phone size={10} /> {w.client_phone}
          </a>
          {w.service && <div style={{ color: T.mute, fontSize: 11, marginTop: 2 }}>{w.service}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <Btn kind="ghost" size="sm" onClick={() => onRemove(w.id)} style={{ flex: 1 }}><X size={13} /> Remove</Btn>
        <Btn kind="primary" size="sm" onClick={() => { smsCopy(); onNotify(w.id); }} style={{ flex: 1.4 }}>
          {copied ? <><Check size={13} /> SMS copied</> : <><Phone size={13} /> Copy SMS + mark</>}
        </Btn>
      </div>
    </Card>
  );
}

function DetailSheet({ booking: b, profileName, onClose, onApprove, onDecline, onComplete, onNoShow }) {
  const [smsCopied, setSmsCopied] = useState(false);
  if (!b) return null;
  const copySMS = () => {
    const first = (b.client || "").split(" ")[0];
    const day = DAY_LABEL(b.date).full;
    const msg = `Hi ${first}! Confirmed na booking mo sa ${profileName} on ${day} at ${fmt12(b.time)}. See you! — ${profileName}`;
    navigator.clipboard?.writeText(msg);
    setSmsCopied(true); setTimeout(() => setSmsCopied(false), 1600);
  };
  return (
    <Sheet open={!!b} onClose={onClose} title={b.client}>
      <div style={{ marginTop: 6, marginBottom: 14 }}><StatusChip status={b.status} /></div>
      <div style={{ background: T.ink, border: `1px solid ${T.line}`, borderRadius: 14, padding: "4px 14px", marginBottom: 14 }}>
        <DetailRow label="Service" value={b.service || "Session"} />
        <DetailRow label="When" value={`${DAY_LABEL(b.date).full} · ${fmtRange(b.time, b.dur)}`} />
        {b.amount > 0 && <DetailRow label="Price" value={`₱${b.amount.toLocaleString()}`} />}
        {b.phone && (
          <div style={{ padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.line}`, gap: 12 }}>
            <span style={{ color: T.mute, fontSize: 12 }}>Phone</span>
            <a href={`tel:${b.phone}`} className="m-num m-tap" style={{ color: T.lime, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Phone size={12} /> {b.phone}
            </a>
          </div>
        )}
        {b.note && <DetailRow label="Note" value={b.note} multiline />}
        <DetailRow label="Via" value={b.via} last />
      </div>
      {b.status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" onClick={() => onDecline(b)} style={{ flex: 1 }}><X size={15} /> Decline</Btn>
          <Btn kind="primary" onClick={() => onApprove(b.id)} style={{ flex: 1.3 }}><Check size={15} /> Approve</Btn>
        </div>
      )}
      {(b.status === "upcoming" || b.status === "active") && (
        <>
          <Btn kind="soft" onClick={copySMS} style={{ width: "100%", marginBottom: 8 }}>
            {smsCopied ? <><Check size={15} /> SMS message copied</> : <><Phone size={14} /> Copy confirmation SMS</>}
          </Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" onClick={() => onNoShow(b.id)} style={{ flex: 1 }}>No-show</Btn>
            <Btn kind="primary" onClick={() => onComplete(b.id)} style={{ flex: 1.3 }}><Check size={15} /> Mark complete</Btn>
          </div>
        </>
      )}
    </Sheet>
  );
}
function DetailRow({ label, value, multiline, last }) {
  return (
    <div style={{ padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: multiline?"flex-start":"center", gap: 12, borderBottom: last?"none":`1px solid ${T.line}` }}>
      <span style={{ color: T.mute, fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.fg, fontSize: 14, fontWeight: 500, textAlign: "right", maxWidth: "70%", lineHeight: multiline?1.5:1.3 }}>{value}</span>
    </div>
  );
}

function ConfirmDecline({ booking: b, onClose, onConfirm }) {
  if (!b) return null;
  return (
    <Sheet open={!!b} onClose={onClose} title="Decline this booking?">
      <p style={{ color: T.fg2, fontSize: 14, margin: "6px 0 20px", lineHeight: 1.5 }}>
        <b style={{ color: T.fg }}>{b.client}</b> will be told the time isn't available.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind="soft" onClick={onClose} style={{ flex: 1 }}>Keep</Btn>
        <Btn kind="danger" onClick={onConfirm} style={{ flex: 1 }}><X size={15} /> Decline</Btn>
      </div>
    </Sheet>
  );
}

function SettingsSheet({ open, onClose, profile, services, onSave, onSaveServices, onLogout }) {
  const [name, setName] = useState(profile?.name || "");
  const [kind, setKind] = useState(profile?.sport || "");
  const [startH, setStartH] = useState(profile?.start_hour ?? 8);
  const [endH, setEndH] = useState(profile?.end_hour ?? 20);
  const [info, setInfo] = useState(profile?.info || "");
  const [svcList, setSvcList] = useState(services);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && profile) {
    setName(profile.name || ""); setKind(profile.sport || "");
    setStartH(profile.start_hour ?? 8); setEndH(profile.end_hour ?? 20);
    setInfo(profile.info || ""); setSvcList(services);
  } }, [open, profile, services]);
  if (!open) return null;

  async function save() {
    setSaving(true);
    await onSave({ name: name.trim(), sport: kind.trim(), start_hour: startH, end_hour: endH, info: info.trim() });
    await onSaveServices(svcList);
    setSaving(false);
    onClose();
  }
  function addSvc() { setSvcList(a => [...a, { name: "New service", duration_hours: 1, price: 500, sort_order: a.length }]); }
  function rmSvc(i) { setSvcList(a => a.filter((_, j) => j !== i)); }
  function editSvc(i, k, v) { setSvcList(a => a.map((s, j) => j === i ? { ...s, [k]: v } : s)); }

  const hours = Array.from({length: 18}, (_, i) => 5 + i);
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <Eyebrow>Business name</Eyebrow>
      <Input value={name} onChange={e => setName(e.target.value)} />
      <div style={{ height: 12 }} />
      <Eyebrow>What you do</Eyebrow>
      <Input value={kind} onChange={e => setKind(e.target.value)} />
      <div style={{ height: 12 }} />
      <Eyebrow>Working hours</Eyebrow>
      <div style={{ display: "flex", gap: 10 }}>
        <select value={startH} onChange={e => setStartH(parseInt(e.target.value))} style={selStyle()}>
          {hours.map(h => <option key={h} value={h}>{fmt12(`${String(h).padStart(2,"0")}:00`)}</option>)}
        </select>
        <select value={endH} onChange={e => setEndH(parseInt(e.target.value))} style={selStyle()}>
          {hours.map(h => <option key={h} value={h}>{fmt12(`${String(h).padStart(2,"0")}:00`)}</option>)}
        </select>
      </div>
      <div style={{ height: 16 }} />
      <Eyebrow>Location / notes</Eyebrow>
      <textarea value={info} onChange={e => setInfo(e.target.value)} rows={2} placeholder="e.g. Marikina, near Sports Center" style={{ width: "100%", background: T.ink2, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 15px", color: T.fg, fontSize: 15, resize: "vertical", lineHeight: 1.4 }} />

      <div style={{ height: 22 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <Eyebrow>Services</Eyebrow>
        <button onClick={addSvc} className="m-tap" style={{ background: "transparent", border: "none", color: T.lime, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} /> Add</button>
      </div>
      {svcList.map((s, i) => (
        <div key={i} style={{ background: T.ink, border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input value={s.name} onChange={e => editSvc(i, "name", e.target.value)} style={{ background: "transparent", border: "none", color: T.fg, fontSize: 14, fontWeight: 600, width: "100%", padding: 0, outline: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <input type="text" inputMode="decimal" value={s.duration_hours} onChange={e => editSvc(i, "duration_hours", parseFloat(e.target.value)||1)} style={{ width: 44, background: T.ink2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "3px 6px", color: T.fg2, fontSize: 12, boxSizing: "border-box", MozAppearance: "textfield" }} />
              <span style={{ color: T.mute, fontSize: 12 }}>hr · ₱</span>
              <input type="text" inputMode="numeric" value={s.price} onChange={e => editSvc(i, "price", parseInt(e.target.value)||0)} style={{ width: 62, background: T.ink2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "3px 6px", color: T.fg2, fontSize: 12, boxSizing: "border-box", MozAppearance: "textfield" }} />
            </div>
          </div>
          <button onClick={() => rmSvc(i)} className="m-tap" style={{ background: "transparent", border: "none", color: T.mute, cursor: "pointer", padding: 8 }}><Trash2 size={14} /></button>
        </div>
      ))}
      <div style={{ height: 22 }} />

      <Btn kind="primary" size="lg" onClick={save} busy={saving} style={{ width: "100%", marginBottom: 10 }}>Save changes</Btn>
      <Btn kind="ghost" onClick={onLogout} style={{ width: "100%" }}><LogOut size={14} /> Log out</Btn>
    </Sheet>
  );
}

/* ─── App shell ──────────────────────────────────────────────── */
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [view, setView] = useState("dashboard"); // dashboard | qr
  const [tab, setTab] = useState("pending");
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [blocked, setBlocked] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadAll(coach) {
    const [{ data: bk }, { data: bl }, { data: sv }, { data: wl }] = await Promise.all([
      supabase.from("bookings").select("*").eq("coach_id", coach.id).order("date").order("time"),
      supabase.from("blocked_slots").select("*").eq("coach_id", coach.id),
      supabase.from("services").select("*").eq("coach_id", coach.id).order("sort_order"),
      supabase.from("waitlist").select("*").eq("coach_id", coach.id).order("created_at", { ascending: false }),
    ]);
    setBookings((bk || []).map(mapBooking));
    setBlocked(new Set((bl || []).map(x => `${x.date}_${String(x.hour).slice(0,5)}`)));
    setServices(sv || []);
    setWaitlist(wl || []);
  }

  useEffect(() => {
    if (!session) { setProfile(null); setBookings([]); setBlocked(new Set()); setServices([]); return; }
    let cancel = false;
    (async () => {
      setLoadingData(true);
      const { data: coach } = await supabase.from("coaches").select("*").eq("user_id", session.user.id).maybeSingle();
      if (cancel) return;
      setProfile(coach || null);
      if (coach) await loadAll(coach);
      setLoadingData(false);
    })();
    return () => { cancel = true; };
  }, [session]);

  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel(`bk-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `coach_id=eq.${profile.id}` }, () => loadAll(profile))
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist", filter: `coach_id=eq.${profile.id}` }, () => loadAll(profile))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const setLocal = (id, patch) => setBookings(bs => bs.map(x => x.id === id ? { ...x, ...patch } : x));
  const live = bookings.filter(b => ["upcoming","active"].includes(b.status));
  const conflictFor = (p) => {
    const hit = live.find(b => overlaps(p, b));
    if (hit) return `Overlaps with ${hit.client} (${fmt12(hit.time)})`;
    for (let h = parseInt(String(p.time).slice(0,2), 10); h < parseInt(String(p.time).slice(0,2), 10) + p.dur; h++) {
      if (blocked.has(`${p.date}_${String(h).padStart(2,"0")}:00`)) return "Falls on a blocked hour";
    }
    return null;
  };
  const approve = async (id) => {
    const b = bookings.find(x => x.id === id); if (!b) return;
    setLocal(id, { status: "upcoming" });
    await supabase.from("bookings").update({ status: "upcoming" }).eq("id", id);
    setToast({ msg: `Approved — ${b.client.split(" ")[0]} will be notified.`,
      undo: async () => { setLocal(id, { status: "pending" }); await supabase.from("bookings").update({ status: "pending" }).eq("id", id); setToast(null); } });
  };
  const doDecline = async (id) => {
    const b = bookings.find(x => x.id === id); if (!b) return;
    setLocal(id, { status: "declined" });
    setConfirm(null); setDetail(null);
    await supabase.from("bookings").update({ status: "declined" }).eq("id", id);
    setToast({ msg: `Declined ${b.client.split(" ")[0]}.`,
      undo: async () => { setLocal(id, { status: "pending" }); await supabase.from("bookings").update({ status: "pending" }).eq("id", id); setToast(null); } });
  };
  const complete = async (id) => { setLocal(id, { status: "completed" }); setDetail(null); await supabase.from("bookings").update({ status: "completed" }).eq("id", id); setToast({ msg: "Marked complete." }); };
  const noShow = async (id) => { setLocal(id, { status: "declined" }); setDetail(null); await supabase.from("bookings").update({ status: "declined" }).eq("id", id); setToast({ msg: "Marked as no-show." }); };
  const toggleBlock = async (sel, h) => {
    if (!profile) return;
    const key = `${sel}_${h}`;
    if (blocked.has(key)) {
      setBlocked(s => { const n = new Set(s); n.delete(key); return n; });
      await supabase.from("blocked_slots").delete().eq("coach_id", profile.id).eq("date", sel).eq("hour", `${h}:00`);
    } else {
      setBlocked(s => new Set(s).add(key));
      await supabase.from("blocked_slots").insert({ coach_id: profile.id, date: sel, hour: `${h}:00` });
    }
  };
  const saveSettings = async (patch) => {
    if (!profile) return;
    await supabase.from("coaches").update(patch).eq("id", profile.id);
    setProfile(p => ({ ...p, ...patch }));
    setToast({ msg: "Settings saved." });
  };
  const saveServices = async (list) => {
    if (!profile) return;
    await supabase.from("services").delete().eq("coach_id", profile.id);
    if (list.length > 0) {
      const rows = list.map((s, i) => ({ coach_id: profile.id, name: s.name, duration_hours: s.duration_hours, price: s.price, sort_order: i }));
      await supabase.from("services").insert(rows);
    }
    const { data: sv } = await supabase.from("services").select("*").eq("coach_id", profile.id).order("sort_order");
    setServices(sv || []);
  };
  const removeWaitlist = async (id) => {
    setWaitlist(w => w.filter(x => x.id !== id));
    await supabase.from("waitlist").delete().eq("id", id);
    setToast({ msg: "Removed from waitlist." });
  };
  const markNotified = async (id) => {
    setWaitlist(w => w.map(x => x.id === id ? { ...x, status: "notified" } : x));
    await supabase.from("waitlist").update({ status: "notified" }).eq("id", id);
    setToast({ msg: "Marked as notified." });
  };
  const logout = async () => { setSettingsOpen(false); await supabase.auth.signOut(); };
  const onWizardDone = async () => {
    const { data: coach } = await supabase.from("coaches").select("*").eq("id", profile.id).single();
    setProfile(coach);
    await loadAll(coach);
  };

  // ── Gates ──
  if (authLoading) return <div className="m-body" style={{ minHeight: "100vh", background: T.ink, display: "grid", placeItems: "center" }}><style>{FONTS}</style><Loader2 size={22} className="m-spin" style={{ color: T.mute }} /></div>;
  if (!session) return <AuthScreen />;
  if (loadingData && !profile) return <div className="m-body" style={{ minHeight: "100vh", background: T.ink, display: "grid", placeItems: "center", color: T.mute, fontSize: 14 }}><style>{FONTS}</style>Setting things up…</div>;
  if (!profile) return <div className="m-body" style={{ minHeight: "100vh", background: T.ink, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}><style>{FONTS}</style><div><Mark size={40} /><h1 className="m-serif" style={{ fontSize: 24, marginTop: 20 }}>Almost there</h1><p style={{ color: T.fg2, fontSize: 14, margin: "8px 0 20px" }}>Your account needs a business profile.</p><Btn kind="primary" onClick={logout}>Log out</Btn></div></div>;

  // ── Wizard until onboarded ──
  if (!profile.is_onboarded) return <Wizard profile={profile} onDone={onWizardDone} />;

  // ── QR view ──
  if (view === "qr") return <QRPage profile={profile} onBack={() => setView("dashboard")} />;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bookingLink = `${origin}/book/${profile.slug}`;
  const pendCount = bookings.filter(b => b.status === "pending").length;
  const todays = bookings.filter(b => b.date === TODAY && ["upcoming","active"].includes(b.status)).sort((a,b) => a.time < b.time ? -1 : 1);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
  const first = (profile.name || "").split(" ")[0] || "you";
  const sub = todays.length === 0 ? "No sessions today." : `${todays.length} session${todays.length > 1 ? "s" : ""} today · next ${fmt12(todays[0].time)}`;

  const waitCount = waitlist.filter(w => w.status === "waiting").length;
  const TABS = [
    { id: "pending", label: "Pending", icon: Inbox, badge: pendCount },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "bookings", label: "Bookings", icon: ListChecks },
    { id: "waitlist", label: "Waitlist", icon: ClipboardList, badge: waitCount },
  ];

  return (
    <div className="m-body" style={{ background: T.ink, minHeight: "100vh" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", background: T.ink, minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column", borderLeft: `1px solid ${T.line}`, borderRight: `1px solid ${T.line}` }}>
        <header style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${T.line}`, background: T.ink, position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mark size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div className="m-h" style={{ fontSize: 16, lineHeight: 1.1 }}>{greet}, {first}</div>
                <span className="m-num" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.limeSoft, color: T.lime, border: `1px solid ${T.limeSoft2}`, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700, lineHeight: 1.3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: T.lime }} /> LIVE
                </span>
              </div>
              <div className="m-num" style={{ color: T.mute, fontSize: 11, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
            </div>
            <button onClick={() => setSettingsOpen(true)} aria-label="Settings" className="m-tap" style={{ background: "transparent", border: "none", color: T.fg2, cursor: "pointer", padding: 8 }}>
              <Settings size={18} />
            </button>
          </div>
        </header>
        <main className="m-noscroll" style={{ flex: 1, overflowY: "auto", padding: "20px 18px 100px" }}>
          {tab === "pending"  && <Pending bookings={bookings} conflictFor={conflictFor} onOpen={setDetail} onApprove={approve} onDecline={setConfirm} bookingLink={bookingLink} onShowQR={() => setView("qr")} />}
          {tab === "calendar" && <Calendar bookings={bookings} blocked={blocked} toggleBlock={toggleBlock} onOpen={setDetail} startH={profile.start_hour ?? 8} endH={profile.end_hour ?? 20} />}
          {tab === "bookings" && <Bookings bookings={bookings} onOpen={setDetail} />}
          {tab === "waitlist" && <WaitlistTab items={waitlist} onNotify={markNotified} onRemove={removeWaitlist} />}
        </main>
        {toast && <Toast msg={toast.msg} onUndo={toast.undo} />}
        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: T.ink, borderTop: `1px solid ${T.line}`, display: "flex", padding: `10px 10px calc(14px + env(safe-area-inset-bottom))`, zIndex: 40 }}>
          {TABS.map(({ id, label, icon: Icon, badge }) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} className="m-tap" style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: on?T.lime:T.mute, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", padding: "5px 0" }}>
                <Icon size={20} strokeWidth={on ? 2.5 : 2} />
                <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 600 }}>{label}</span>
                {badge > 0 && <span className="m-num" style={{ position: "absolute", top: -2, right: "24%", background: T.lime, color: T.limeInk, fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "0px 5px", lineHeight: "15px", minWidth: 15, textAlign: "center" }}>{badge}</span>}
              </button>
            );
          })}
        </nav>
        <DetailSheet booking={detail} profileName={profile.name} onClose={() => setDetail(null)} onApprove={approve} onDecline={setConfirm} onComplete={complete} onNoShow={noShow} />
        <ConfirmDecline booking={confirm} onClose={() => setConfirm(null)} onConfirm={() => doDecline(confirm.id)} />
        <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} profile={profile} services={services} onSave={saveSettings} onSaveServices={saveServices} onLogout={logout} />
      </div>
    </div>
  );
}
