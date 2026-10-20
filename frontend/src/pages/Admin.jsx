import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ChevronDown, LogOut, Search, Trash2, MessagesSquare, Anchor, Mail, KeyRound, Eye, EyeOff, Lock, Fingerprint, FileSpreadsheet, FileText, Loader2, Feather, X, Users, Hourglass, Sailboat, Flame, Scroll, Compass, Scale, Stamp, Coins, Map as MapIcon, ShieldCheck, Unlock, Check, AlertTriangle, Pencil } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import ChatBox from "@/components/ChatBox";
import { ShipWheel } from "@/components/NavIcons";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useAdminNotif } from "@/lib/notifHub";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import useSeason, { refreshSeason, formatSeasonDate } from "@/lib/season";

const EASE = [0.16, 1, 0.3, 1];

const statCls = {
  total: "text-bone",
  pending: "text-gold",
  accepted: "text-emerald-400",
  reserve: "text-amber-400",
  rejected: "text-bloodglow",
};

const statIcon = {
  total: Users,
  pending: Hourglass,
  accepted: Anchor,
  reserve: Sailboat,
  rejected: Flame,
};

const statBarCls = {
  total: "bg-bone/70",
  pending: "bg-gold",
  accepted: "bg-emerald-400",
  reserve: "bg-amber-400",
  rejected: "bg-bloodglow",
};

const frDate = (iso, locale) =>
  iso
    ? new Date(iso).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const KeyholeSVG = ({ className = "w-32 h-32" }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
    <circle cx="50" cy="40" r="14" stroke="#D4AF37" strokeWidth="4.5" className="drop-shadow-[0_0_14px_rgba(212,175,55,0.7)]" />
    <path d="M44.5 50 L37 78 L63 78 L55.5 50 Z" stroke="#D4AF37" strokeWidth="4.5" fill="rgba(212,175,55,0.18)" strokeLinejoin="round" />
  </svg>
);

// ---------- ROSE DES VENTS STRATÉGIQUE (aiguille réactive à l'état du coffre) ----------
const COMPASS_TICKS = Array.from({ length: 32 }, (_, i) => i * 11.25);

function CompassRose({ phase = "locked", className = "w-64 h-64" }) {
  const reduce = useReducedMotion();
  const needleAnim =
    reduce
      ? { rotate: phase === "sealed" ? 180 : 0 }
      : phase === "opening"
        ? { rotate: [0, 360] }
        : phase === "ready"
          ? { rotate: 0 }
          : phase === "sealed"
            ? { rotate: 180 }
            : { rotate: [-28, 22, -28] };
  const needleTransition =
    reduce
      ? { duration: 0 }
      : phase === "opening"
        ? { duration: 1.1, repeat: Infinity, ease: "linear" }
        : phase === "locked"
          ? { duration: 5, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 90, damping: 12 };
  const needleTip = phase === "sealed" ? "#DC2626" : "#D4AF37";

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-dashed border-gold/25 animate-spin-slow" />
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        <circle cx="100" cy="100" r="88" fill="rgba(10,15,23,0.85)" stroke="rgba(212,175,55,0.55)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(212,175,55,0.25)" strokeWidth="1" />
        <circle cx="100" cy="100" r="52" fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="1" strokeDasharray="3 4" />
        {COMPASS_TICKS.map((deg, i) => {
          const long = i % 4 === 0;
          const r1 = long ? 70 : 75;
          const rad = ((deg - 90) * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={100 + Math.cos(rad) * r1}
              y1={100 + Math.sin(rad) * r1}
              x2={100 + Math.cos(rad) * 80}
              y2={100 + Math.sin(rad) * 80}
              stroke={long ? "rgba(212,175,55,0.8)" : "rgba(212,175,55,0.35)"}
              strokeWidth={long ? 1.6 : 1}
            />
          );
        })}
        {/* étoile 8 branches */}
        <polygon points="100,34 108,92 100,100 92,92" fill="rgba(212,175,55,0.22)" stroke="rgba(212,175,55,0.5)" strokeWidth="0.8" />
        <polygon points="166,100 108,108 100,100 108,92" fill="rgba(212,175,55,0.14)" stroke="rgba(212,175,55,0.4)" strokeWidth="0.8" />
        <polygon points="100,166 92,108 100,100 108,108" fill="rgba(212,175,55,0.22)" stroke="rgba(212,175,55,0.5)" strokeWidth="0.8" />
        <polygon points="34,100 92,92 100,100 92,108" fill="rgba(212,175,55,0.14)" stroke="rgba(212,175,55,0.4)" strokeWidth="0.8" />
        <g fill="rgba(212,175,55,0.08)" stroke="rgba(212,175,55,0.3)" strokeWidth="0.6">
          <polygon points="146,54 104,96 100,100 104,104" />
          <polygon points="146,146 104,104 100,100 96,104" />
          <polygon points="54,146 96,104 100,100 96,96" />
          <polygon points="54,54 96,96 100,100 104,96" />
        </g>
        <g fontFamily="serif" fontSize="13" fill="#D4AF37" textAnchor="middle" fontWeight="700">
          <text x="100" y="22">N</text>
          <text x="184" y="105">E</text>
          <text x="100" y="192">S</text>
          <text x="16" y="105">O</text>
        </g>
      </svg>
      {/* aiguille — div séparée : rotation fiable sur Safari iOS */}
      <motion.div className="absolute inset-0 flex items-center justify-center" animate={needleAnim} transition={needleTransition}>
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <polygon points="100,40 107,100 100,108 93,100" fill={needleTip} />
          <polygon points="100,160 107,100 100,92 93,100" fill="rgba(234,224,200,0.55)" />
          <circle cx="100" cy="100" r="7" fill="#0A0F17" stroke="#D4AF37" strokeWidth="2" />
          <circle cx="100" cy="100" r="2.5" fill="#B91C1C" />
        </svg>
      </motion.div>
    </div>
  );
}

