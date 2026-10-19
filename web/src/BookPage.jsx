// ─────────────────────────────────────────────────────────────────
// MatchUp · Public booking page (v2, reads real services)
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import {
  Calendar, Clock, ChevronRight, ChevronLeft, Check, User, Phone,
  Loader2, ArrowLeft, Info, ShieldCheck, Sparkles,
} from "lucide-react";

const C = {
  ink:"#0F1114", ink2:"#171A20", ink3:"#1E222A",
  line:"#252932", line2:"#333844",
  fg:"#F1F3F6", fg2:"#B7BDC7", mute:"#7C8290",
  lime:"#B9F531", limeInk:"#0F1114", limeSoft:"#B9F53119",
  err:"#F08C7A", errSoft:"#F08C7A18",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body, #root { margin: 0; padding: 0; background: ${C.ink}; }
body { text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
.b-body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: ${C.fg}; }
.b-serif { font-family: 'Space Grotesk', -apple-system, system-ui, sans-serif; letter-spacing: -0.02em; font-weight: 600; }
.b-num { font-variant-numeric: tabular-nums; }
.b-tap { transition: transform .08s, background .18s, border-color .18s; }
.b-tap:active { transform: scale(.98); }
.b-focus:focus { outline: none; border-color: ${C.lime}; box-shadow: 0 0 0 3px ${C.lime}33; }
@keyframes b-spin { to { transform: rotate(360deg); } } .b-spin { animation: b-spin .8s linear infinite; }
@keyframes b-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.b-in { animation: b-in .28s cubic-bezier(.2,.6,.2,1) both; }
input, button, textarea { font-family: inherit; }
input::placeholder { color: ${C.mute}; }
input:-webkit-autofill { -webkit-text-fill-color: ${C.fg}; -webkit-box-shadow: 0 0 0 1000px ${C.ink2} inset; transition: background-color 9999s; }
`;

const fmt12 = (hhmm) => { const [H,M]=hhmm.split(":").map(Number); return `${((H+11)%12)+1}:${String(M).padStart(2,"0")}${H>=12?"pm":"am"}`; };
const dateKey = (d) => d.toLocaleDateString("en-CA");
const dow = (d) => d.toLocaleDateString("en-PH",{weekday:"short"}).toUpperCase();
const validPHMobile = (raw) => /^(\+?63|0)9\d{9}$/.test(String(raw||"").replace(/[\s\-()]/g,""));
const cleanMobile = (raw) => String(raw||"").replace(/[\s\-()]/g,"");

function Mark({ size = 28 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.26, background:C.lime, display:"grid", placeItems:"center", flexShrink:0 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M13 47 L23 19 L32 40 L41 19 L51 47" fill="none" stroke={C.limeInk} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function BookPage({ slug }) {
  const [biz, setBiz] = useState(null);
  const [services, setServices] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [selDate, setSelDate] = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [dayBlocked, setDayBlocked] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!slug) { setLoadErr("This link is missing a business."); return; }
      const { data: b, error } = await supabase.from("coaches")
        .select("id, name, slug, sport, working_hours, info, rate, start_hour, end_hour, is_onboarded, deposit_amount")
        .eq("slug", slug).maybeSingle();
      if (cancel) return;
      if (error || !b) { setLoadErr("This booking page doesn't exist yet."); return; }
      if (!b.is_onboarded) { setLoadErr("This business is still setting up. Check back soon."); return; }
      setBiz(b);
      const { data: sv } = await supabase.from("services").select("*").eq("coach_id", b.id).order("sort_order");
      if (cancel) return;
      setServices(sv || []);
    })();
    return () => { cancel = true; };
  }, [slug]);

  const days = useMemo(() => {
    const arr = []; const t = new Date(); t.setHours(0,0,0,0);
    for (let i = 0; i < 21; i++) { const d = new Date(t); d.setDate(t.getDate() + i); arr.push(d); }
    return arr;
  }, []);

  useEffect(() => {
    if (!biz || !selDate) return;
    let cancel = false;
    (async () => {
      setLoadingDay(true);
      const dk = dateKey(selDate);
      const [{ data: bk }, { data: bl }] = await Promise.all([
        supabase.from("bookings").select("time, duration_hours, status")
          .eq("coach_id", biz.id).eq("date", dk).in("status", ["pending","upcoming","active"]),
        supabase.from("blocked_slots").select("hour").eq("coach_id", biz.id).eq("date", dk),
      ]);
      if (cancel) return;
      setDayBookings(bk || []); setDayBlocked(bl || []); setLoadingDay(false);
    })();
    return () => { cancel = true; };
  }, [biz, selDate]);

  const openSlots = useMemo(() => {
    if (!biz || !selDate || !service) return [];
    const lo = biz.start_hour ?? 8, hi = biz.end_hour ?? 20;
    const taken = new Set();
    for (const b of dayBookings) {
      const s = parseInt(String(b.time).slice(0,2), 10);
      for (let h = s; h < s + (b.duration_hours || 1); h++) taken.add(h);
    }
    const blocked = new Set((dayBlocked||[]).map(x => parseInt(String(x.hour).slice(0,2), 10)));
    const now = new Date();
    const isToday = dateKey(selDate) === dateKey(now);
    const min = isToday ? now.getHours() + 1 : lo;
    const dur = Math.max(1, Math.round(service.duration_hours));
    const out = [];
    for (let h = Math.max(lo, min); h <= hi - dur; h++) {
      let ok = true;
      for (let k = 0; k < dur; k++) if (taken.has(h+k) || blocked.has(h+k)) { ok = false; break; }
      if (ok) out.push(`${String(h).padStart(2,"0")}:00`);
    }
    return out;
  }, [biz, selDate, service, dayBookings, dayBlocked]);

  const grouped = useMemo(() => {
    const g = { Morning: [], Afternoon: [], Evening: [] };
    for (const t of openSlots) {
      const h = parseInt(t.slice(0,2), 10);
      if (h < 12) g.Morning.push(t); else if (h < 17) g.Afternoon.push(t); else g.Evening.push(t);
    }
    return g;
  }, [openSlots]);

  useEffect(() => { if (topRef.current) topRef.current.scrollTop = 0; }, [step]);

  async function submitWaitlist() {
    setErr("");
    if (!name.trim() || name.trim().length < 2) { setErr("Please enter your full name."); return; }
    if (!validPHMobile(phone)) { setErr("Please enter a valid PH mobile number (e.g. 09171234567)."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("waitlist").insert({
        coach_id: biz.id,
        client_name: name.trim(),
        client_phone: cleanMobile(phone),
        service: service?.name || null,
        date: dateKey(selDate),
        time_pref: null,
        note: note.trim() || null,
        status: "waiting",
        via: "Web",
      });
      if (error) throw error;
      setWaitlistDone(true);
    } catch (e) {
      setErr("Something went wrong. Please try again.");
      console.error(e);
    } finally { setBusy(false); }
  }

  async function submit() {
    setErr("");
    if (!name.trim() || name.trim().length < 2) { setErr("Please enter your full name."); return; }
    if (!validPHMobile(phone)) { setErr("Please enter a valid PH mobile number (e.g. 09171234567)."); return; }
    setBusy(true);
    try {
      const dur = Math.max(1, Math.round(service.duration_hours));
      const { data, error } = await supabase.from("bookings").insert({
        coach_id: biz.id, client_name: name.trim(), client_phone: cleanMobile(phone),
        service: service.name, price: service.price,
        date: dateKey(selDate), time: `${selTime}:00`, duration_hours: dur,
        status: "pending", note: note.trim(), via: "Web",
      }).select().single();
      if (error) throw error;
      setDone(data);
    } catch (e) {
      setErr("Something went wrong. Please try again.");
      console.error(e);
    } finally { setBusy(false); }
  }

  if (loadErr) return (
    <Shell><style>{FONTS}</style>
      <div className="b-in" style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <Mark size={40} />
        <h1 className="b-serif" style={{ fontSize: 26, margin: "22px 0 8px" }}>Not found</h1>
        <p style={{ color: C.fg2, fontSize: 15, lineHeight: 1.5 }}>{loadErr}</p>
      </div>
    </Shell>
  );
  if (!biz) return (
    <Shell><style>{FONTS}</style>
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <Loader2 size={22} className="b-spin" style={{ color: C.mute }} />
      </div>
    </Shell>
  );
  if (waitlistDone) return (
    <Shell topRef={topRef}><style>{FONTS}</style>
      <div className="b-in" style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 60px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: C.lime, color: C.limeInk, display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
          <Check size={30} strokeWidth={2.6} />
        </div>
        <h1 style={{ fontSize: 26, textAlign: "center", margin: "0 0 10px", lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600 }}>You're on the waitlist.</h1>
        <p style={{ color: C.fg2, fontSize: 15, textAlign: "center", margin: "0 0 28px", lineHeight: 1.5, padding: "0 20px" }}>
          <b style={{ color: C.fg }}>{biz.name}</b> will text <span className="b-num" style={{ color: C.fg }}>{phone}</span> if a slot opens up on <b style={{ color: C.fg }}>{selDate.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}</b>.
        </p>
        <button onClick={() => { setStep(1); setService(null); setSelDate(null); setSelTime(null); setName(""); setPhone(""); setNote(""); setWaitlistDone(false); }} className="b-tap"
          style={{ display: "block", margin: "0 auto", background: "transparent", color: C.fg2, border: `1px solid ${C.line2}`, borderRadius: 999, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Book another time instead
        </button>
      </div>
    </Shell>
  );
  if (done) return (
    <Shell topRef={topRef}><style>{FONTS}</style>
      <div className="b-in" style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 60px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: C.lime, color: C.limeInk, display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
          <Check size={30} strokeWidth={2.6} />
        </div>
        <h1 style={{ fontSize: 26, textAlign: "center", margin: "0 0 10px", lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600 }}>Request received.</h1>
        <p style={{ color: C.fg2, fontSize: 15, textAlign: "center", margin: "0 0 28px", lineHeight: 1.5 }}>
          <b style={{ color: C.fg }}>{biz.name}</b> will confirm shortly. We'll text{" "}
          <span className="b-num" style={{ color: C.fg }}>{phone}</span> once it's confirmed.
        </p>
        <div style={{ background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 16, padding: "4px 18px" }}>
          <Row label="Service" value={service.name} />
          <Row label="Date" value={selDate.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })} />
          <Row label="Time" value={fmt12(selTime)} />
          <Row label="Duration" value={`${service.duration_hours} hour${service.duration_hours > 1 ? "s" : ""}`} />
          {service.price > 0 && <Row label="Price" value={`₱${service.price.toLocaleString()}`} />}
          <Row label="Name" value={name} />
          <Row label="Mobile" value={phone} last />
        </div>
        <button className="b-tap" onClick={() => { setStep(1); setService(null); setSelDate(null); setSelTime(null); setName(""); setPhone(""); setNote(""); setDone(null); }} style={{ display: "block", margin: "26px auto 0", background: "transparent", color: C.fg2, border: `1px solid ${C.line2}`, borderRadius: 999, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Book another time</button>
      </div>
    </Shell>
  );

  const canBack = step > 1 && step < 5;
  const progress = ((step - 1) / 3) * 100;

  return (
    <Shell topRef={topRef}><style>{FONTS}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: C.ink, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {canBack ? (
              <button onClick={() => setStep(s => s - 1)} className="b-tap" aria-label="Back" style={{ background: "transparent", border: "none", color: C.fg2, cursor: "pointer", padding: 6, marginLeft: -6 }}>
                <ArrowLeft size={20} />
              </button>
            ) : <Mark size={28} />}
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
              <div className="b-serif" style={{ fontSize: 15 }}>{biz.name}</div>
              <div style={{ color: C.mute, fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={10} /> Secure booking · MatchUp
              </div>
            </div>
          </div>
          <div style={{ height: 2, background: C.line, borderRadius: 99, marginTop: 12, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: C.lime, transition: "width .3s cubic-bezier(.2,.6,.2,1)" }} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 80px" }}>

        {step === 1 && (
          <div className="b-in">
            <Eyebrow n={1} of={3} label="Service" />
            <h1 className="b-serif" style={{ fontSize: 34, lineHeight: 1.05, margin: "6px 0 8px", letterSpacing: "-0.03em" }}>
              Book with<br /><span style={{ color: C.lime }}>{biz.name}</span>.
            </h1>
            <p style={{ color: C.fg2, fontSize: 15, margin: "0 0 26px", lineHeight: 1.5 }}>Pick a service to get started.</p>
            {services.length === 0 ? (
              <div style={{ background: C.ink2, border: `1px dashed ${C.line2}`, borderRadius: 14, padding: 24, textAlign: "center", color: C.fg2 }}>
                No services listed yet.
              </div>
            ) : services.map(sv => (
              <button key={sv.id} onClick={() => { setService(sv); setStep(2); }} className="b-tap"
                style={{ width: "100%", background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", textAlign: "left", cursor: "pointer", color: C.fg, display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{sv.name}</div>
                  <div className="b-num" style={{ color: C.fg2, fontSize: 13, marginTop: 2 }}>
                    {sv.duration_hours} hr{sv.duration_hours > 1 ? "s" : ""} · {sv.price > 0 ? `₱${sv.price.toLocaleString()}` : "Ask for price"}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: C.mute }} />
              </button>
            ))}
            {biz.info && (
              <div style={{ marginTop: 20, padding: 16, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12, display: "flex", gap: 12 }}>
                <Info size={16} style={{ color: C.mute, flexShrink: 0, marginTop: 2 }} />
                <div style={{ color: C.fg2, fontSize: 13, lineHeight: 1.55 }}>{biz.info}</div>
              </div>
            )}
            <div style={{ marginTop: 24, padding: "12px 14px", background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={16} style={{ color: C.lime, flexShrink: 0 }} />
              <div style={{ color: C.fg2, fontSize: 12, lineHeight: 1.4 }}>
                Your info is only shared with <b style={{ color: C.fg }}>{biz.name}</b>.
              </div>
            </div>
          </div>
        )}

        {step === 2 && (() => {
          // Group days by month for clear section labels — designer feedback #9
          const groups = {};
          for (const d of days) {
            const monthKey = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(d);
          }
          return (
            <div className="b-in">
              <Eyebrow n={2} of={3} label="Date" />
              <h1 style={{ fontSize: 26, lineHeight: 1.1, margin: "6px 0 22px", letterSpacing: "-0.02em", fontWeight: 600 }}>When works for you?</h1>
              {Object.entries(groups).map(([monthLabel, monthDays]) => (
                <div key={monthLabel} style={{ marginBottom: 20 }}>
                  <div style={{ color: C.fg2, fontSize: 12, fontWeight: 600, letterSpacing: ".04em", marginBottom: 10, textTransform: "uppercase" }}>{monthLabel}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: 8 }}>
                    {monthDays.map(d => {
                      const isToday = dateKey(d) === dateKey(new Date());
                      return (
                        <button key={dateKey(d)} onClick={() => { setSelDate(d); setSelTime(null); setStep(3); }} className="b-tap"
                          style={{ background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 4px", cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
                          {isToday && <span style={{ position: "absolute", top: 5, right: 8, width: 5, height: 5, borderRadius: 99, background: C.lime }} />}
                          <div style={{ fontSize: 10, color: C.mute, fontWeight: 600, letterSpacing: ".06em" }}>{dow(d)}</div>
                          <div className="b-num" style={{ fontSize: 20, fontWeight: 600, marginTop: 2, letterSpacing: "-0.02em" }}>{d.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {step === 3 && (
          <div className="b-in">
            <Eyebrow n={3} of={3} label="Time" />
            <h1 style={{ fontSize: 26, lineHeight: 1.1, margin: "6px 0 6px", letterSpacing: "-0.02em", fontWeight: 600 }}>Pick a time.</h1>
            <p className="b-num" style={{ color: C.fg2, fontSize: 14, margin: "0 0 22px" }}>
              {selDate?.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            {loadingDay ? (
              <div style={{ padding: 60, display: "grid", placeItems: "center" }}>
                <Loader2 size={22} className="b-spin" style={{ color: C.mute }} />
              </div>
            ) : openSlots.length === 0 ? (
              <div style={{ background: C.ink2, border: `1px dashed ${C.line2}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
                <Clock size={20} style={{ color: C.mute, marginBottom: 10 }} />
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 4 }}>Fully booked</div>
                <div style={{ color: C.fg2, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>Nothing open this day. Join the waitlist — we'll text you if a slot opens up.</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button onClick={() => setStep(2)} className="b-tap" style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.fg2, borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Try another day
                  </button>
                  <button onClick={() => setStep(5)} className="b-tap" style={{ background: C.lime, color: C.limeInk, border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Join waitlist
                  </button>
                </div>
              </div>
            ) : Object.entries(grouped).map(([label, times]) =>
              times.length === 0 ? null : (
                <div key={label} style={{ marginBottom: 22 }}>
                  <div style={{ color: C.mute, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", marginBottom: 10 }}>{label.toUpperCase()}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                    {times.map(t => (
                      <button key={t} onClick={() => { setSelTime(t); setStep(4); }} className="b-tap b-num"
                        style={{ background: C.ink2, border: `1px solid ${C.line}`, color: C.fg, borderRadius: 12, padding: "13px 0", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                        {fmt12(t)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {step === 4 && (
          <div className="b-in">
            <Eyebrow n={"✓"} of={3} label="Details" done />
            <h1 style={{ fontSize: 26, lineHeight: 1.1, margin: "6px 0 22px", letterSpacing: "-0.02em", fontWeight: 600 }}>Almost there.</h1>
            <div style={{ background: C.limeSoft, border: `1px solid ${C.lime}44`, borderRadius: 14, padding: "12px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="b-serif" style={{ fontSize: 15, color: C.fg }}>{service.name}</div>
                <div className="b-num" style={{ color: C.fg2, fontSize: 12, marginTop: 2 }}>
                  {selDate?.toLocaleDateString("en-PH",{ weekday: "short", month: "short", day: "numeric" })} · {fmt12(selTime)} · {service.duration_hours}h {service.price > 0 && `· ₱${service.price.toLocaleString()}`}
                </div>
              </div>
              <button onClick={() => setStep(2)} className="b-tap" style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.fg, borderRadius: 999, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Change</button>
            </div>
            <Field label="Full name" icon={User}>
              <input className="b-focus" value={name} onChange={e => setName(e.target.value)} placeholder="Juan Dela Cruz" autoComplete="name" style={inputStyle()} />
            </Field>
            <Field label="Mobile number" icon={Phone} hint="We'll text you when it's confirmed.">
              <input className="b-focus" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09171234567" inputMode="tel" type="tel" autoComplete="tel" style={{ ...inputStyle(), fontFeatureSettings: "'tnum'" }} />
            </Field>
            <Field label="Anything to note?" optional>
              <textarea className="b-focus" value={note} onChange={e => setNote(e.target.value)} placeholder="First time po, may kasama akong isa." rows={2} style={{ ...inputStyle(), resize: "vertical", minHeight: 68, lineHeight: 1.4 }} />
            </Field>
            {err && (
              <div role="alert" style={{ background: C.errSoft, color: C.err, border: `1px solid ${C.err}44`, borderRadius: 12, padding: "10px 14px", fontSize: 13, margin: "0 0 14px" }}>{err}</div>
            )}
            <button onClick={submit} disabled={busy} className="b-tap"
              style={{ width: "100%", background: busy ? C.ink3 : C.lime, color: busy ? C.mute : C.limeInk, border: "none", borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {busy ? <><Loader2 size={17} className="b-spin" /> Sending…</> : "Request booking"}
            </button>
            <p style={{ color: C.mute, fontSize: 11, textAlign: "center", marginTop: 14, lineHeight: 1.55 }}>
              By requesting, you agree to be contacted about this appointment.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="b-in">
            <Eyebrow n={"★"} of={3} label="Waitlist" done />
            <h1 style={{ fontSize: 26, lineHeight: 1.1, margin: "6px 0 10px", letterSpacing: "-0.02em", fontWeight: 600 }}>Join the waitlist.</h1>
            <p style={{ color: C.fg2, fontSize: 14, margin: "0 0 20px", lineHeight: 1.5 }}>
              We'll text you first if a slot opens on <b style={{ color: C.fg }}>{selDate?.toLocaleDateString("en-PH",{ weekday: "long", month: "long", day: "numeric" })}</b>.
            </p>
            <Field label="Full name" icon={User}>
              <input className="b-focus" value={name} onChange={e => setName(e.target.value)} placeholder="Juan Dela Cruz" autoComplete="name" style={inputStyle()} />
            </Field>
            <Field label="Mobile number" icon={Phone} hint="We'll text you if a slot opens.">
              <input className="b-focus" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09171234567" inputMode="tel" type="tel" autoComplete="tel" style={{ ...inputStyle(), fontFeatureSettings: "'tnum'" }} />
            </Field>
            {err && (
              <div role="alert" style={{ background: C.errSoft, color: C.err, border: `1px solid ${C.err}44`, borderRadius: 12, padding: "10px 14px", fontSize: 13, margin: "0 0 14px" }}>{err}</div>
            )}
            <button onClick={submitWaitlist} disabled={busy} className="b-tap"
              style={{ width: "100%", background: busy ? C.ink3 : C.lime, color: busy ? C.mute : C.limeInk, border: "none", borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {busy ? <><Loader2 size={17} className="b-spin" /> Joining…</> : "Join waitlist"}
            </button>
          </div>
        )}
      </main>

      <footer style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 32px", color: C.mute, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Mark size={14} /> Powered by MatchUp
      </footer>
    </Shell>
  );
}

function Shell({ children, topRef }) { return <div className="b-body" ref={topRef} style={{ minHeight: "100vh", background: C.ink }}>{children}</div>; }
function Eyebrow({ n, of, label, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.mute, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", marginBottom: 14 }}>
      <span className="b-num" style={{ display: "inline-grid", placeItems: "center", width: 20, height: 20, borderRadius: 99, background: done ? C.lime : "transparent", border: done ? "none" : `1px solid ${C.line2}`, color: done ? C.limeInk : C.fg2, fontSize: 11 }}>{n}</span>
      <span>{label.toUpperCase()}</span>
      <span style={{ flex: 1, height: 1, background: C.line, marginLeft: 4 }} />
    </div>
  );
}
function Field({ label, icon: Icon, children, hint, optional }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.fg2, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
        {Icon && <Icon size={13} />}<span>{label}</span>{optional && <span style={{ color: C.mute, fontWeight: 500 }}>· optional</span>}
      </div>
      {children}
      {hint && <div style={{ color: C.mute, fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>{hint}</div>}
    </label>
  );
}
function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.line}`, gap: 12 }}>
      <span style={{ color: C.mute, fontSize: 12 }}>{label}</span>
      <span className="b-num" style={{ color: C.fg, fontSize: 14, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}
function inputStyle() { return { width: "100%", background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 15px", color: C.fg, fontSize: 16, lineHeight: 1.3 }; }