const PHASE_STYLE = {
  locked: "border-gold/30 text-mist",
  ready: "border-emerald-400/50 text-emerald-300 bg-emerald-400/5",
  opening: "border-gold/60 text-gold bg-gold/10",
  sealed: "border-bloodglow/60 text-bloodglow bg-bloodglow/10",
};

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function LoginScreen({ onAuthed, checking = false }) {
  const { c, lang } = useLang();
  const s = c.admin.login;
  const navigate = useNavigate();
  const shake = useAnimationControls();
  const emailRef = useRef(null);
  const pwRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [sealed, setSealed] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  // Focus auto UNIQUEMENT sur ordinateur (sur iOS/Android le clavier surgirait et ferait sauter la page)
  useEffect(() => {
    try {
      if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        emailRef.current?.focus({ preventScroll: true });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const emailOk = isEmail(email);
  const pwOk = password.length > 0;
  const phase = sealed ? "sealed" : busy ? "opening" : emailOk && pwOk ? "ready" : "locked";
  const attemptsLeft = Math.max(0, 5 - fails);
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const hour = now.getHours();
  const quart = c.admin.dash.quartLabels[hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3];
  const timeStr = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const detectCaps = (e) => {
    try {
      if (typeof e.getModifierState === "function") setCaps(e.getModifierState("CapsLock"));
    } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy || sealed) return;
    if (!emailOk) {
      setError(s.badSecret);
      emailRef.current?.focus();
      shake.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }
    if (!pwOk) {
      pwRef.current?.focus();
      shake.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/admin/login", { email: email.trim(), password });
      toast.success(c.admin.toast.welcome(data.email), { id: "admin-welcome" });
      setBusy(false);
      onAuthed();
      window.dispatchEvent(new Event("gp-auth-changed"));
      return;
    } catch (err) {
      const st = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (st === 429) {
        setSealed(true);
        setFails(5);
        setError(typeof detail === "string" ? detail : s.sealed);
      } else if (st === 401) {
        const left = parseInt(err?.response?.headers?.["x-attempts-left"], 10);
        setFails((f) => {
          const n = Number.isFinite(left) ? Math.min(5, Math.max(0, 5 - left)) : Math.min(f + 1, 5);
          if (n >= 5) setSealed(true);
          return n;
        });
        setError(s.badSecret);
        setPassword("");
        pwRef.current?.focus({ preventScroll: true });
      } else if (err?.code === "ECONNABORTED" || err?.message === "Network Error") setError(s.storm);
      else setError(formatApiError(err));
      shake.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } });
    }
    setBusy(false);
  };

  const steps = [emailOk, pwOk, busy];
  const OathIcons = [Fingerprint, Lock, ShieldCheck];

  return (
    <div className="relative py-2 sm:py-8" data-testid="admin-login-screen">
      {/* décor contenu — jamais de débordement horizontal */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_30%,rgba(11,25,44,0.9),transparent_62%)]" />
        <div className="absolute inset-x-0 top-1/3 h-1/2 bg-[radial-gradient(ellipse_at_60%_45%,rgba(120,150,170,0.08),transparent_65%)] animate-fog" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] gap-6 lg:gap-10 items-stretch">
        {/* ===== SALLE DES CARTES (stratégie) ===== */}
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          data-testid="login-strategy-panel"
          className="order-2 lg:order-1 relative overflow-hidden border border-gold/25 bg-deck/60 deck-planks p-6 sm:p-8 flex flex-col"
        >
          <div aria-hidden="true" className="absolute inset-0 map-grid opacity-80 pointer-events-none" />

          <div className="relative">
            <p className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.35em] text-gold">
              <MapIcon className="w-3.5 h-3.5" /> {s.chartEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl text-bone leading-tight">{s.chartTitle}</h2>
            <p className="mt-2 font-fell italic text-base text-bone/70">{s.chartSub}</p>
          </div>

          <div className="relative hidden lg:flex justify-center my-8">
            <CompassRose phase={phase} className="w-60 h-60 xl:w-64 xl:h-64" />
          </div>

          <ol className="relative mt-6 lg:mt-0 space-y-3" data-testid="login-oaths">
            {s.oaths.map((o, i) => {
              const Icon = OathIcons[i];
              return (
                <li key={`oath-${i}`} className="flex items-start gap-3 border border-gold/15 bg-ink/50 px-4 py-3">
                  <span className="shrink-0 w-9 h-9 brass-porthole bg-ink flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gold" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold">{o.t}</p>
                    <p className="mt-0.5 font-fell text-sm text-bone/75 leading-snug">{o.d}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="relative mt-6 pt-4 border-t border-gold/15 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-mono2 text-[9px] tracking-[0.28em] text-gold/80 min-w-0">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{c.admin.dash.coordinates}</span>
            </p>
            <p className="font-mono2 text-[9px] tracking-[0.28em] text-mist" data-testid="login-watch">
              {s.watch} · <span className="text-gold">{quart}</span> · <span className="text-bone">{timeStr}</span>
            </p>
          </div>
        </motion.aside>

        {/* ===== LE COFFRE (formulaire) ===== */}
        <div className="order-1 lg:order-2 flex flex-col">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
            <motion.form
              animate={shake}
              data-testid="admin-login-form"
              onSubmit={submit}
              noValidate
              className="relative border-2 border-gold/35 bg-parch/90 frame-plate p-6 sm:p-9"
            >
              {[["top-2", "left-2"], ["top-2", "right-2"], ["bottom-2", "left-2"], ["bottom-2", "right-2"]].map(([v, h]) => (
                <span key={v + h} className={`absolute ${v} ${h} w-2 h-2 rounded-full bg-gold/50`} aria-hidden="true" />
              ))}

              {/* En-tête : serrure + état du coffre */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 brass-porthole bg-ink flex items-center justify-center">
                  <div className="lg:hidden absolute inset-0 opacity-60">
                    <CompassRose phase={phase} className="w-full h-full" />
                  </div>
                  <KeyholeSVG className="relative w-9 h-9 sm:w-11 sm:h-11 lg:block" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-[1.7rem] leading-tight sm:text-4xl text-gold">{s.title}</h1>
                  <p
                    data-testid="login-lock-state"
                    data-phase={phase}
                    aria-live="polite"
                    className={`mt-2 inline-flex items-center gap-2 border px-2.5 py-1 font-mono2 text-[9px] tracking-[0.25em] transition-colors duration-300 ${PHASE_STYLE[phase]}`}
                  >
                    {phase === "opening" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : phase === "ready" ? (
                      <Unlock className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    {s.lockState[phase]}
                  </p>
                </div>
              </div>
              <p className="font-fell italic text-base text-bone/70 mb-6">{s.subtitle}</p>
              {checking && (
                <p data-testid="admin-login-checking" className="-mt-3 mb-5 font-mono2 text-[9px] tracking-[0.3em] text-mist/70 animate-pulse">
                  {s.checking}
                </p>
              )}

              {/* Étapes stratégiques */}
              <ol className="grid grid-cols-3 gap-2 mb-6" data-testid="login-steps">
                {s.steps.map((label, i) => {
                  const done = steps[i];
                  return (
                    <li
                      key={`step-${i}`}
                      data-testid={`login-step-${i + 1}`}
                      data-done={done ? "true" : "false"}
                      className={`flex flex-col items-center gap-1.5 border px-1 py-2 transition-colors duration-300 ${
                        done ? "border-gold/60 bg-gold/10" : "border-gold/15 bg-ink/40"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono2 text-[10px] ${
                          done ? "gold-ingot text-ink" : "border border-gold/30 text-mist"
                        }`}
                      >
                        {done && i < 2 ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={`font-mono2 text-[8px] sm:text-[9px] tracking-[0.2em] text-center ${done ? "text-gold" : "text-mist/80"}`}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <label className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.3em] text-gold mb-2" htmlFor="admin-email">
                <Mail className="w-3.5 h-3.5" /> {s.emailLabel}
              </label>
              <input
                ref={emailRef}
                id="admin-email"
                name="email"
                data-testid="admin-login-input-email"
                type="email"
                inputMode="email"
                enterKeyHint="next"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                placeholder={s.emailPh}
                value={email}
                disabled={sealed}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !pwOk) { e.preventDefault(); pwRef.current?.focus(); }
                }}
                className="w-full min-h-[48px] bg-ink/70 border border-gold/25 px-4 py-3 font-fell text-base text-bone placeholder:text-mist/40 focus:border-gold focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] disabled:opacity-50 transition-[border-color,box-shadow] mb-5"
              />

              <label className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.3em] text-gold mb-2" htmlFor="admin-password">
                <KeyRound className="w-3.5 h-3.5" /> {s.pwLabel}
              </label>
              <div className="relative">
                <input
                  ref={pwRef}
                  id="admin-password"
                  name="password"
                  data-testid="admin-login-input-password"
                  type={showPw ? "text" : "password"}
                  enterKeyHint="go"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  placeholder={s.pwPh}
                  value={password}
                  disabled={sealed}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={detectCaps}
                  onKeyUp={detectCaps}
                  onBlur={() => setCaps(false)}
                  className="w-full min-h-[48px] bg-ink/70 border border-gold/25 px-4 py-3 pr-14 font-fell text-base text-bone placeholder:text-mist/40 focus:border-gold focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] disabled:opacity-50 transition-[border-color,box-shadow]"
                />
                <button
                  type="button"
                  data-testid="admin-login-toggle-pw"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? s.hidePw : s.showPw}
                  aria-pressed={showPw}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-mist hover:text-gold focus-visible:text-gold transition-colors"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <AnimatePresence>
                {caps && (
                  <motion.p
                    key="caps"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    data-testid="login-caps-warning"
                    className="mt-2 font-mono2 text-[9px] tracking-[0.2em] text-amber-400 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {s.capsLock}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Jauge de tentatives */}
              <div className="mt-5 flex items-center justify-between gap-3" data-testid="login-attempts-gauge" data-left={attemptsLeft}>
                <span className="font-mono2 text-[9px] tracking-[0.25em] text-mist">{s.attemptsGauge}</span>
                <span className="flex items-center gap-1.5" aria-label={`${attemptsLeft}/5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={`pip-${i}`}
                      className={`w-2.5 h-2.5 rotate-45 border transition-colors duration-300 ${
                        i < attemptsLeft ? "bg-gold/80 border-gold" : "bg-bloodglow/70 border-bloodglow"
                      }`}
                    />
                  ))}
                </span>
              </div>

              {fails > 0 && !error && !sealed && (
                <p data-testid="login-attempts" className="mt-3 font-mono2 text-[9px] tracking-[0.25em] text-bloodglow flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" /> {s.attemptsLeft(attemptsLeft)}
                </p>
              )}

              <AnimatePresence>
                {error && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                    data-testid="admin-login-error"
                    className="mt-3 border border-bloodglow/45 bg-bloodglow/10 px-4 py-3 font-mono2 text-[10px] leading-relaxed tracking-[0.12em] text-bloodglow flex items-start gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{error}{fails > 0 && fails < 5 && !sealed ? ` — ${s.attemptsLeft(attemptsLeft)}` : ""}</span>
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                data-testid="admin-login-btn"
                disabled={busy || sealed}
                className="mt-6 w-full min-h-[56px] font-display text-2xl tracking-wider py-3.5 bg-gold text-ink hover:shadow-[0_0_35px_rgba(212,175,55,0.4)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-[box-shadow,transform,opacity] duration-300"
              >
                {busy ? (
                  <span className="inline-flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" /> {s.submitting}
                  </span>
                ) : sealed ? (
                  <span className="inline-flex items-center justify-center gap-3">
                    <Lock className="w-5 h-5" /> {s.lockState.sealed}
                  </span>
                ) : (
                  s.submit
                )}
              </button>
            </motion.form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            data-testid="login-recruit-box"
            className="mt-5 border border-gold/20 bg-deck/70 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl text-bone">{s.recruitTitle}</p>
              <p className="font-fell italic text-sm text-bone/70">{s.recruitText}</p>
            </div>
            <button
              type="button"
              data-testid="login-recruit-btn"
              onClick={() => navigate("/suivi")}
              className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] font-mono2 text-[10px] tracking-[0.25em] text-gold border border-gold/40 px-4 py-2.5 hover:bg-gold/10 transition-colors"
            >
              <Anchor className="w-4 h-4 shrink-0" /> {s.recruitBtn}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function AppRow({ app, onUpdate, onDelete, history }) {
  const { c, lang } = useLang();
  const d = c.admin.dash;
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(app.note || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      data-testid={`admin-app-row-${app.id}`}
      className="relative border border-gold/15 bg-deck/70 hover:border-gold/40 hover:shadow-[0_0_28px_rgba(212,175,55,0.08)] transition-all"
    >
      {/* Rope line divider au-dessus de chaque parchemin */}
      <div aria-hidden="true" className="absolute inset-x-0 -top-px h-[2px] opacity-70 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center px-4 sm:px-6 py-4 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <div className="col-span-12 sm:col-span-3 flex items-center gap-3 min-w-0">
          <ChevronDown className={`w-4 h-4 text-gold shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          {/* Sceau du marin */}
          <div aria-hidden="true" className="shrink-0 w-10 h-10 rounded-full wax-seal flex items-center justify-center">
            <span className="font-display text-base text-amber-100">
              {(app.pseudo || "?").trim().charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl text-bone truncate">
              {app.pseudo}
              {app.code_recovered_at && (
                <span
                  data-testid={`admin-recovered-badge-${app.id}`}
                  className="ml-2 inline-block align-middle border border-amber-500/50 bg-amber-500/10 text-amber-400 font-mono2 text-[8px] tracking-[0.2em] px-1.5 py-0.5"
                >
                  {d.recoveredBadge}
                </span>
              )}
              {history && (
                <span
                  data-testid={`admin-attempt-badge-${app.id}`}
                  className="ml-2 inline-block align-middle border border-amber-500/50 bg-amber-500/10 text-amber-400 font-mono2 text-[8px] tracking-[0.2em] px-1.5 py-0.5"
                >
                  {d.attemptBadge(history.attempt)}
                </span>
              )}
            </p>
            <p className="font-mono2 text-[9px] tracking-[0.2em] text-gold flex items-center gap-1.5">
              <Scroll className="w-3 h-3 opacity-70" /> {app.tracking_code}
            </p>
          </div>
        </div>
        <div className="hidden sm:block sm:col-span-2 min-w-0">
          <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist">{d.power}</p>
          <p className="font-fell text-base text-goldlight truncate">{app.power}</p>
        </div>
        <div className="hidden md:block md:col-span-2 min-w-0">
          <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist">{d.troops}</p>
          <p className="font-fell text-base text-bone/80 line-clamp-2">{app.troops}</p>
        </div>
        <div className="hidden lg:block lg:col-span-2 min-w-0">
          <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist">{d.discord}</p>
          <p className="font-fell text-base text-bone/80 line-clamp-2">{app.discord}</p>
        </div>
        <div className="col-span-12 sm:col-span-2 flex justify-end min-w-0" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={app.status} />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden border-t border-gold/10"
          >
            <div className="px-4 sm:px-6 py-5 grid md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{d.power}</p>
                    <p className="font-fell text-base text-goldlight">{app.power}</p>
                  </div>
                  <div>
                    <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{d.discord}</p>
                    <p className="font-fell text-base text-bone/85 break-words">{app.discord}</p>
                  </div>
                </div>
                <div>
                  <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{d.troops}</p>
                  <p className="font-fell text-base text-bone/85 break-words">{app.troops}</p>
                </div>
                <div>
                  <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{d.activity}</p>
                  <p className="font-fell text-base text-bone/85">{app.activity}</p>
                </div>
                <div>
                  <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{d.experience}</p>
                  <p className="font-fell text-base text-bone/85 whitespace-pre-wrap">
                    {app.experience || d.noExp}
                  </p>
                </div>
                <div>
                  <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{d.message}</p>
                  <p className="font-fell text-base text-bone/85 whitespace-pre-wrap">{app.message}</p>
                </div>
                {app.peer_note !== undefined && (
                  <div data-testid={`admin-sea-note-${app.id}`}>
                    <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1 flex items-center gap-1.5">
                      <Feather className="w-3 h-3 text-gold shrink-0" /> {d.seaNote}
                    </p>
                    <p className="font-fell italic text-base text-goldlight/85 whitespace-pre-wrap">
                      {app.peer_note ? `« ${app.peer_note} »` : d.noExp}
                    </p>
                  </div>
                )}
                <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist">
                  {d.filedOn}{frDate(app.created_at, locale).toUpperCase()}
                </p>
                {history && (
                  <p
                    data-testid={`admin-prev-decision-${app.id}`}
                    className="font-fell text-sm text-amber-400/90 border-l-2 border-amber-500/40 pl-3"
                  >
                    {d.prevDecision} {c.status[history.prev.status]?.label || "—"} — {frDate(history.prev.created_at, locale)}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-mono2 text-[9px] tracking-[0.2em] text-gold mb-2" htmlFor={`note-${app.id}`}>
                  {d.noteLabel}
                </label>
                <textarea
                  id={`note-${app.id}`}
                  data-testid={`admin-note-input-${app.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={d.notePh}
                  className="w-full bg-ink/70 border border-gold/25 px-3 py-2.5 font-fell text-sm text-bone focus:border-gold transition-all min-h-[70px] resize-y mb-4"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    data-testid={`admin-action-approve-${app.id}`}
                    onClick={() => onUpdate(app, "accepted", note)}
                    className="font-mono2 text-[10px] tracking-[0.2em] px-4 py-2.5 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  >
                    {d.accept}
                  </button>
                  <button
                    data-testid={`admin-action-reject-${app.id}`}
                    onClick={() => onUpdate(app, "rejected", note)}
                    className="font-mono2 text-[10px] tracking-[0.2em] px-4 py-2.5 border border-blood/60 text-bloodglow hover:bg-blood/10 transition-all"
                  >
                    {d.reject}
                  </button>
                  <button
                    data-testid={`admin-action-pending-${app.id}`}
                    onClick={() => onUpdate(app, "pending", note)}
                    className="font-mono2 text-[10px] tracking-[0.2em] px-4 py-2.5 border border-gold/40 text-gold hover:bg-gold/10 transition-all"
                  >
                    {d.pending}
                  </button>
                  <button
                    data-testid={`admin-action-reserve-${app.id}`}
                    onClick={() => onUpdate(app, "reserve", note)}
                    className="font-mono2 text-[10px] tracking-[0.2em] px-4 py-2.5 border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 transition-all"
                  >
                    {d.reserve}
                  </button>
                  <button
                    data-testid={`admin-action-delete-${app.id}`}
                    onClick={() => onDelete(app)}
                    className="ml-auto inline-flex items-center gap-1.5 font-mono2 text-[10px] tracking-[0.2em] px-3 py-2.5 text-mist hover:text-bloodglow transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {d.burn}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConvList({ onOpen }) {
  const { c, lang } = useLang();
  const d = c.admin.dash;
  const [convs, setConvs] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("unread");
  const locale = lang === "fr" ? "fr-FR" : "en-GB";

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/conversations");
      setConvs(data);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  if (convs === null) {
    return <p className="text-center font-mono2 text-xs tracking-[0.3em] text-mist pt-14">{c.admin.loading}</p>;
  }

  const visible = convs
    .filter((cv) => {
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return (
        cv.pseudo.toLowerCase().includes(needle) ||
        cv.code.toLowerCase().includes(needle) ||
        (cv.last_text || "").toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => {
      if (sort === "unread") {
        return (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.last_at.localeCompare(a.last_at);
      }
      if (sort === "alpha") return a.pseudo.localeCompare(b.pseudo, "fr");
      return b.last_at.localeCompare(a.last_at);
    });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6" data-testid="admin-conv-toolbar">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-mist absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            data-testid="admin-conv-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={d.convSearch}
            className="w-full bg-ink/70 border border-gold/25 pl-10 pr-4 py-2.5 font-fell text-sm text-bone placeholder:text-mist/50 focus:border-gold transition-all"
          />
        </div>
        <select
          data-testid="admin-conv-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-ink/70 border border-gold/25 px-4 py-2.5 font-mono2 text-[10px] tracking-[0.2em] text-gold cursor-pointer focus:border-gold transition-all"
        >
          {d.convSort.map((o) => (
            <option key={o.key} value={o.key} className="bg-deck text-bone">{o.label}</option>
          ))}
        </select>
        <span
          data-testid="admin-conv-count"
          className="hidden sm:inline-flex items-center font-mono2 text-[9px] tracking-[0.25em] text-mist border border-gold/15 px-3"
        >
          {convs.length} {d.convCountLabel}
        </span>
      </div>

      {convs.length === 0 ? (
        <div data-testid="admin-conv-empty" className="border border-dashed border-gold/25 bg-deck/40 p-14 text-center">
          <Anchor className="w-8 h-8 text-gold/60 mx-auto mb-4" />
          <p className="font-display text-2xl text-bone/70 mb-2">{d.emptyTitle}</p>
          <p className="font-fell italic text-base text-mist">{d.convEmpty}</p>
        </div>
      ) : visible.length === 0 ? (
        <div data-testid="admin-conv-nomatch" className="border border-dashed border-gold/25 bg-deck/40 p-14 text-center">
          <p className="font-fell italic text-base text-mist">{d.convNoMatch}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((cv) => (
            <button
              key={cv.code}
              data-testid={`admin-conv-${cv.code}`}
              onClick={() => onOpen(cv)}
              className={`w-full text-left border p-5 flex items-center justify-between gap-4 transition-all ${
                cv.unread > 0
                  ? "border-gold/45 bg-gold/[0.06] hover:border-gold"
                  : "border-gold/15 bg-deck/60 hover:border-gold/45"
              }`}
            >
              <div className="min-w-0">
                <p className="font-display text-xl text-bone truncate">
                  {cv.unread > 0 && (
                    <span className="relative inline-flex w-2.5 h-2.5 mr-2 align-middle">
                      <span className="absolute inset-0 rounded-full bg-bloodglow/70 animate-ping" />
                      <span className="relative inline-block w-2.5 h-2.5 rounded-full bg-bloodglow" />
                    </span>
                  )}
                  {cv.pseudo}{" "}
                  <span className="font-mono2 text-[9px] tracking-[0.2em] text-gold ml-1">{cv.code}</span>
                </p>
                <p className={`font-fell text-sm truncate ${cv.unread > 0 ? "text-bone/90" : "text-bone/60"}`}>
                  {cv.last_text ? `${cv.last_sender === "council" ? "⚖ " : ""}${cv.last_text}` : "…"}
                </p>
                <p className="font-mono2 text-[8px] tracking-[0.2em] text-mist mt-1">
                  {frDate(cv.last_at, locale).toUpperCase()}
                </p>
              </div>
              {cv.unread > 0 && (
                <span
                  data-testid={`admin-conv-unread-${cv.code}`}
                  className="relative shrink-0 min-w-[46px] text-center bg-blood text-bone font-mono2 text-[10px] tracking-[0.2em] px-2.5 py-1.5 shadow-[0_0_14px_rgba(185,28,28,0.55)]"
                >
                  <span aria-hidden="true" className="absolute inset-0 bg-blood/70 animate-ping" />
                  <span className="relative">{cv.unread} {d.unread}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Calendrier des saisons — le Conseil règle les dates, tout le site suit (compte à rebours, frise, bandeau). */
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function SeasonPanel() {
  const { lang } = useLang();
  const en = lang === "en";
  const season = useSeason();
  const [s2, setS2] = useState("");
  const [open, setOpen] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setS2(toLocalInput(season.s2_start));
    setOpen(toLocalInput(season.recruit_open));
  }, [season.s2_start, season.recruit_open]);
  const phaseTxt = {
    pre: en ? "BEFORE SEASON 2 — countdown to the START of Season 2" : "AVANT LA SAISON 2 — compte à rebours vers le DÉBUT de la Saison 2",
    s2: season.recruit_open
      ? (en ? "SEASON 2 UNDERWAY — countdown to the GATES OPENING (end of Season 2)" : "SAISON 2 EN COURS — compte à rebours vers l'OUVERTURE DES PORTES (fin de Saison 2)")
      : (en ? "SEASON 2 UNDERWAY — gates opening date not announced yet" : "SAISON 2 EN COURS — date d'ouverture des portes pas encore annoncée"),
    open: en ? "END OF SEASON 2 — the gates are OPEN" : "FIN DE SAISON 2 — les portes sont OUVERTES",
  }[season.phase];
  const save = async () => {
    if (!s2) return toast.error(en ? "Season 2 start date is required." : "La date de début de la Saison 2 est obligatoire.");
    setSaving(true);
    try {
      await api.put("/admin/season", {
        s2_start: new Date(s2).toISOString(),
        recruit_open: open ? new Date(open).toISOString() : null,
      });
      await refreshSeason();
      toast.success(en ? "Calendar sealed — the whole site follows." : "Calendrier scellé — tout le site suit le cap.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };
  const inputCls = "w-full bg-ink border border-gold/30 focus:border-gold outline-none px-3 py-2.5 font-mono2 text-sm text-bone [color-scheme:dark]";
  return (
    <div data-testid="season-panel">
      <p data-testid="season-phase" data-phase={season.phase} className="mb-4 inline-flex items-center gap-2 border-l-4 border-gold bg-gold/10 px-3 py-2 font-mono2 text-[10px] tracking-[0.2em] text-gold">
        <Compass className="w-4 h-4 shrink-0" /> {phaseTxt}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block font-mono2 text-[9px] tracking-[0.25em] text-goldlight mb-1.5">{en ? "SEASON 2 START" : "DÉBUT DE LA SAISON 2"}</span>
          <input type="datetime-local" data-testid="season-s2-input" value={s2} onChange={(e) => setS2(e.target.value)} className={inputCls} />
          <span className="block font-fell italic text-xs text-mist mt-1">{formatSeasonDate(season.s2_start, lang)}</span>
        </label>
        <label className="block">
          <span className="block font-mono2 text-[9px] tracking-[0.25em] text-goldlight mb-1.5">{en ? "GATES OPEN — END OF SEASON 2 (optional)" : "OUVERTURE DES PORTES — FIN DE SAISON 2 (facultatif)"}</span>
          <input type="datetime-local" data-testid="season-open-input" value={open} onChange={(e) => setOpen(e.target.value)} className={inputCls} />
          <span className="block font-fell italic text-xs text-mist mt-1">
            {season.recruit_open ? formatSeasonDate(season.recruit_open, lang) : (en ? "Empty = “date announced soon” on the site" : "Vide = « date annoncée prochainement » sur le site")}
          </span>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" data-testid="season-save" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 bg-gold text-ink font-mono2 text-[10px] tracking-[0.2em] px-5 min-h-[44px] disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stamp className="w-4 h-4" />} {en ? "SEAL THE CALENDAR" : "SCELLER LE CALENDRIER"}
        </button>
        {open && (
          <button type="button" data-testid="season-clear-open" onClick={() => setOpen("")} disabled={saving}
            className="inline-flex items-center gap-2 border border-gold/40 text-gold font-mono2 text-[10px] tracking-[0.2em] px-4 min-h-[44px] hover:bg-gold/10">
            <X className="w-4 h-4" /> {en ? "DATE NOT KNOWN YET" : "DATE PAS ENCORE CONNUE"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Verrouille le défilement de la page tant qu'une fenêtre du Conseil est ouverte. */
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return () => unlockScroll();
  }, [active]);
}

function ButinPanel() {
  const { c, lang } = useLang();
  const a = c.admin.dash;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pseudo, setPseudo] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [messageTxt, setMessageTxt] = useState("");
  // Date & heure du don (séparées pour compatibilité mobile MIUI/Xiaomi).
  // Vide = maintenant. Permet de rattraper un don reçu hier.
  const [whenDate, setWhenDate] = useState("");
  const [whenTime, setWhenTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goal, setGoal] = useState("");
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  // modal « Sceller la facture »
  const [sealTarget, setSealTarget] = useState(null); // { id, pseudo, amount, email, receipt_id }
  useScrollLock(!!sealTarget);
  const [sealing, setSealing] = useState(null); // "pdf" | "xlsx" | null

  // modal « Modifier le bordereau »  — ouvre un éditeur pour un don existant
  const [editTarget, setEditTarget] = useState(null); // bordereau courant
  useScrollLock(!!editTarget);
  const [editBusy, setEditBusy] = useState(false);

  // Fuseau du navigateur, affiché à côté des dates pour lever toute ambiguïté
  const BROWSER_TZ = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  })();

  const [pendingInfo, setPendingInfo] = useState({ n: 0, total: 0 });
  const load = () =>
    api.get("/admin/donators")
      .then(({ data }) => {
        const list = data.items || [];
        // À vérifier d'abord, puis les dons confirmés (du plus récent au plus ancien)
        list.sort((x, y) => (x.status === "pending" ? 0 : 1) - (y.status === "pending" ? 0 : 1));
        setItems(list);
        setTotal(data.total || 0);
        setPendingInfo({ n: data.pending || 0, total: data.pending_total || 0 });
        setGoal((prev) => (prev === "" ? String(data.goal ?? "") : prev));
      })
      .catch(() => {});

  useEffect(() => { load(); }, []);

  // L'écran du Butin se re-synchronise à chaque retour sur l'onglet / fenêtre :
  // garantit que la liste des dons ne « disparaît » pas après un instant d'inactivité.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const add = async () => {
    if (busy) return;
    const amt = parseFloat((amount || "").replace(",", "."));
    if (pseudo.trim().length < 2 || !(amt >= 0.5)) return;
    setBusy(true);
    try {
      // Construit la date du don si l'admin l'a renseignée (JJ/MM/AAAA + HH:MM)
      let whenISO = null;
      if (whenDate) {
        const dm = whenDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!dm) {
          toast.error(lang === "en" ? "Invalid date — use DD/MM/YYYY." : "Date invalide — utilise JJ/MM/AAAA.");
          setBusy(false);
          return;
        }
        const [, dd, mm, yyyy] = dm;
        const t = whenTime && /^\d{2}:\d{2}$/.test(whenTime) ? whenTime : "12:00";
        const local = new Date(`${yyyy}-${mm}-${dd}T${t}:00`);
        if (isNaN(local.getTime())) {
          toast.error(lang === "en" ? "Invalid date or time." : "Date ou heure invalide.");
          setBusy(false);
          return;
        }
        whenISO = local.toISOString();
      }
      await api.post("/admin/donators", {
        pseudo: pseudo.trim(),
        amount: amt,
        email: email.trim() || null,
        message: messageTxt.trim() || null,
        currency: "EUR",
        created_at: whenISO,
      });
      setPseudo("");
      setAmount("");
      setEmail("");
      setMessageTxt("");
      setWhenDate("");
      setWhenTime("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
      toast.success(a.butin.added);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const [actingId, setActingId] = useState(null);
  const decide = async (id, kind) => {
    if (actingId) return;
    setActingId(id);
    try {
      await api.post(`/admin/donators/${id}/${kind}`);
      await load();
      toast.success(kind === "confirm" ? a.butin.confirmedToast : a.butin.rejectedToast);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActingId(null);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/donators/${id}`);
      await load();
      toast.success(a.butin.removed);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  // Enregistre les modifications du bordereau (pseudo, montant, date/heure locales → ISO)
  const saveEdit = async (patch) => {
    if (editBusy || !editTarget) return;
    setEditBusy(true);
    try {
      await api.patch(`/admin/donators/${editTarget.id}`, patch);
      setEditTarget(null);
      await load();
      toast.success(a.butin.editSaved);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setEditBusy(false);
    }
  };

  const saveGoal = async () => {
    if (goalBusy) return;
    const g = parseFloat((goal || "").replace(",", "."));
    if (!(g >= 1)) {
      toast.error(a.butin.goalInvalid);
      return;
    }
    setGoalBusy(true);
    try {
      await api.put("/admin/butin/goal", { goal: g });
      setGoalSaved(true);
      setTimeout(() => setGoalSaved(false), 2500);
      toast.success(a.butin.goalSaved);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setGoalBusy(false);
    }
  };

  // Télécharge un blob depuis une URL d'API en préservant les cookies.
  const downloadBlob = async (url, filenameFallback) => {
    const { data, headers } = await api.get(url, { responseType: "blob", timeout: 120000 });
    const m = /filename="?([^";]+)"?/.exec(headers?.["content-disposition"] || "");
    const blobUrl = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = m ? m[1] : filenameFallback;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(blobUrl);
    }, 400);
  };

  const copyReceipt = async (rid, id) => {
    try {
      await navigator.clipboard.writeText(rid);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      /* clipboard indispo (iOS non-HTTPS) — on tombe silencieusement */
    }
  };

  const sealInvoice = async (fmt, pickLang) => {
    if (!sealTarget || sealing) return;
    setSealing(fmt);
    try {
      await downloadBlob(
        `/admin/donators/${sealTarget.id}/invoice/${fmt}?lang=${pickLang}`,
        `GOLDEN-PIRATES-RECU-${sealTarget.receipt_id}.${fmt}`,
      );
      toast.success(a.exportDone);
      setSealTarget(null);
    } catch (err) {
      let msg = formatApiError(err);
      try {
        if (err?.response?.data instanceof Blob) {
          const txt = await err.response.data.text();
          const p = JSON.parse(txt);
          if (p?.detail) msg = typeof p.detail === "string" ? p.detail : p.detail.msg || msg;
        }
      } catch { /* ignore */ }
      toast.error(msg);
    } finally {
      setSealing(null);
    }
  };

  const exportAll = async (pickLang) => {
    try {
      await downloadBlob(
        `/admin/donators/export/xlsx?lang=${pickLang}`,
        `GOLDEN-PIRATES-BUTIN-COMPLET-${pickLang.toUpperCase()}.xlsx`,
      );
      toast.success(a.exportDone);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const sendByMail = (it) => {
    if (!it.email) {
      toast.error(a.butin.noEmailToSend);
      return;
    }
    const amtStr = `${(it.amount || 0).toFixed(2)} ${(it.currency || "EUR")}`;
    const subject = a.butin.mailSubject(it.receipt_id);
    const body = a.butin.mailBody(it.receipt_id, it.pseudo, amtStr);
    window.location.href = `mailto:${encodeURIComponent(it.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div data-testid="admin-butin-panel">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <p className="font-fell text-base text-mist max-w-2xl">{a.butin.sub}</p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            data-testid="butin-export-fr"
            onClick={() => exportAll("fr")}
            className="font-mono2 text-[10px] tracking-[0.25em] px-3.5 py-2 min-h-[40px] border border-gold/40 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors"
          >
            🇫🇷 {a.butin.exportAll}
          </button>
          <button
            type="button"
            data-testid="butin-export-en"
            onClick={() => exportAll("en")}
            className="font-mono2 text-[10px] tracking-[0.25em] px-3.5 py-2 min-h-[40px] border border-gold/40 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors"
          >
            🇬🇧 {a.butin.exportAll}
          </button>
        </div>
      </div>

      {/* FORMULAIRE AJOUT DONATEUR — enrichi (email + message) */}
      <div className="grid gap-3 border border-gold/25 bg-deck/60 p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
          <div>
            <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{a.butin.pseudoLabel}</label>
            <input
              data-testid="butin-pseudo-input"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={40}
              autoComplete="off"
              className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{a.butin.amountLabel}</label>
            <input
              data-testid="butin-amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              maxLength={8}
              autoComplete="off"
              className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-lg text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{a.butin.emailLabel}</label>
          <input
            data-testid="butin-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={a.butin.emailPh}
            maxLength={120}
            autoComplete="off"
            className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{a.butin.messageLabel}</label>
          <textarea
            data-testid="butin-message-input"
            value={messageTxt}
            onChange={(e) => setMessageTxt(e.target.value)}
            placeholder={a.butin.messagePh}
            maxLength={400}
            rows={2}
            className="w-full bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">
            {lang === "en" ? "DONATION DATE & TIME (OPTIONAL — EMPTY = NOW)" : "DATE & HEURE DU DON (FACULTATIF — VIDE = MAINTENANT)"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              data-testid="butin-when-date-input"
              type="text"
              inputMode="numeric"
              value={whenDate}
              onChange={(e) => {
                // Autoriser JJ/MM/AAAA uniquement — ajoute automatiquement les séparateurs
                const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
                let out = raw;
                if (raw.length >= 5) out = `${raw.slice(0,2)}/${raw.slice(2,4)}/${raw.slice(4)}`;
                else if (raw.length >= 3) out = `${raw.slice(0,2)}/${raw.slice(2)}`;
                setWhenDate(out);
              }}
              placeholder={lang === "en" ? "DD/MM/YYYY" : "JJ/MM/AAAA"}
              maxLength={10}
              aria-label={lang === "en" ? "Date (DD/MM/YYYY)" : "Date (JJ/MM/AAAA)"}
              className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
            />
            <input
              data-testid="butin-when-time-input"
              type="text"
              inputMode="numeric"
              value={whenTime}
              onChange={(e) => {
                // Autoriser HH:MM uniquement — ajoute automatiquement le ":"
                const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                let out = raw;
                if (raw.length >= 3) out = `${raw.slice(0,2)}:${raw.slice(2)}`;
                setWhenTime(out);
              }}
              placeholder={lang === "en" ? "HH:MM (24h)" : "HH:MM (24h)"}
              maxLength={5}
              aria-label={lang === "en" ? "Time (HH:MM)" : "Heure (HH:MM)"}
              className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
            />
          </div>
          <p className="mt-1 font-fell italic text-xs text-mist">
            {lang === "en"
              ? "Format: DD/MM/YYYY and HH:MM (24h). Use this to log a donation received yesterday or earlier."
              : "Format : JJ/MM/AAAA et HH:MM (24h). Utilise ce champ pour rattraper un don reçu hier ou un autre jour."}
          </p>
        </div>
        <button
          type="button"
          data-testid="butin-add-btn"
          onClick={add}
          disabled={busy || pseudo.trim().length < 2 || !(parseFloat((amount || "").replace(",", ".")) >= 0.5)}
          className={`font-mono2 text-[10px] tracking-[0.2em] px-6 py-3 min-h-[46px] border transition-colors duration-200 ${
            saved ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300" : "bg-gold text-ink border-gold hover:bg-goldlight"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saved ? a.butin.saved : a.butin.add}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 border border-gold/25 bg-deck/60 p-5 mb-8">
        <div className="flex-1">
          <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{a.butin.goalLabel}</label>
          <input
            data-testid="butin-goal-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            maxLength={8}
            autoComplete="off"
            className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-lg text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
          />
        </div>
        <button
          type="button"
          data-testid="butin-goal-save"
          onClick={saveGoal}
          disabled={goalBusy || !(parseFloat((goal || "").replace(",", ".")) >= 1)}
          className={`font-mono2 text-[10px] tracking-[0.2em] px-6 py-3 min-h-[46px] border transition-colors duration-200 ${
            goalSaved ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300" : "bg-gold text-ink border-gold hover:bg-goldlight"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {goalSaved ? a.butin.goalSaved : a.butin.goalSave}
        </button>
      </div>

      {pendingInfo.n > 0 && (
        <div data-testid="butin-pending-banner" className="mb-5 flex items-start gap-3 border-l-4 border-gold bg-gold/10 px-4 py-3.5">
          <Hourglass className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <p className="font-fell text-base text-bone/90">
            <span className="font-display text-lg text-gold">{a.butin.pendingCount(pendingInfo.n)}</span>
            <span className="text-mist"> · {pendingInfo.total.toFixed(2)} €</span>
          </p>
        </div>
      )}

      <p className="font-mono2 text-[11px] tracking-[0.3em] text-emerald-300 mb-6" data-testid="butin-total">
        {a.butin.total} : {total.toFixed(2)} € · {items.filter((x) => x.status === "confirmed").length} {a.butin.giftsLabel}
      </p>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} data-testid={`butin-row-${it.id}`} data-status={it.status} className={`flex flex-col gap-3 border px-4 py-4 sm:flex-row sm:items-center sm:gap-4 ${it.status === "pending" ? "border-gold/60 bg-gold/5" : "border-gold/20 bg-deck/50"}`}>
              <div aria-hidden className="w-9 h-9 rounded-full bg-gold border border-goldlight flex items-center justify-center shrink-0 rotate-3">
                <span className="font-display text-base text-ink">{(it.pseudo || "?").trim().charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg text-bone truncate">{it.pseudo}</p>
                  <span data-testid={`butin-status-${it.id}`} className={`inline-flex items-center gap-1 font-mono2 text-[8.5px] tracking-[0.2em] px-2 py-0.5 border ${it.status === "pending" ? "border-gold/60 text-gold bg-gold/10" : "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"}`}>
                    {it.status === "pending" ? <Hourglass className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    {it.status === "pending" ? a.butin.statusPending : a.butin.statusConfirmed}
                  </span>
                  {it.anonymous && (
                    <span className="font-mono2 text-[8.5px] tracking-[0.2em] px-2 py-0.5 border border-mist/40 text-mist">{lang === "en" ? "ANONYMOUS IN HALL" : "ANONYME AU HALL"}</span>
                  )}
                  {it.declared_by_donor && (
                    <span className="font-mono2 text-[8.5px] tracking-[0.2em] px-2 py-0.5 border border-gold/25 text-gold/70">{a.butin.declaredByDonor}</span>
                  )}
                </div>
                {it.message && <p className="font-fell italic text-sm text-bone/75 mt-1 break-words">« {it.message} »</p>}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-mono2 text-[9px] tracking-[0.2em] text-gold/80">{a.butin.receiptLabel}</span>
                  <code data-testid={`butin-receipt-${it.id}`} className="font-mono2 text-[10px] tracking-[0.2em] text-goldlight bg-ink/70 border border-gold/30 px-2 py-0.5">
                    {it.receipt_id || "—"}
                  </code>
                  {it.receipt_id && (
                    <button
                      type="button"
                      data-testid={`butin-copy-${it.id}`}
                      onClick={() => copyReceipt(it.receipt_id, it.id)}
                      className={`font-mono2 text-[9px] tracking-[0.2em] px-2 py-0.5 border transition-colors ${
                        copiedId === it.id ? "border-emerald-400/60 text-emerald-300" : "border-gold/30 text-mist hover:text-gold hover:border-gold/60"
                      }`}
                    >
                      {copiedId === it.id ? a.butin.copied : a.butin.copyReceipt}
                    </button>
                  )}
                </div>
                <p className="font-mono2 text-[9px] tracking-[0.15em] text-mist mt-1" data-testid={`butin-date-${it.id}`}>
                  {it.created_at
                    ? new Date(it.created_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
                      " · " +
                      new Date(it.created_at).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" }) +
                      ` (${BROWSER_TZ})`
                    : "—"}
                  {it.email && <span className="ml-2 text-gold/70 break-all">· {it.email}</span>}
                </p>
              </div>
              <p className="font-mono2 text-[11px] tracking-[0.15em] text-gold shrink-0">{it.amount.toFixed(2)} {it.currency || "€"}</p>
              <div className="flex flex-wrap gap-2 shrink-0">
                {it.status === "pending" && (
                  <>
                    <button
                      type="button"
                      data-testid={`butin-confirm-${it.id}`}
                      onClick={() => decide(it.id, "confirm")}
                      disabled={!!actingId}
                      className="inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.2em] bg-emerald-500/20 text-emerald-200 border border-emerald-400/60 hover:bg-emerald-500/30 px-3 py-1.5 min-h-[36px] transition-colors disabled:opacity-50"
                    >
                      {actingId === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {a.butin.confirm}
                    </button>
                    <button
                      type="button"
                      data-testid={`butin-reject-${it.id}`}
                      onClick={() => decide(it.id, "reject")}
                      disabled={!!actingId}
                      className="inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.2em] text-bloodglow border border-bloodglow/50 hover:bg-blood/20 px-3 py-1.5 min-h-[36px] transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> {a.butin.reject}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  data-testid={`butin-edit-${it.id}`}
                  onClick={() => setEditTarget(it)}
                  className="inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.2em] text-gold/90 border border-gold/40 hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none px-3 py-1.5 min-h-[36px] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> {a.butin.edit}
                </button>
                <button
                  type="button"
                  data-testid={`butin-seal-${it.id}`}
                  onClick={() => setSealTarget(it)}
                  className="font-mono2 text-[9px] tracking-[0.2em] text-gold border border-gold/40 hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none px-3 py-1.5 min-h-[36px] transition-colors"
                >
                  {a.butin.sealInvoice}
                </button>
                <button
                  type="button"
                  data-testid={`butin-mail-${it.id}`}
                  onClick={() => sendByMail(it)}
                  disabled={!it.email}
                  title={!it.email ? a.butin.noEmailToSend : ""}
                  className="font-mono2 text-[9px] tracking-[0.2em] text-gold/80 border border-gold/30 hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none px-3 py-1.5 min-h-[36px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {a.butin.sendInvoice}
                </button>
                <button
                  type="button"
                  data-testid={`butin-remove-${it.id}`}
                  onClick={() => remove(it.id)}
                  className="font-mono2 text-[9px] tracking-[0.2em] text-red-400/80 hover:text-red-400 border border-red-400/30 hover:border-red-400/60 px-3 py-1.5 min-h-[36px] transition-colors"
                >
                  {a.butin.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-fell italic text-base text-mist border border-gold/15 bg-deck/40 p-6 text-center">{a.butin.empty}</p>
      )}

      {/* MODAL « SCELLER LA FACTURE » — langue + format */}
      {sealTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/85 backdrop-blur-sm px-4"
          onClick={() => {
            if (sealing) return;
            setSealTarget(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            data-testid="butin-seal-modal"
            data-state={sealing ? "generating" : "choose"}
            className="relative w-full max-w-md border-2 border-gold/60 bg-deck frame-plate p-6 sm:p-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold/80 mb-2">{a.butin.invoiceTitle}</p>
            <p className="font-display text-2xl text-gold uppercase tracking-wide mb-1">{sealTarget.pseudo}</p>
            <p className="font-mono2 text-[10px] tracking-[0.2em] text-goldlight mb-3">{sealTarget.receipt_id}</p>
            <p className="font-fell text-base text-mist mb-6">{a.butin.invoiceSub}</p>
            {sealing ? (
              <div data-testid="butin-seal-generating" className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-9 h-9 text-gold animate-spin" />
                <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold">{sealing.toUpperCase()}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[["fr", "🇫🇷 FR"], ["en", "🇬🇧 EN"]].map(([lk, flag]) => (
                  <div key={lk} className="flex flex-col gap-2">
                    <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold">{flag}</p>
                    <button
                      type="button"
                      data-testid={`butin-seal-pdf-${lk}`}
                      onClick={() => sealInvoice("pdf", lk)}
                      className="w-full font-mono2 text-[10px] tracking-[0.2em] py-2.5 min-h-[44px] border border-gold/40 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors"
                    >
                      {a.butin.formatPdf}
                    </button>
                    <button
                      type="button"
                      data-testid={`butin-seal-xlsx-${lk}`}
                      onClick={() => sealInvoice("xlsx", lk)}
                      className="w-full font-mono2 text-[10px] tracking-[0.2em] py-2.5 min-h-[44px] border border-gold/40 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors"
                    >
                      {a.butin.formatXlsx}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!sealing && (
              <button
                type="button"
                data-testid="butin-seal-cancel"
                onClick={() => setSealTarget(null)}
                className="absolute top-2 right-2 text-mist hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors p-2"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* MODAL « MODIFIER LE BORDEREAU » — pseudo / montant / date / message */}
      {editTarget && (
        <EditDonatorModal
          target={editTarget}
          lang={lang}
          busy={editBusy}
          copy={a.butin}
          onClose={() => !editBusy && setEditTarget(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}


// ---------- Fiche d'édition d'un bordereau de don (modifiable à tout moment) ----------
// La date/heure est éditée en fuseau LOCAL du Conseil puis convertie en ISO UTC
// avant l'envoi. La facture scellée restera, elle, en heure de Paris.
function EditDonatorModal({ target, lang, busy, copy, onClose, onSave }) {
  const BROWSER_TZ = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  })();

  const initial = useMemo(() => {
    const d = target?.created_at ? new Date(target.created_at) : new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return {
      pseudo: target?.pseudo || "",
      amount: String(target?.amount ?? ""),
      message: target?.message || "",
      email: target?.email || "",
      anonymous: !!target?.anonymous,
      dateStr: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
      timeStr: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }, [target]);

  const [pseudo, setPseudo] = useState(initial.pseudo);
  const [amount, setAmount] = useState(initial.amount);
  const [message, setMessage] = useState(initial.message);
  const [email, setEmail] = useState(initial.email);
  const [anonymous, setAnonymous] = useState(initial.anonymous);
  const [dateStr, setDateStr] = useState(initial.dateStr);
  const [timeStr, setTimeStr] = useState(initial.timeStr);

  const onDateChange = (v) => {
    const raw = v.replace(/\D/g, "").slice(0, 8);
    let out = raw;
    if (raw.length >= 5) out = `${raw.slice(0,2)}/${raw.slice(2,4)}/${raw.slice(4)}`;
    else if (raw.length >= 3) out = `${raw.slice(0,2)}/${raw.slice(2)}`;
    setDateStr(out);
  };
  const onTimeChange = (v) => {
    const raw = v.replace(/\D/g, "").slice(0, 4);
    let out = raw;
    if (raw.length >= 3) out = `${raw.slice(0,2)}:${raw.slice(2)}`;
    setTimeStr(out);
  };

  const submit = () => {
    const amt = parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(amt) || amt < 0.5) { toast.error(copy.editInvalidAmount); return; }
    const dm = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dm) { toast.error(copy.editInvalidDate); return; }
    const tm = timeStr.match(/^(\d{2}):(\d{2})$/);
    if (!tm) { toast.error(copy.editInvalidTime); return; }
    const [, dd, mm, yyyy] = dm;
    const [, hh, mn] = tm;
    const local = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mn));
    if (isNaN(local.getTime())) { toast.error(copy.editInvalidDate); return; }
    onSave({
      pseudo: pseudo.trim(),
      amount: amt,
      message: message.trim(),
      email: email.trim(),
      anonymous,
      created_at: local.toISOString(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/85 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        data-testid="butin-edit-modal"
        className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto border-2 border-gold/60 bg-deck frame-plate p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold/80 mb-1">{copy.editTitle}</p>
        <p className="font-display text-2xl text-gold uppercase tracking-wide mb-1">{target.pseudo}</p>
        <p className="font-mono2 text-[10px] tracking-[0.2em] text-goldlight mb-2">{target.receipt_id}</p>
        <p className="font-fell italic text-sm text-mist mb-5">{copy.editSub}</p>

        <div className="space-y-3.5">
          <div>
            <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{copy.pseudoLabel}</label>
            <input
              data-testid="butin-edit-pseudo"
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={40}
              className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{copy.amountLabel}</label>
              <input
                data-testid="butin-edit-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{copy.emailLabel}</label>
              <input
                data-testid="butin-edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
                className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">
              {lang === "en" ? "DATE & TIME" : "DATE & HEURE"} <span className="text-mist/80">— {BROWSER_TZ} ({copy.tzLocal})</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                data-testid="butin-edit-date"
                type="text"
                inputMode="numeric"
                value={dateStr}
                onChange={(e) => onDateChange(e.target.value)}
                placeholder={lang === "en" ? "DD/MM/YYYY" : "JJ/MM/AAAA"}
                maxLength={10}
                className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
              />
              <input
                data-testid="butin-edit-time"
                type="text"
                inputMode="numeric"
                value={timeStr}
                onChange={(e) => onTimeChange(e.target.value)}
                placeholder="HH:MM"
                maxLength={5}
                className="w-full min-h-[46px] bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono2 text-[9px] tracking-[0.25em] text-gold/80 mb-1.5">{copy.messageLabel}</label>
            <textarea
              data-testid="butin-edit-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={400}
              rows={2}
              className="w-full bg-ink/70 border border-gold/25 px-4 py-2.5 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              data-testid="butin-edit-anonymous"
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-4 h-4 accent-gold"
            />
            <span className="font-mono2 text-[10px] tracking-[0.2em] text-gold/80">
              {lang === "en" ? "ANONYMOUS GIFT" : "DON ANONYME"}
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 justify-end">
          <button
            type="button"
            data-testid="butin-edit-cancel"
            onClick={onClose}
            disabled={busy}
            className="font-mono2 text-[10px] tracking-[0.2em] text-mist hover:text-bone border border-gold/25 hover:border-gold/50 px-5 py-2.5 min-h-[44px] transition-colors disabled:opacity-50"
          >
            {copy.editCancel}
          </button>
          <button
            type="button"
            data-testid="butin-edit-save"
            onClick={submit}
            disabled={busy}
            className="font-mono2 text-[10px] tracking-[0.2em] text-gold border border-gold/60 bg-gold/10 hover:bg-gold/20 px-5 py-2.5 min-h-[44px] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {copy.editSave}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute top-2 right-2 text-mist hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors p-2 disabled:opacity-50"
          aria-label={copy.editCancel}
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}


// ---------- SCEAU DE CIRE DÉCORATIF (en-tête de panneau) ----------
function WaxSealIcon({ className = "w-10 h-10" }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex items-center justify-center ${className} wax-seal`}>
      <Stamp className="w-5 h-5 text-amber-100/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" strokeWidth={1.8} />
    </span>
  );
}

// ---------- COMMANDE : encadrement doré d'une section ----------
function SectionFrame({ title, subtitle, icon: Icon = Scale, right = null, children, testId }) {
  return (
    <section
      data-testid={testId}
      className="relative border border-gold/25 bg-deck/50 frame-plate p-5 sm:p-7 mb-8"
    >
      {/* coins rivetés */}
      {[["top-2", "left-2"], ["top-2", "right-2"], ["bottom-2", "left-2"], ["bottom-2", "right-2"]].map(([v, h]) => (
        <span key={v + h} className={`pointer-events-none absolute ${v} ${h} w-1.5 h-1.5 rounded-full bg-gold/60`} aria-hidden="true" />
      ))}
      <div className="flex items-start sm:items-center flex-wrap gap-3 sm:gap-4 mb-5">
        <WaxSealIcon className="w-11 h-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.35em] text-gold">
            <Icon className="w-3.5 h-3.5" />
            <span className="truncate">{title}</span>
          </p>
          {subtitle && <p className="mt-1.5 font-fell italic text-sm sm:text-base text-bone/70">{subtitle}</p>}
        </div>
        {right && <div className="w-full sm:w-auto sm:shrink-0 sm:ml-auto">{right}</div>}
      </div>
      {children}
    </section>
  );
}

// ---------- PONT DE COMMANDEMENT : bannière stratégique ----------
function CommandDeck({ d, view, totalEntries, locale }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const hour = now.getHours();
  const quartIdx = hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3;
  const dateStr = now.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const timeStr = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const viewLabel = view === "messages" ? d.tabs[1].label : view === "butin" ? d.tabs[2].label : d.tabs[0].label;

  return (
    <motion.div
      data-testid="admin-command-deck"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative overflow-hidden border border-gold/25 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.08),transparent_55%),linear-gradient(180deg,rgba(10,15,23,0.9)_0%,rgba(10,15,23,0.75)_100%)] deck-planks mb-6"
    >
      {/* grille carte en overlay */}
      <div aria-hidden="true" className="absolute inset-0 map-grid opacity-70 pointer-events-none" />
      {/* rose des vents décorative */}
      <div aria-hidden="true" className="absolute -right-10 -top-10 opacity-20">
        <div className="w-56 h-56 rounded-full border border-dashed border-gold/40 animate-spin-slow" />
      </div>
      <div className="relative px-5 sm:px-7 py-5 sm:py-6 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 md:gap-6 items-center">
        {/* GAUCHE — barre & roue */}
        <div className="flex items-center gap-4">
          <div className="brass-porthole w-14 h-14 shrink-0 flex items-center justify-center bg-ink/80">
            <ShipWheel className="w-9 h-9 text-gold wheel-idle" />
          </div>
          <div className="min-w-0">
            <p className="font-mono2 text-[9px] sm:text-[10px] tracking-[0.35em] text-gold/80">
              {d.commandDeck}
            </p>
            <p className="font-display text-xl sm:text-2xl text-bone leading-tight truncate">
              {viewLabel}
            </p>
          </div>
        </div>
        {/* CENTRE — coordonnées + cap */}
        <div className="min-w-0 md:border-l md:border-r md:border-gold/15 md:px-6 py-1 md:py-2 border-t md:border-t-0 border-gold/15 pt-3 md:pt-2">
          <p className="flex items-center gap-2 font-mono2 text-[9px] tracking-[0.28em] text-gold/80">
            <Compass className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{d.coordinates}</span>
          </p>
          <p className="mt-1 flex items-center gap-2 font-mono2 text-[9px] tracking-[0.28em] text-mist">
            <MapIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{d.bearing}</span>
          </p>
          <p className="mt-1 flex items-center gap-2 font-mono2 text-[9px] tracking-[0.28em] text-emerald-300/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
            <span className="truncate">{d.coreCrew}</span>
          </p>
        </div>
        {/* DROITE — quart & horloge */}
        <div className="flex items-center gap-3 sm:gap-4 justify-start md:justify-end flex-wrap min-w-0">
          <div className="min-w-0">
            <p className="font-mono2 text-[9px] tracking-[0.3em] text-mist">{d.deckLiveLabel}</p>
            <p className="font-display text-lg sm:text-xl text-gold truncate">{d.quartLabels[quartIdx]}</p>
          </div>
          <div aria-hidden="true" className="hidden sm:block w-px h-10 bg-gold/20" />
          <div className="min-w-0">
            <p className="font-mono2 text-[9px] tracking-[0.3em] text-mist">{dateStr}</p>
            <p className="font-display text-2xl text-bone leading-none">{timeStr}</p>
          </div>
          <div aria-hidden="true" className="hidden lg:flex flex-col items-center gap-1">
            <span className="w-0.5 h-4 bg-gold/50" />
            <div className="w-5 h-5 border border-gold/50 rotate-45 bg-gold/10" />
            <span className="w-0.5 h-4 bg-gold/50" />
          </div>
        </div>
      </div>
      {/* ligne cordage */}
      <div aria-hidden="true" className="rope-line h-[6px]" />
    </motion.div>
  );
}

export default function Admin() {
  const { c, lang } = useLang();
  const a = c.admin;
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  // PARCOURS ZÉRO CHARGEMENT : la session est mémorisée dans l'onglet.
  // - Pas de drapeau (visiteur / session fermée) → le formulaire de connexion
  //   s'affiche INSTANTANÉMENT, sans aucun écran d'attente.
  // - Drapeau présent (Conseil déjà connecté) → le tableau de bord s'ouvre
  //   INSTANTANÉMENT, confirmé en silence par /auth/me en arrière-plan.
  const AUTH_FLAG = "gp-auth-ok";
  const cachedAuth = (() => {
    try { return sessionStorage.getItem(AUTH_FLAG) === "1"; } catch { return false; }
  })();
  const [authed, setAuthed] = useState(cachedAuth);
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("registry");
  const [activeConv, setActiveConv] = useState(null);
  const [badges, setBadges] = useState({ unread: 0, pending: 0, donations: 0 });
  const [exporting, setExporting] = useState(null);
  const [langAsk, setLangAsk] = useState(null);
  useScrollLock(!!langAsk);
  const [exportLangChoice, setExportLangChoice] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Liens directs (barre du navire, footer) → onglet voulu : /admin#registry | #messagerie | #butin
  const routerLoc = useLocation();
  useEffect(() => {
    if (!authed) return;
    const h = routerLoc.hash;
    const next = h === "#messagerie" ? "messages" : h === "#butin" ? "butin" : h === "#registry" ? "registry" : null;
    if (next) {
      setView(next);
      setActiveConv(null);
      window.scrollTo({ top: 0 });
    }
  }, [authed, routerLoc.key, routerLoc.hash]);

  // La barre du navire suit l'onglet actif du Conseil
  useEffect(() => {
    window.__gpAdminView = view;
    window.dispatchEvent(new CustomEvent("gp-admin-view", { detail: view }));
  }, [view]);

  // « Quitter le pont » depuis la barre du navire
  useEffect(() => {
    const onQuit = () => {
      setAuthed(false);
      setApps([]);
      setStats(null);
      setActiveConv(null);
      setView("registry");
    };
    window.addEventListener("gp-council-logout", onQuit);
    return () => window.removeEventListener("gp-council-logout", onQuit);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get("/admin/applications"),
        api.get("/admin/stats"),
      ]);
      setApps(listRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }, []);

  useEffect(() => {
    if (!cachedAuth) return; // formulaire instantané — rien à vérifier
    // Confirmation silencieuse : si le secret du coffre a expiré, on retombe
    // sur le formulaire sans jamais afficher de chargement.
    api
      .get("/auth/me")
      .then(() => loadAll())
      .catch(() => {
        try { sessionStorage.removeItem(AUTH_FLAG); } catch {}
        setAuthed(false);
      });
  }, [loadAll]);

  // Quand l'onglet redevient visible ou que la fenêtre reprend le focus,
  // on retire silencieusement les candidatures + stats pour voir l'état réel
  // du serveur (anti « j'ai l'impression que tout a été réinitialisé »).
  useEffect(() => {
    if (!authed) return undefined;
    const refresh = () => {
      if (document.visibilityState === "visible") loadAll();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [authed, loadAll]);

  // Hub partagé — fusionne les /admin/stats + /admin/conversations avec Nav (1 seul fetch au lieu de 2),
  // pause automatique si l'onglet dort (économie batterie Mac/iPad/iPhone/Android).
  const adminNotif = useAdminNotif(authed === true);
  useEffect(() => {
    if (!adminNotif) return;
    setBadges({ unread: adminNotif.unread || 0, pending: adminNotif.pending || 0, donations: adminNotif.donations || 0 });
    if (adminNotif.stats) setStats(adminNotif.stats);
  }, [adminNotif]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      try { sessionStorage.removeItem("gp-auth-ok"); } catch {}
      setAuthed(false);
      setApps([]);
      setStats(null);
      setActiveConv(null);
      setView("registry");
      toast.success(a.toast.logout);
      window.dispatchEvent(new Event("gp-auth-changed"));
    }
  };

  const onUpdate = async (app, status, note) => {
    try {
      const { data } = await api.patch(`/admin/applications/${app.id}`, { status, note });
      setApps((list) => list.map((x) => (x.id === app.id ? data : x)));
      await loadAll();
      toast.success(a.toast.updated(data.pseudo));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const onDelete = async (app) => {
    if (!window.confirm(a.toast.confirm(app.pseudo))) return;
    try {
      await api.delete(`/admin/applications/${app.id}`);
      setApps((list) => list.filter((x) => x.id !== app.id));
      await loadAll();
      toast.success(a.toast.burned(app.pseudo));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const downloadExport = async (fmt, lang = "fr") => {
    if (exporting) return;
    setExporting(fmt);
    setExportLangChoice(lang);
    setExportError(null);
    // ⚓ Le modal reste ouvert pendant la génération → le Capitaine voit le progrès
    // (plus de « sa me met noir » : avant, on fermait le modal avant même le téléchargement).
    try {
      // Délai étendu : un gros registre sur réseau lent ne doit pas casser l'export
      const { data, headers } = await api.get(`/admin/export/${fmt}`, { params: { lang }, responseType: "blob", timeout: 120000 });
      const m = /filename="?([^";]+)"?/.exec(headers?.["content-disposition"] || "");
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = m ? m[1] : `golden-pirates-registre-${lang}-${new Date().toISOString().slice(0, 10)}.${fmt}`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      // laisser 400 ms au navigateur (iOS Safari surtout) pour amorcer le DL avant de libérer l'URL
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
      }, 400);
      toast.success(a.dash.exportDone);
      setLangAsk(null);
      setExportLangChoice(null);
    } catch (err) {
      // 💡 En responseType=blob, le détail JSON est enfermé dans un Blob → on le lit à la main
      // sinon le marin ne voit qu'un message générique vide.
      let msg = formatApiError(err);
      try {
        if (err?.response?.data instanceof Blob) {
          const txt = await err.response.data.text();
          const payload = JSON.parse(txt);
          if (payload?.detail) msg = typeof payload.detail === "string" ? payload.detail : payload.detail?.msg || msg;
        }
      } catch {
        /* le blob n'était pas du JSON — on garde le msg générique */
      }
      setExportError(msg || a.dash.exportFail);
      toast.error(msg || a.dash.exportFail);
    } finally {
      setExporting(null);
    }
  };

  const pseudoGroups = {};
  apps.forEach((a) => {
    const k = (a.pseudo || "").trim().toLowerCase();
    (pseudoGroups[k] = pseudoGroups[k] || []).push(a);
  });
  Object.values(pseudoGroups).forEach((list) =>
    list.sort((x, y) => (x.created_at || "").localeCompare(y.created_at || ""))
  );
  const getHistory = (app) => {
    const list = pseudoGroups[(app.pseudo || "").trim().toLowerCase()] || [];
    const idx = list.indexOf(app);
    return idx > 0 ? { attempt: idx + 1, prev: list[idx - 1] } : null;
  };

  const visible = apps.filter((x) => {
    if (filter !== "all" && x.status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        x.pseudo.toLowerCase().includes(q) ||
        x.tracking_code.toLowerCase().includes(q) ||
        x.discord.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-ink min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 pt-28 md:pt-36 pb-24 map-grid" data-testid="admin-section">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          {authed === false && (
            <LoginScreen
              checking={false}
              onAuthed={() => {
                try { sessionStorage.setItem("gp-auth-ok", "1"); } catch {}
                setAuthed(true);
                loadAll();
              }}
            />
          )}
          {authed === true && (
            <>
              <CommandDeck d={a.dash} view={view} totalEntries={visible.length} locale={locale} />

              <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                  <p className="font-mono2 text-[11px] tracking-[0.35em] text-gold mb-3 flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5" /> {a.dash.eyebrow}
                  </p>
                  <h1 className="font-display text-4xl sm:text-5xl text-bone">
                    {view === "messages" ? a.dash.titleMessages : view === "butin" ? a.dash.titleButin : a.dash.title}
                  </h1>
                </div>
                <button
                  data-testid="admin-logout-btn"
                  onClick={logout}
                  className="inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.25em] px-5 py-3 border border-gold/40 text-gold hover:bg-gold/10 transition-all"
                >
                  <LogOut className="w-4 h-4" /> {a.dash.logout}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-10" data-testid="admin-tabs">
                {a.dash.tabs.map((t) => (
                  <button
                    key={t.key}
                    data-testid={`admin-tab-${t.key}`}
                    onClick={() => {
                      setView(t.key);
                      setActiveConv(null);
                    }}
                    className={`inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.25em] px-5 py-3 border transition-all ${
                      view === t.key
                        ? "border-gold text-gold bg-gold/10 shadow-[inset_0_0_18px_rgba(212,175,55,0.15)]"
                        : "border-gold/20 text-mist hover:border-gold/50 hover:text-gold"
                    }`}
                  >
                    {t.key === "messages" ? <MessagesSquare className="w-4 h-4" /> : t.key === "butin" ? <Coins className="w-4 h-4" /> : <Scroll className="w-4 h-4" />}
                    {t.label}
                    {((t.key === "messages" && badges.unread > 0) || (t.key === "registry" && badges.pending > 0) || (t.key === "butin" && badges.donations > 0)) && (
                      <span
                        data-testid={`admin-tab-badge-${t.key}`}
                        className="relative inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-blood text-bone font-mono2 text-[10px] tracking-[0.1em] shadow-[0_0_14px_rgba(185,28,28,0.55)]"
                      >
                        <span aria-hidden="true" className="absolute inset-0 bg-blood/70 animate-ping" />
                        <span className="relative">
                          {t.key === "messages" ? badges.unread : t.key === "butin" ? badges.donations : badges.pending}
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {view === "butin" ? (
                <SectionFrame
                  title={a.dash.titleButin}
                  subtitle={a.dash.butin.sub}
                  icon={Coins}
                  testId="admin-butin-frame"
                >
                  <ButinPanel />
                </SectionFrame>
              ) : view === "messages" ? (
                activeConv ? (
                  <div data-testid="admin-thread">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <WaxSealIcon className="w-11 h-11" />
                        <div>
                          <p className="font-display text-2xl sm:text-3xl text-bone leading-tight">{activeConv.pseudo}</p>
                          <p className="font-mono2 text-[9px] tracking-[0.25em] text-gold">{activeConv.code}</p>
                        </div>
                      </div>
                      <button
                        data-testid="admin-thread-back"
                        onClick={() => setActiveConv(null)}
                        className="font-mono2 text-[10px] tracking-[0.25em] px-4 py-2.5 border border-gold/40 text-gold hover:bg-gold/10 transition-all"
                      >
                        {a.dash.convBack}
                      </button>
                    </div>
                    <ChatBox code={activeConv.code} sender="council" testPrefix="admin-chat" peerName={activeConv.pseudo} />
                  </div>
                ) : (
                  <SectionFrame
                    title={a.dash.titleMessages}
                    subtitle={a.dash.convEmpty}
                    icon={MessagesSquare}
                    testId="admin-messages-frame"
                  >
                    <ConvList onOpen={setActiveConv} />
                  </SectionFrame>
                )
              ) : (
                <>
                  {/* CALENDRIER DES SAISONS — réglé par le Conseil */}
                  <SectionFrame
                    title={lang === "en" ? "Season calendar" : "Calendrier des saisons"}
                    subtitle={lang === "en" ? "Season 2 start and gates opening (end of Season 2): the countdown, timeline and banner follow these dates." : "Début de la Saison 2 et ouverture des portes (fin de Saison 2) : le compte à rebours, la frise et le bandeau suivent ces dates."}
                    icon={MapIcon}
                    testId="admin-season-frame"
                  >
                    <SeasonPanel />
                  </SectionFrame>

                  {/* TABLEAU DE COMMANDE — stats enrichies */}
                  <SectionFrame
                    title={a.dash.statsTitle}
                    subtitle={a.dash.statsSub}
                    icon={Compass}
                    testId="admin-stats-frame"
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4" data-testid="admin-dashboard">
                      {a.dash.stats.map((st) => {
                        const Icon = statIcon[st.key] || Users;
                        const value = stats?.[st.key] ?? 0;
                        const total = stats?.total ?? 0;
                        const pct = st.key === "total" ? 100 : total > 0 ? Math.round((value / total) * 100) : 0;
                        return (
                          <motion.div
                            key={st.key}
                            data-testid={`admin-stat-${st.key}`}
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.25 }}
                            className="relative border border-gold/20 bg-ink/60 frame-plate p-4 sm:p-5 overflow-hidden"
                          >
                            <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-gold/60" />
                            <span aria-hidden="true" className="absolute bottom-1.5 left-1.5 w-1 h-1 rounded-full bg-gold/60" />
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-display text-4xl sm:text-5xl leading-none ${statCls[st.key]}`}>{value}</p>
                              <Icon className={`w-5 h-5 shrink-0 ${statCls[st.key]} opacity-80`} strokeWidth={1.6} />
                            </div>
                            <p className="font-mono2 text-[9px] tracking-[0.3em] text-mist mt-3">{st.label}</p>
                            {st.key !== "total" && (
                              <div className="mt-2.5">
                                <div className="h-[3px] bg-gold/10 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.9, ease: EASE }}
                                    className={`h-full ${statBarCls[st.key]}`}
                                  />
                                </div>
                                <p className="mt-1 font-mono2 text-[8px] tracking-[0.25em] text-mist/70">
                                  {pct}% {a.dash.shareOfFleet}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </SectionFrame>

                  {/* DÉCRETS — filtres & exports & recherche */}
                  <SectionFrame
                    title={a.dash.decreesTitle}
                    subtitle={a.dash.decreesSub}
                    icon={Scroll}
                    testId="admin-decrees-frame"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        {a.dash.filters.map((f) => (
                          <button
                            key={f.key}
                            data-testid={`admin-filter-${f.key}`}
                            onClick={() => setFilter(f.key)}
                            className={`font-mono2 text-[10px] tracking-[0.25em] px-4 py-2.5 border transition-all plank-cut ${
                              filter === f.key
                                ? "border-gold text-ink bg-gold shadow-[0_0_24px_rgba(212,175,55,0.25)]"
                                : "border-gold/25 text-mist hover:border-gold/60 hover:text-gold"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-gold/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            data-testid="admin-search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={a.dash.searchPh}
                            className="w-full bg-ink/70 border border-gold/25 pl-10 pr-4 py-2.5 font-fell text-sm text-bone placeholder:text-mist/50 focus:border-gold focus:shadow-[0_0_18px_rgba(212,175,55,0.15)] transition-all"
                          />
                        </div>
                        <div className="flex gap-2" data-testid="admin-export-cluster">
                          <button
                            data-testid="admin-export-xlsx"
                            onClick={() => setLangAsk("xlsx")}
                            disabled={exporting !== null || langAsk !== null}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono2 text-[10px] tracking-[0.2em] px-4 py-2.5 border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold disabled:opacity-50 transition-all"
                          >
                            <FileSpreadsheet className="w-4 h-4 shrink-0" />
                            {exporting === "xlsx" ? a.dash.exportBusy : a.dash.exportXlsx}
                          </button>
                          <button
                            data-testid="admin-export-pdf"
                            onClick={() => setLangAsk("pdf")}
                            disabled={exporting !== null || langAsk !== null}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono2 text-[10px] tracking-[0.2em] px-4 py-2.5 border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold disabled:opacity-50 transition-all"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            {exporting === "pdf" ? a.dash.exportBusy : a.dash.exportPdf}
                          </button>
                        </div>
                      </div>
                    </div>
                  </SectionFrame>

                  {/* GRAND LIVRE DE BORD — registre */}
                  <SectionFrame
                    title={a.dash.registerTitle}
                    subtitle={a.dash.registerSub}
                    icon={Scroll}
                    right={
                      <span className="font-mono2 text-[9px] tracking-[0.3em] text-gold border border-gold/30 px-3 py-1.5">
                        {visible.length} {a.dash.entriesLabel}
                      </span>
                    }
                    testId="admin-register-frame"
                  >
                    <div className="space-y-3">
                      {visible.length === 0 ? (
                        <div data-testid="admin-empty-state" className="border border-dashed border-gold/25 bg-deck/40 p-14 text-center">
                          <Anchor className="w-8 h-8 text-gold/60 mx-auto mb-4" />
                          <p className="font-display text-2xl text-bone/70 mb-2">{a.dash.emptyTitle}</p>
                          <p className="font-fell italic text-base text-mist">{a.dash.emptyText}</p>
                        </div>
                      ) : (
                        visible.map((app) => (
                          <AppRow key={app.id} app={app} onUpdate={onUpdate} onDelete={onDelete} history={getHistory(app)} />
                        ))
                      )}
                    </div>
                  </SectionFrame>
                </>
              )}
            </>
          )}
        </div>
      </main>
      {/* --- MODAL LANGUE EXPORT --- */}
      {langAsk && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/85 backdrop-blur-sm px-4"
          onClick={() => {
            if (exporting) return; // ne pas fermer pendant la génération
            setLangAsk(null);
            setExportLangChoice(null);
            setExportError(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            data-testid="export-lang-modal"
            data-state={exporting ? "generating" : exportError ? "error" : "choose"}
            className="relative w-full max-w-md border-2 border-gold/60 bg-deck frame-plate p-7 sm:p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {[["top-2", "left-2"], ["top-2", "right-2"], ["bottom-2", "left-2"], ["bottom-2", "right-2"]].map(([v, h]) => (
              <span key={v + h} className={`absolute ${v} ${h} w-2 h-2 rounded-full bg-gold/60`} aria-hidden="true" />
            ))}
            {!exporting && (
              <button
                type="button"
                data-testid="export-lang-cancel"
                onClick={() => {
                  setLangAsk(null);
                  setExportLangChoice(null);
                  setExportError(null);
                }}
                aria-label="Fermer"
                className="absolute top-3 right-3 text-mist hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="flex justify-center mb-4">
              <WaxSealIcon className="w-14 h-14" />
            </div>
            <p className="font-mono2 text-[10px] tracking-[0.35em] text-gold/80 mb-2">{a.dash.exportsTitle}</p>
            <p className="font-display text-2xl sm:text-3xl text-gold uppercase tracking-wide mb-3">{a.dash.exportAskTitle}</p>

            {/* ÉTAT 1 — Choix de langue */}
            {!exporting && !exportError && (
              <>
                <p className="font-fell text-base text-mist mb-6">{a.dash.exportAskSub}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    data-testid="export-lang-fr"
                    onClick={() => downloadExport(langAsk, "fr")}
                    className="group flex flex-col items-center gap-1 border border-gold/40 py-4 px-3 text-gold hover:bg-gold/10 hover:border-gold focus-visible:bg-gold/10 focus-visible:border-gold focus-visible:outline-none transition-colors"
                  >
                    <span className="font-display text-xl tracking-wide">🇫🇷 FR</span>
                    <span className="font-mono2 text-[10px] tracking-[0.25em]">{a.dash.exportFr}</span>
                    <span className="font-fell text-[11px] text-mist/80 italic">{a.dash.exportFrHint}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="export-lang-en"
                    onClick={() => downloadExport(langAsk, "en")}
                    className="group flex flex-col items-center gap-1 border border-gold/40 py-4 px-3 text-gold hover:bg-gold/10 hover:border-gold focus-visible:bg-gold/10 focus-visible:border-gold focus-visible:outline-none transition-colors"
                  >
                    <span className="font-display text-xl tracking-wide">🇬🇧 EN</span>
                    <span className="font-mono2 text-[10px] tracking-[0.25em]">{a.dash.exportEn}</span>
                    <span className="font-fell text-[11px] text-mist/80 italic">{a.dash.exportEnHint}</span>
                  </button>
                </div>
              </>
            )}

            {/* ÉTAT 2 — Génération en cours (le modal RESTE visible pour feedback) */}
            {exporting && (
              <div data-testid="export-generating" className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
                <p className="font-fell text-base text-bone/90 leading-relaxed">
                  {a.dash.exportGenerating}
                </p>
                <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold/70">
                  {langAsk?.toUpperCase()} · {exportLangChoice?.toUpperCase()}
                </p>
              </div>
            )}

            {/* ÉTAT 3 — Erreur avec retry */}
            {!exporting && exportError && (
              <div data-testid="export-error" className="flex flex-col items-center gap-4 py-2">
                <AlertTriangle className="w-10 h-10 text-bloodglow" />
                <p className="font-fell text-base text-bone/90 leading-relaxed">
                  {exportError}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    type="button"
                    data-testid="export-retry"
                    onClick={() => downloadExport(langAsk, exportLangChoice || "fr")}
                    className="flex-1 inline-flex items-center justify-center gap-2 font-mono2 text-xs tracking-[0.25em] bg-gold text-ink py-3 min-h-[44px] hover:bg-goldlight focus-visible:bg-goldlight focus-visible:outline-none transition-colors"
                  >
                    {a.dash.exportRetry}
                  </button>
                  <button
                    type="button"
                    data-testid="export-error-close"
                    onClick={() => {
                      setLangAsk(null);
                      setExportLangChoice(null);
                      setExportError(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 font-mono2 text-xs tracking-[0.25em] border border-gold/40 text-gold py-3 min-h-[44px] hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors"
                  >
                    {a.dash.cancel || a.cancel || "ANNULER"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      <Footer />
    </div>
  );
}
