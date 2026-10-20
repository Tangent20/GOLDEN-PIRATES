import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Copy, Check, X, Anchor, ListChecks, Hourglass, Megaphone, Skull, Swords, Radio, Feather, LifeBuoy,
  ScrollText, Telescope, Shield, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Sailboat, Pencil,
  Stamp, Trash2, HardDriveDownload, Compass,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useLang, fmtPower } from "@/lib/i18n";
import Countdown from "@/components/Countdown";
import { Checkbox } from "@/components/ui/checkbox";
import { saveBottle } from "@/lib/rack";
import useRole from "@/lib/role";
import { smoothScrollTo, lockScroll, unlockScroll } from "@/lib/scroll";
import useSeason from "@/lib/season";

const EASE = [0.16, 1, 0.3, 1];
const DRAFT_KEY = "gp_apply_draft";
const POWER_MIN_M = 6;
const POWER_MAX_M = 20;
const MSG_MIN = 10;

const EMPTY = { pseudo: "", power: "", troops: null, activity: null, experience: "", discord: "", message: "" };

const inputBase =
  "w-full min-h-[52px] lg:min-h-[56px] bg-ink/70 border px-4 py-3 lg:px-5 lg:py-3.5 font-fell text-base lg:text-[17px] text-bone placeholder:text-mist/45 focus:border-gold focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-[border-color,box-shadow] duration-300";
const inputCls = (err) => `${inputBase} ${err ? "border-bloodglow/70" : "border-gold/25"}`;
const labelCls = "flex items-center justify-between gap-2 font-mono2 text-[11px] sm:text-xs lg:text-[13px] tracking-[0.3em] text-gold mb-2.5";

// Même logique que le serveur (parse_power_m) : '8M', '12,5M', '20M+', '950K', '9 500 000' → millions
export function parsePowerM(text) {
  const t = String(text || "").replace(/[\s\u202f']/g, "").toUpperCase().replace(/,/g, ".");
  let m = t.match(/(\d+(?:\.\d+)?)M/);
  if (m) return parseFloat(m[1]);
  m = t.match(/(\d+(?:\.\d+)?)K/);
  if (m) return parseFloat(m[1]) / 1000;
  const digits = t.replace(/\./g, "").replace(/\+$/, "");
  if (/^\d{4,}$/.test(digits)) return parseInt(digits, 10) / 1_000_000;
  return null;
}

const powerBand = (text) => {
  const v = parsePowerM(text);
  if (v === null) return "unreadable";
  if (v < POWER_MIN_M) return "below";
  if (v > POWER_MAX_M || (v >= POWER_MAX_M && /\+\s*$/.test(text))) return "above";
  return "inRange";
};

const readDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!d || typeof d !== "object" || !d.form) return null;
    const f = { ...EMPTY, ...d.form };
    const filled = ["pseudo", "power", "experience", "discord", "message"].some((k) => String(f[k] || "").trim());
    return filled || f.troops !== null || f.activity !== null ? { form: f, step: Math.min(Math.max(0, d.step | 0), 3) } : null;
  } catch {
    return null;
  }
};

const scrollToEl = (el, force = false) => {
  if (!el) return;
  if (!force && el.getBoundingClientRect().top > 70 && el.getBoundingClientRect().top < window.innerHeight * 0.4) return;
  smoothScrollTo(el);
};

const copyText = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  // Repli iOS / anciens navigateurs
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p data-testid={`field-error-${id}`} role="alert" className="mt-2 flex items-start gap-2 font-mono2 text-[9px] tracking-[0.18em] text-bloodglow leading-relaxed">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <span>{children}</span>
    </p>
  );
}

function StepHeader({ icon: Icon, title, num }) {
  return (
    <div className="flex items-center gap-3 lg:gap-4 w-full mb-6 lg:mb-8">
      <span className="shrink-0 w-10 h-10 lg:w-12 lg:h-12 brass-porthole bg-ink flex items-center justify-center">
        <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-gold" />
      </span>
      <span className="font-mono2 text-[11px] sm:text-xs lg:text-sm tracking-[0.3em] text-gold uppercase">{title}</span>
      <span className="flex-1 h-px bg-gold/15" />
      <span className="font-display text-lg lg:text-2xl text-gold/60">{num}</span>
    </div>
  );
}

function ChoiceGroup({ id, label, options, value, onChange, error }) {
  return (
    <div>
      <p id={`${id}-label`} className={labelCls}>
        <span>{label}</span>
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} data-testid={`select-${id}`} className="grid sm:grid-cols-2 gap-2.5">
        {options.map((o, i) => {
          const on = value === i;
          return (
            <button
              key={`${id}-${i}`}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`${id}-option-${i}`}
              onClick={() => onChange(i)}
              className={`group relative min-h-[56px] flex items-center gap-3 text-left px-4 py-3 border transition-[border-color,background-color,box-shadow] duration-200 ${
                on
                  ? "border-gold bg-gold/10 shadow-[inset_0_0_18px_rgba(212,175,55,0.12)]"
                  : `${error ? "border-bloodglow/50" : "border-gold/20"} bg-ink/50 hover:border-gold/55`
              }`}
            >
              <span className={`shrink-0 w-5 h-5 rotate-45 border flex items-center justify-center transition-colors ${on ? "border-gold bg-gold" : "border-gold/40"}`}>
                {on && <Check className="w-3 h-3 -rotate-45 text-ink" strokeWidth={3} />}
              </span>
              <span className={`font-fell text-base leading-snug ${on ? "text-bone" : "text-bone/75"}`}>{o}</span>
            </button>
          );
        })}
      </div>
      <FieldError id={id}>{error}</FieldError>
    </div>
  );
}

function RolePanel({ role, latest, c, s, navigate, onOverride, stats, panelRef }) {
  const r = s.rolePanel;
  const isCouncil = role === "council";
  const st = latest?.status || "pending";
  const statusLabel = c.status?.[st]?.label || st;
  const statusCls = st === "accepted" ? "text-emerald-300 border-emerald-400/50" : st === "rejected" ? "text-bloodglow border-bloodglow/50" : st === "reserve" ? "text-amber-400 border-amber-400/50" : "text-gold border-gold/50";
  const go = (to) => navigate(to, { state: { navTs: Date.now() } });
  return (
    <motion.div
      ref={panelRef}
      data-testid={isCouncil ? "apply-council-panel" : "apply-recruit-panel"}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="lg:col-span-7 min-w-0 relative border-2 border-gold/30 bg-parch/85 frame-plate p-6 sm:p-9 scroll-mt-28"
    >
      {[["top-2", "left-2"], ["top-2", "right-2"], ["bottom-2", "left-2"], ["bottom-2", "right-2"]].map(([v, h]) => (
        <span key={v + h} className={`pointer-events-none absolute ${v} ${h} w-2 h-2 rounded-full bg-gold/50`} aria-hidden="true" />
      ))}
      <div className="flex items-start gap-4 mb-6">
        <span className="shrink-0 w-14 h-14 wax-seal flex items-center justify-center">
          {isCouncil ? <Shield className="w-6 h-6 text-amber-100" /> : <Telescope className="w-6 h-6 text-amber-100" />}
        </span>
        <div className="min-w-0">
          <p data-testid={isCouncil ? "apply-council-banner" : "apply-recruit-banner"} className={`font-mono2 text-[9px] sm:text-[10px] tracking-[0.28em] ${isCouncil ? "text-goldlight" : "text-emerald-300"}`}>
            {isCouncil ? r.councilEyebrow : r.recruitEyebrow}
          </p>
          <h3 className="mt-2 font-display text-3xl sm:text-4xl text-gold leading-tight break-words">
            {isCouncil ? r.councilTitle : r.recruitTitle(latest?.pseudo || "")}
          </h3>
        </div>
      </div>
      <p className="font-fell text-base sm:text-lg text-bone/80 leading-relaxed mb-6">
        {isCouncil ? r.councilText : st === "rejected" ? r.recruitRejected : r.recruitText}
      </p>

      {isCouncil ? (
        <div data-testid="apply-council-stats" className="grid grid-cols-3 gap-2.5 mb-7">
          {["pending", "reserve", "accepted"].map((k) => (
            <div key={k} data-testid={`apply-council-stat-${k}`} className="border border-gold/20 bg-ink/60 px-3 py-4 text-center">
              <p className={`font-display text-3xl sm:text-4xl leading-none ${k === "accepted" ? "text-emerald-400" : k === "reserve" ? "text-amber-400" : "text-gold"}`}>
                {stats ? stats[k] ?? 0 : <Loader2 className="w-6 h-6 mx-auto animate-spin text-gold/60" />}
              </p>
              <p className="mt-2 font-mono2 text-[8px] sm:text-[9px] tracking-[0.2em] text-mist">{r.stats[k]}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5 mb-7">
          <div className="border border-gold/25 bg-ink/60 px-4 py-3">
            <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist mb-1.5">{r.codeLabel}</p>
            <p data-testid="apply-recruit-code" className="font-mono2 text-xl tracking-[0.12em] text-goldlight break-all">{latest?.code}</p>
          </div>
          <div className="border border-gold/25 bg-ink/60 px-4 py-3">
            <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist mb-1.5">{r.statusLabel}</p>
            <span data-testid="apply-recruit-status" className={`inline-block border px-2.5 py-1 font-mono2 text-[10px] tracking-[0.2em] ${statusCls}`}>{statusLabel}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          data-testid={isCouncil ? "apply-council-goto" : "apply-recruit-goto"}
          onClick={() => go(isCouncil ? "/admin#registry" : "/suivi#dossier")}
          className="flex-1 inline-flex items-center justify-center gap-2 min-h-[54px] font-display text-xl tracking-wider uppercase bg-gold text-ink hover:shadow-[0_0_40px_rgba(212,175,55,0.45)] active:scale-[0.99] transition-[box-shadow,transform]"
        >
          {isCouncil ? <ScrollText className="w-5 h-5" /> : <Telescope className="w-5 h-5" />}
          {isCouncil ? r.openRegistry : r.openFile}
        </button>
        <button
          type="button"
          data-testid={isCouncil ? "apply-council-messages" : "apply-recruit-write"}
          onClick={() => go(isCouncil ? "/admin#messagerie" : "/suivi#mer")}
          className="sm:w-auto inline-flex items-center justify-center gap-2 min-h-[54px] px-5 font-mono2 text-[10px] tracking-[0.25em] border border-gold/50 text-gold hover:bg-gold/10 transition-colors"
        >
          <Feather className="w-4 h-4" /> {isCouncil ? r.openMessages : r.writeCouncil}
        </button>
      </div>
      <button
        type="button"
        data-testid="apply-role-override"
        onClick={onOverride}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 min-h-[44px] font-mono2 text-[9px] sm:text-[10px] tracking-[0.25em] text-mist hover:text-gold transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" /> {isCouncil ? r.preview : st === "rejected" ? r.retry : r.otherAccount}
      </button>
    </motion.div>
  );
}

export default function ApplyForm() {
  const { c, lang } = useLang();
  const season = useSeason();
  const s = c.apply;
  const w = s.wizard;
  const navigate = useNavigate();
  const { role, latest } = useRole();
  const locale = lang === "fr" ? "fr-FR" : "en-GB";

  const initialDraft = useMemo(() => readDraft(), []);
  const [form, setForm] = useState(() => initialDraft?.form || EMPTY);
  const [step, setStep] = useState(() => initialDraft?.step || 0);
  const [maxStep, setMaxStep] = useState(() => initialDraft?.step || 0);
  const [draftRestored, setDraftRestored] = useState(!!initialDraft);
  const [errors, setErrors] = useState({});
  const [oath, setOath] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pcheck, setPcheck] = useState({ state: null, retry_at: null, for: "" });
  const sendingRef = useRef(false);
  const [override, setOverride] = useState(false);
  const [councilStats, setCouncilStats] = useState(null);
  const gated = !result && !override && ((role === "recruit" && !!latest) || role === "council");
  const councilPreview = role === "council" && override;
  const formRef = useRef(null);
  const closeRef = useRef(null);
  const fieldRefs = useRef({});
  const reg = (k) => (el) => { fieldRefs.current[k] = el; };

  const set = (key) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: v }));
    setErrors((er) => (er[key] ? { ...er, [key]: null } : er));
    setServerError(null);
  };

  // ---------- Brouillon auto (survit à un rechargement / un appel entrant) ----------
  useEffect(() => {
    if (result) return;
    const t = setTimeout(() => {
      try {
        const empty = JSON.stringify(form) === JSON.stringify(EMPTY);
        if (empty) localStorage.removeItem(DRAFT_KEY);
        else localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step: Math.min(step, 3), at: Date.now() }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [form, step, result]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setForm(EMPTY);
    setStep(0);
    setMaxStep(0);
    setErrors({});
    setOath(false);
    setDraftRestored(false);
    setPcheck({ state: null, retry_at: null, for: "" });
  };

  // ---------- Vérification du pseudo en direct ----------
  useEffect(() => {
    const p = form.pseudo.trim();
    if (p.length < 2) {
      setPcheck({ state: null, retry_at: null, for: "" });
      return;
    }
    let alive = true;
    setPcheck((pc) => ({ ...pc, state: "checking", for: p }));
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/applications/check-pseudo", { params: { pseudo: p } });
        if (alive) setPcheck({ state: data?.state || null, retry_at: data?.retry_at || null, for: p });
      } catch {
        if (alive) setPcheck({ state: null, retry_at: null, for: p }); // hors-ligne : le serveur tranchera à l'envoi
      }
    }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [form.pseudo]);

  useEffect(() => {
    if (role !== "council") return;
    let alive = true;
    api.get("/admin/stats").then(({ data }) => { if (alive) setCouncilStats(data || {}); }).catch(() => { if (alive) setCouncilStats({}); });
    return () => { alive = false; };
  }, [role]);
  useEffect(() => { if (role === "visitor") setOverride(false); }, [role]);

  const blockedPseudo = ["active", "accepted", "cooldown"].includes(pcheck.state) && pcheck.for === form.pseudo.trim();
  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }).toUpperCase(); } catch { return ""; }
  };

  // ---------- Validation par étape ----------
  const validate = useCallback((st) => {
    const e = {};
    if (st === 0) {
      if (form.pseudo.trim().length < 2) e.pseudo = s.errors.pseudo;
      else if (blockedPseudo) e.pseudo = pcheck.state === "active" ? s.errors.duplicateActive : pcheck.state === "accepted" ? s.errors.alreadyAccepted : s.errors.cooldown(fmtDate(pcheck.retry_at));
      if (!form.power.trim()) e.power = fmtPower(s.errors.power);
      else if (parsePowerM(form.power) === null) e.power = s.powerHint.unreadable;
    }
    if (st === 1) {
      if (form.troops === null) e.troops = s.errorsInline.troops;
      if (form.activity === null) e.activity = s.errorsInline.activity;
    }
    if (st === 3) {
      if (form.message.trim().length < MSG_MIN) e.message = s.errors.message;
    }
    return e;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, blockedPseudo, pcheck, s]);

  const goTo = (n) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    setErrors({});
    setTimeout(() => scrollToEl(formRef.current), 30);
  };

  const next = (e) => {
    e?.preventDefault?.();
    const er = validate(step);
    if (Object.keys(er).length) {
      setErrors(er);
      const first = ["pseudo", "power", "troops", "activity", "message"].find((k) => er[k]);
      const el = fieldRefs.current[first];
      if (el?.focus) el.focus({ preventScroll: false });
      return;
    }
    // Une étape antérieure invalide (ex : pseudo devenu bloqué) renvoie à la bonne étape
    if (step === 3) {
      for (let i = 0; i < 3; i++) {
        const prevErr = validate(i);
        if (Object.keys(prevErr).length) { setStep(i); setErrors(prevErr); return; }
      }
    }
    goTo(Math.min(step + 1, 4));
  };

  const seal = async () => {
    if (sendingRef.current || councilPreview) return;
    if (!oath) {
      setErrors({ oath: s.errorsInline.oath });
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setServerError(null);
    const payload = {
      pseudo: form.pseudo.trim(),
      power: form.power.trim(),
      troops: s.troopsOptions[form.troops] ?? s.troopsOptions[1],
      activity: s.activityOptions[form.activity] ?? s.activityOptions[1],
      experience: form.experience.trim(),
      discord: form.discord.trim(),
      message: form.message.trim(),
    };
    try {
      const { data } = await api.post("/applications", payload);
      saveBottle(data.tracking_code, data.pseudo || payload.pseudo, data.status || "pending");
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setResult(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const code = detail?.code;
      let msg;
      if (code === "duplicate_active") msg = s.errors.duplicateActive;
      else if (code === "already_accepted") msg = s.errors.alreadyAccepted;
      else if (code === "cooldown") msg = detail?.retry_at ? s.errors.cooldown(fmtDate(detail.retry_at)) : formatApiError(err);
      else if (code === "ip_limit") msg = s.errors.ipLimit;
      else msg = formatApiError(err);
      setServerError({ code, msg });
      toast.error(msg, { id: "apply-error" });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  // ---------- Fenêtre de remerciement : focus, Échap, page figée ----------
  const closeResult = useCallback(() => {
    setResult(null);
    setForm(EMPTY);
    setStep(0);
    setMaxStep(0);
    setOath(false);
    setErrors({});
    setDraftRestored(false);
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!result) return;
    lockScroll();
    const t = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 120);
    const onKey = (e) => { if (e.key === "Escape") closeResult(); };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [result, closeResult]);

  const copyCode = async () => {
    const ok = await copyText(result.tracking_code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else toast.error(s.errors.copyFail);
  };

  const band = form.power.trim() ? powerBand(form.power) : null;
  const msgLeft = Math.max(0, MSG_MIN - form.message.trim().length);
  const progress = (step / 4) * 100;

  const reviewSections = [
    { step: 0, key: "identity", title: s.groups.identity, rows: [[s.labels.pseudo, form.pseudo], [s.labels.power, form.power]] },
    { step: 1, key: "force", title: s.groups.force, rows: [[s.labels.troops, s.troopsOptions[form.troops] ?? ""], [s.labels.activity, s.activityOptions[form.activity] ?? ""]] },
    { step: 2, key: "signals", title: s.groups.signals, rows: [[s.labels.discord, form.discord]] },
    { step: 3, key: "letter", title: s.groups.letter, rows: [[s.labels.experience, form.experience], [s.labels.message, form.message]] },
  ];

  const pseudoStatus = (() => {
    const st = pcheck.for === form.pseudo.trim() ? pcheck.state : form.pseudo.trim().length >= 2 ? "checking" : null;
    if (!st || st === "invalid") return null;
    const map = {
      checking: { cls: "text-mist", icon: <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />, txt: s.pseudoCheck.checking },
      free: { cls: "text-emerald-300", icon: <Check className="w-3.5 h-3.5 shrink-0" />, txt: s.pseudoCheck.free },
      active: { cls: "text-amber-400", icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />, txt: s.pseudoCheck.active },
      accepted: { cls: "text-amber-400", icon: <Anchor className="w-3.5 h-3.5 shrink-0" />, txt: s.pseudoCheck.accepted },
      cooldown: { cls: "text-bloodglow", icon: <Hourglass className="w-3.5 h-3.5 shrink-0" />, txt: s.pseudoCheck.cooldown(fmtDate(pcheck.retry_at)) },
    };
    return { st, ...map[st] };
  })();

  return (
    <section id="postuler" data-testid="application-section" className="relative py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* ===== COLONNE GAUCHE — l'appel du Conseil ===== */}
          <div className="lg:col-span-5 min-w-0">
            <p className="font-mono2 text-[11px] tracking-[0.35em] text-gold mb-5 uppercase">{s.eyebrow}</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-bone leading-[1.02] mb-8 uppercase">
              {s.title1}<span className="text-gold">{s.titleGold}</span>
            </h2>
            <div data-testid="apply-mission-order" className="mb-6 border border-blood/45 bg-blood/[0.08]">
              <p
                data-testid="migration-banner"
                className="flex items-start gap-2.5 px-4 py-3 font-mono2 text-[9px] sm:text-[10px] leading-relaxed tracking-[0.18em] sm:tracking-[0.22em] text-bloodglow"
              >
                <Megaphone className="w-4 h-4 shrink-0" />
                <span>{fmtPower(s.migrationBanner)}</span>
              </p>
              <div className="border-t border-blood/30 px-4 py-3" data-testid="apply-countdown-wrap">
                <Countdown variant="line" testid="apply-countdown" />
              </div>
            </div>
            <p data-testid="apply-intro" className="font-fell text-base sm:text-lg text-bone/80 leading-relaxed mb-6">{season.recruit_open ? s.introRecruit : s.intro}</p>

            <button
              type="button"
              data-testid="apply-hoist-btn"
              onClick={() => (gated ? navigate(role === "council" ? "/admin#registry" : "/suivi#dossier", { state: { navTs: Date.now() } }) : scrollToEl(formRef.current, true))}
              className="lg:hidden mb-8 w-full inline-flex items-center justify-center gap-2 min-h-[52px] font-display text-xl tracking-wider uppercase bg-gold text-ink active:scale-[0.99] transition-transform"
            >
              <Sailboat className="w-5 h-5" /> {gated ? (role === "council" ? s.rolePanel.openRegistry : s.rolePanel.openFile) : s.voyageCta}
            </button>

            {/* Carte de la traversée — desktop (sur mobile, la route est déjà dans le formulaire) */}
            <div data-testid="apply-voyage-map" className={`${gated ? "hidden" : "hidden lg:block"} mb-8 border border-gold/20 bg-deck/50 p-5`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.3em] text-gold">
                  <Compass className="w-3.5 h-3.5" /> {s.voyageTitle}
                </p>
                <span className="font-mono2 text-[9px] tracking-[0.2em] text-mist border border-gold/20 px-2 py-1">{s.voyageTime}</span>
              </div>
              <ol className="relative space-y-3">
                <span aria-hidden="true" className="absolute left-[13px] top-3 bottom-3 border-l border-dashed border-gold/30" />
                {s.voyage.map((v, i) => {
                  const done = i < step;
                  const cur = i === step;
                  return (
                    <li key={`voyage-${i}`} data-testid={`apply-voyage-${i}`} className="relative flex items-start gap-3">
                      <span
                        className={`relative z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-mono2 text-[10px] transition-colors duration-300 ${
                          cur ? "gold-ingot text-ink" : done ? "bg-gold/25 border border-gold text-gold" : "bg-ink border border-gold/30 text-mist"
                        }`}
                      >
                        {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className={`font-display text-lg leading-none ${cur ? "text-gold" : "text-bone/85"}`}>{v.t}</p>
                        <p className="mt-1 font-fell text-sm text-bone/60 leading-snug">{v.d}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-3">{s.promisesTitle}</p>
            <ul data-testid="apply-promises" className="grid gap-2.5">
              {s.bullets.map((item, i) => {
                const Icon = [Swords, Hourglass, ScrollText][i] || Anchor;
                return (
                  <li key={`bullet-${i}`} className="flex items-start gap-3 border border-gold/15 bg-ink/40 px-4 py-3">
                    <span className="shrink-0 w-8 h-8 brass-porthole bg-ink flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-gold" />
                    </span>
                    <span className="font-fell text-base text-bone/80 leading-snug pt-1">{fmtPower(item)}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ===== COLONNE DROITE — le parchemin d'enrôlement ===== */}
          {gated ? (
            <RolePanel
              role={role}
              latest={latest}
              c={c}
              s={s}
              navigate={navigate}
              stats={councilStats}
              panelRef={formRef}
              onOverride={() => { setOverride(true); setTimeout(() => scrollToEl(formRef.current, true), 60); }}
            />
          ) : (
          <motion.form
            ref={formRef}
            data-testid="application-form"
            data-step={step}
            onSubmit={(e) => { e.preventDefault(); if (step < 4) next(e); }}
            noValidate
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="lg:col-span-7 min-w-0 relative border-2 border-gold/30 bg-parch/85 frame-plate p-5 sm:p-9 lg:p-11 scroll-mt-28"
          >
            {[["top-2", "left-2"], ["top-2", "right-2"], ["bottom-2", "left-2"], ["bottom-2", "right-2"]].map(([v, h]) => (
              <span key={v + h} className={`pointer-events-none absolute ${v} ${h} w-2 h-2 rounded-full bg-gold/50`} aria-hidden="true" />
            ))}

            {councilPreview && (
              <div data-testid="apply-council-preview" className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-gold/40 bg-blood/[0.12] px-4 py-2.5">
                <p className="flex items-center gap-2 font-mono2 text-[9px] tracking-[0.2em] text-goldlight">
                  <Shield className="w-3.5 h-3.5 shrink-0 text-red-300" /> {s.rolePanel.previewBanner}
                </p>
                <button
                  type="button"
                  data-testid="apply-council-preview-back"
                  onClick={() => setOverride(false)}
                  className="min-h-[36px] font-mono2 text-[9px] tracking-[0.2em] text-gold hover:text-goldlight px-2 transition-colors"
                >
                  {s.rolePanel.backToPanel}
                </button>
              </div>
            )}
            {/* --- Route d'enrôlement (progression) --- */}
            <div data-testid="apply-progress" className="mb-7 lg:mb-9">
              <div className="flex items-center justify-between gap-3 mb-3 lg:mb-4">
                <p className="font-mono2 text-[10px] sm:text-[11px] lg:text-xs tracking-[0.3em] text-gold/80">{w.route}</p>
                <p data-testid="apply-step-label" className="font-mono2 text-[10px] sm:text-[11px] lg:text-xs tracking-[0.3em] text-mist">{w.stepOf(step + 1, 5)}</p>
              </div>
              <div className="relative">
                <div className="absolute left-[10%] right-[10%] top-[15px] lg:top-[21px] h-[2px] bg-gold/15" aria-hidden="true" />
                <motion.div
                  aria-hidden="true"
                  className="absolute left-[10%] top-[15px] lg:top-[21px] h-[2px] bg-gold origin-left"
                  style={{ width: "80%" }}
                  initial={false}
                  animate={{ scaleX: progress / 100 }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
                <ol className="relative grid grid-cols-5">
                  {w.steps.map((label, i) => {
                    const done = i < step;
                    const cur = i === step;
                    const reachable = i <= maxStep && !result;
                    return (
                      <li key={`apply-step-${i}`} className="flex flex-col items-center">
                        <button
                          type="button"
                          data-testid={`apply-step-${i}`}
                          data-state={cur ? "current" : done ? "done" : "todo"}
                          disabled={!reachable || cur}
                          onClick={() => goTo(i)}
                          aria-current={cur ? "step" : undefined}
                          aria-label={label}
                          className={`relative w-8 h-8 lg:w-11 lg:h-11 rounded-full flex items-center justify-center font-mono2 text-[10px] lg:text-sm transition-colors duration-300 disabled:cursor-default ${
                            cur ? "gold-ingot text-ink shadow-[0_0_16px_rgba(212,175,55,0.45)]" : done ? "bg-gold/25 border border-gold text-gold hover:bg-gold/40" : "bg-ink border border-gold/25 text-mist"
                          }`}
                        >
                          {done ? <Check className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={3} /> : i === 4 ? <Stamp className="w-3.5 h-3.5 lg:w-5 lg:h-5" /> : i + 1}
                        </button>
                        <span className={`mt-2 lg:mt-3 font-mono2 text-[9px] sm:text-[10px] lg:text-[11px] tracking-[0.15em] sm:tracking-[0.22em] text-center ${cur ? "text-gold" : "text-mist/70"}`}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            {/* --- Brouillon retrouvé --- */}
            {draftRestored && step < 4 && (
              <div data-testid="draft-restored" className="mb-6 flex items-center justify-between gap-3 border border-gold/25 bg-gold/[0.06] px-4 py-2.5">
                <p className="flex items-center gap-2 font-mono2 text-[9px] tracking-[0.18em] text-gold/90 leading-relaxed">
                  <HardDriveDownload className="w-3.5 h-3.5 shrink-0" /> {s.draft.restored}
                </p>
                <button
                  type="button"
                  data-testid="draft-clear-btn"
                  onClick={clearDraft}
                  className="shrink-0 inline-flex items-center gap-1.5 min-h-[36px] font-mono2 text-[9px] tracking-[0.2em] text-mist hover:text-bloodglow px-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {s.draft.clear}
                </button>
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`pane-${step}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {/* ÉTAPE 1 — IDENTITÉ */}
                {step === 0 && (
                  <fieldset data-testid="form-group-identity" className="space-y-6">
                    <legend className="sr-only">{s.groups.identity}</legend>
                    <StepHeader icon={Skull} title={s.groups.identity} num="I" />
                    <div>
                      <label className={labelCls} htmlFor="f-pseudo"><span>{s.labels.pseudo}</span></label>
                      <input
                        ref={reg("pseudo")}
                        id="f-pseudo"
                        name="pseudo"
                        data-testid="input-pseudo"
                        className={inputCls(errors.pseudo)}
                        value={form.pseudo}
                        onChange={set("pseudo")}
                        placeholder={s.ph.pseudo}
                        maxLength={32}
                        autoComplete="nickname"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        aria-invalid={!!errors.pseudo}
                      />
                      {pseudoStatus && !errors.pseudo && (
                        <p data-testid="pseudo-check-status" data-state={pseudoStatus.st} aria-live="polite" className={`mt-2 flex items-start gap-2 font-mono2 text-[9px] tracking-[0.18em] leading-relaxed ${pseudoStatus.cls}`}>
                          {pseudoStatus.icon} <span>{pseudoStatus.txt}</span>
                        </p>
                      )}
                      <FieldError id="pseudo">{errors.pseudo}</FieldError>
                      {(pcheck.state === "active" || pcheck.state === "accepted") && pcheck.for === form.pseudo.trim() && (
                        <button
                          type="button"
                          data-testid="pseudo-check-cta"
                          onClick={() => navigate("/suivi", { state: { navTs: Date.now() } })}
                          className="mt-3 inline-flex items-center gap-2 min-h-[44px] font-mono2 text-[10px] tracking-[0.22em] px-4 py-2.5 border border-amber-400/50 text-amber-300 hover:bg-amber-400/10 transition-colors"
                        >
                          <Telescope className="w-4 h-4" /> {s.pseudoCheck.cta}
                        </button>
                      )}
                    </div>

                    <div>
                      <label className={labelCls} htmlFor="f-power"><span>{s.labels.power}</span></label>
                      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={s.labels.power}>
                        {s.powerQuick.map((p, i) => (
                          <button
                            key={`pq-${i}`}
                            type="button"
                            data-testid={`power-quick-${i}`}
                            onClick={() => set("power")(p)}
                            aria-pressed={form.power.trim().toUpperCase() === p}
                            className={`min-h-[44px] min-w-[60px] px-3.5 font-mono2 text-[11px] tracking-[0.15em] border transition-colors ${
                              form.power.trim().toUpperCase() === p ? "gold-ingot border-gold text-ink" : "border-gold/30 bg-ink/50 text-gold hover:border-gold hover:bg-gold/10"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <input
                        ref={reg("power")}
                        id="f-power"
                        name="power"
                        data-testid="input-power"
                        className={inputCls(errors.power)}
                        value={form.power}
                        onChange={set("power")}
                        placeholder={fmtPower(s.ph.power)}
                        maxLength={16}
                        autoComplete="off"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        aria-invalid={!!errors.power}
                      />
                      {band && !errors.power && (
                        <p
                          data-testid="power-hint"
                          data-band={band}
                          className={`mt-2 flex items-start gap-2 font-mono2 text-[9px] tracking-[0.18em] leading-relaxed ${
                            band === "inRange" ? "text-emerald-300" : band === "above" ? "text-gold" : band === "below" ? "text-amber-400" : "text-bloodglow"
                          }`}
                        >
                          {band === "unreadable" ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Swords className="w-3.5 h-3.5 shrink-0" />}
                          <span>{s.powerHint[band]}</span>
                        </p>
                      )}
                      <FieldError id="power">{errors.power}</FieldError>
                    </div>
                  </fieldset>
                )}

                {/* ÉTAPE 2 — FORCE */}
                {step === 1 && (
                  <fieldset data-testid="form-group-force" className="space-y-7">
                    <legend className="sr-only">{s.groups.force}</legend>
                    <StepHeader icon={Swords} title={s.groups.force} num="II" />
                    <div ref={reg("troops")} tabIndex={-1} className="outline-none">
                      <ChoiceGroup id="troops" label={s.labels.troops} options={s.troopsOptions} value={form.troops} onChange={set("troops")} error={errors.troops} />
                    </div>
                    <div ref={reg("activity")} tabIndex={-1} className="outline-none">
                      <ChoiceGroup id="activity" label={s.labels.activity} options={s.activityOptions} value={form.activity} onChange={set("activity")} error={errors.activity} />
                    </div>
                  </fieldset>
                )}

                {/* ÉTAPE 3 — SIGNAUX */}
                {step === 2 && (
                  <fieldset data-testid="form-group-signals" className="space-y-5">
                    <legend className="sr-only">{s.groups.signals}</legend>
                    <StepHeader icon={Radio} title={s.groups.signals} num="III" />
                    <div>
                      <label className={labelCls} htmlFor="f-discord">
                        <span>{s.labels.discord}</span>
                        <span className="text-mist/60 tracking-[0.2em]">{w.optional}</span>
                      </label>
                      <input
                        id="f-discord"
                        name="discord"
                        data-testid="input-discord"
                        className={inputCls(false)}
                        value={form.discord}
                        onChange={set("discord")}
                        placeholder={s.ph.discord}
                        maxLength={60}
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                      />
                      <p data-testid="no-discord-note" className="mt-4 flex items-start gap-2.5 border border-gold/15 bg-ink/40 px-4 py-3 font-mono2 text-[9px] tracking-[0.18em] text-mist/85 leading-relaxed">
                        <LifeBuoy className="w-4 h-4 text-gold shrink-0" />
                        <span>{s.noDiscord}</span>
                      </p>
                    </div>
                  </fieldset>
                )}

                {/* ÉTAPE 4 — LETTRE */}
                {step === 3 && (
                  <fieldset data-testid="form-group-letter" className="space-y-6">
                    <legend className="sr-only">{s.groups.letter}</legend>
                    <StepHeader icon={Feather} title={s.groups.letter} num="IV" />
                    <div>
                      <label className={labelCls} htmlFor="f-experience">
                        <span>{s.labels.experience}</span>
                        <span className="text-mist/60 tracking-[0.2em] shrink-0">{w.optional}</span>
                      </label>
                      <textarea
                        id="f-experience"
                        name="experience"
                        data-testid="textarea-experience"
                        className={`${inputCls(false)} min-h-[100px] resize-y`}
                        value={form.experience}
                        onChange={set("experience")}
                        placeholder={s.ph.experience}
                        maxLength={1200}
                      />
                      <p className="mt-1 text-right font-mono2 text-[9px] tracking-[0.2em] text-mist/60">{form.experience.length} / 1200</p>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="f-message"><span>{s.labels.message}</span></label>
                      <textarea
                        ref={reg("message")}
                        id="f-message"
                        name="message"
                        data-testid="textarea-message"
                        className={`${inputCls(errors.message)} min-h-[130px] resize-y`}
                        value={form.message}
                        onChange={set("message")}
                        placeholder={s.ph.message}
                        maxLength={2000}
                        aria-invalid={!!errors.message}
                      />
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p data-testid="message-counter" className={`font-mono2 text-[9px] tracking-[0.2em] ${msgLeft > 0 ? "text-amber-400/90" : "text-emerald-300"}`}>
                          {s.messageLeft(msgLeft)}
                        </p>
                        <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist/60">{form.message.length} / 2000</p>
                      </div>
                      <FieldError id="message">{errors.message}</FieldError>
                    </div>
                  </fieldset>
                )}

                {/* ÉTAPE 5 — LE SERMENT (récapitulatif) */}
                {step === 4 && (
                  <div data-testid="review-panel" className="space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-11 h-11 wax-seal flex items-center justify-center">
                        <ScrollText className="w-5 h-5 text-amber-100" />
                      </span>
                      <div>
                        <p className="font-display text-2xl sm:text-3xl text-gold uppercase tracking-wide leading-tight" data-testid="review-title">{s.review.title}</p>
                        <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mt-1 leading-relaxed">{s.review.hint}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {reviewSections.map((sec) => (
                        <div key={sec.key} data-testid={`review-section-${sec.key}`} className="border border-gold/25 bg-ink/50">
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gold/15 bg-gold/[0.04]">
                            <p className="font-mono2 text-[9px] tracking-[0.3em] text-gold">{sec.title}</p>
                            <button
                              type="button"
                              data-testid={`review-edit-${sec.key}`}
                              onClick={() => goTo(sec.step)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] px-2 font-mono2 text-[9px] tracking-[0.2em] text-mist hover:text-gold transition-colors"
                            >
                              <Pencil className="w-3 h-3" /> {s.reviewEdit}
                            </button>
                          </div>
                          <div className="divide-y divide-gold/10">
                            {sec.rows.map(([label, value]) => (
                              <div key={label} data-testid="review-row" className="px-4 py-3">
                                <p className="font-mono2 text-[9px] tracking-[0.25em] text-gold/75 mb-1">{label.replace(" *", "")}</p>
                                <p className={`font-fell text-base text-bone/90 leading-snug break-words ${label === s.labels.message || label === s.labels.experience ? "whitespace-pre-line" : ""}`}>
                                  {String(value || "").trim() ? value : <span className="text-mist/60">—</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <label
                      htmlFor="oath-checkbox"
                      className={`flex items-start gap-3 cursor-pointer border px-4 py-3.5 transition-colors ${oath ? "border-gold/60 bg-gold/[0.07]" : errors.oath ? "border-bloodglow/60" : "border-gold/20 hover:border-gold/45"}`}
                    >
                      <Checkbox
                        id="oath-checkbox"
                        data-testid="oath-checkbox"
                        checked={oath}
                        onCheckedChange={(v) => { setOath(v === true); setErrors((er) => ({ ...er, oath: null })); }}
                        className="mt-0.5 h-5 w-5 border-gold data-[state=checked]:bg-gold data-[state=checked]:text-ink"
                      />
                      <span className="font-fell text-base text-bone/85 leading-snug">{s.oathCheck}</span>
                    </label>
                    <FieldError id="oath">{errors.oath}</FieldError>

                    {serverError && (
                      <div data-testid="review-error" role="alert" className="border border-bloodglow/50 bg-bloodglow/10 px-4 py-3">
                        <p className="flex items-start gap-2 font-mono2 text-[10px] tracking-[0.12em] leading-relaxed text-bloodglow">
                          <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{serverError.msg}</span>
                        </p>
                        {(serverError.code === "duplicate_active" || serverError.code === "already_accepted") && (
                          <button
                            type="button"
                            data-testid="review-error-suivi"
                            onClick={() => navigate("/suivi", { state: { navTs: Date.now() } })}
                            className="mt-3 inline-flex items-center gap-2 min-h-[40px] font-mono2 text-[10px] tracking-[0.22em] px-4 py-2 border border-gold/50 text-gold hover:bg-gold/10 transition-colors"
                          >
                            <Telescope className="w-4 h-4" /> {s.pseudoCheck.cta}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                      <button
                        type="button"
                        data-testid="review-edit-btn"
                        onClick={() => goTo(3)}
                        disabled={sending}
                        className="sm:w-auto inline-flex items-center justify-center gap-2 min-h-[52px] font-mono2 text-[11px] tracking-[0.25em] px-6 border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-50 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" /> {s.review.edit}
                      </button>
                      <button
                        type="button"
                        data-testid="review-seal-btn"
                        onClick={seal}
                        disabled={sending || councilPreview}
                        title={councilPreview ? s.rolePanel.previewBanner : undefined}
                        aria-busy={sending}
                        className="flex-1 inline-flex items-center justify-center gap-2 min-h-[56px] font-display text-xl sm:text-2xl tracking-wider uppercase bg-gold text-ink hover:shadow-[0_0_40px_rgba(212,175,55,0.45)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait transition-[box-shadow,transform,opacity]"
                      >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stamp className="w-5 h-5" />}
                        {sending ? s.submitting : s.review.seal}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* --- Barre de navigation des étapes 1 à 4 --- */}
            {step < 4 && (
              <>
                {Object.values(errors).some(Boolean) && (
                  <p data-testid="step-error-summary" role="alert" className="mt-6 flex items-start gap-2 font-mono2 text-[9px] tracking-[0.18em] text-bloodglow">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {w.fixFields}
                  </p>
                )}
                <div className="mt-8 flex gap-3">
                  {step > 0 && (
                    <button
                      type="button"
                      data-testid="wizard-prev-btn"
                      onClick={() => goTo(step - 1)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[56px] px-4 sm:px-6 font-mono2 text-[10px] tracking-[0.25em] border border-gold/45 text-gold hover:bg-gold/10 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">{w.prev}</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    data-testid={step === 3 ? "submit-application-btn" : "wizard-next-btn"}
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[56px] font-display text-xl sm:text-2xl tracking-wider uppercase bg-gold text-ink hover:shadow-[0_0_40px_rgba(212,175,55,0.45)] active:scale-[0.99] transition-[box-shadow,transform]"
                  >
                    {step === 3 ? (<><ScrollText className="w-5 h-5" /> {s.submit}</>) : (<>{w.next} <ChevronRight className="w-5 h-5" /></>)}
                  </button>
                </div>
                <p className="mt-3 flex items-center justify-center gap-1.5 font-mono2 text-[8px] tracking-[0.25em] text-mist/55">
                  <Sailboat className="w-3 h-3" /> {s.draft.saved}
                </p>
              </>
            )}

            <p className="mt-5 font-mono2 text-[9px] tracking-[0.25em] text-mist text-center leading-relaxed">{s.oathNote}</p>
            <p className="mt-2 font-mono2 text-[9px] tracking-[0.2em] text-mist text-center leading-relaxed" data-testid="apply-cgu-accept">
              {c.conditions.applyNote.before}{" "}
              <Link to="/conditions" className="text-gold underline underline-offset-2 hover:text-goldlight transition-colors">
                {c.conditions.applyNote.link}
              </Link>
            </p>
          </motion.form>
          )}
        </div>
      </div>

      {/* ===== BOUTEILLE À LA MER — remerciement + numéro de suivi ===== */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-ink/90 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain"
            data-lenis-prevent
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="apply-success-title"
              data-testid="application-success-modal"
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="relative my-auto w-full max-w-lg border-2 border-gold/60 bg-parch frame-plate p-6 sm:p-10 text-center"
            >
              {[["top-2", "left-2"], ["top-2", "right-2"], ["bottom-2", "left-2"], ["bottom-2", "right-2"]].map(([v, h]) => (
                <span key={v + h} className={`absolute ${v} ${h} w-2 h-2 rounded-full bg-gold/60`} aria-hidden="true" />
              ))}
              <button
                ref={closeRef}
                type="button"
                data-testid="success-modal-close"
                onClick={closeResult}
                aria-label={s.modalExtra.close}
                className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-mist hover:text-gold transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 160, damping: 12 }}
                className="w-20 h-20 mx-auto mb-5 wax-seal flex items-center justify-center"
              >
                <Check className="w-9 h-9 text-amber-100" strokeWidth={2.5} />
              </motion.div>
              <h3 id="apply-success-title" className="font-display text-3xl sm:text-4xl text-gold mb-3 break-words">{s.modal.title(result.pseudo)}</h3>
              <p className="font-fell text-base text-bone/80 mb-6">{s.modal.text}</p>
              <div
                data-testid="generated-tracking-code"
                className="font-mono2 text-2xl sm:text-4xl tracking-[0.12em] text-goldlight bg-ink/60 border border-gold/40 px-4 py-4 mb-2 select-all break-all"
              >
                {result.tracking_code}
              </div>
              <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist mb-2">{s.modal.codeCaption}</p>
              <p data-testid="modal-saved-note" className="font-fell italic text-sm text-emerald-300/90 mb-6">{s.modalExtra.saved}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                  type="button"
                  data-testid="copy-tracking-code-btn"
                  onClick={copyCode}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] font-mono2 text-xs tracking-[0.25em] px-6 border border-gold/50 text-gold hover:bg-gold/10 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? s.modal.copied : s.modal.copy}
                </button>
                <Link
                  data-testid="goto-suivi-btn"
                  to="/suivi"
                  onClick={() => setResult(null)}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] font-mono2 text-xs tracking-[0.25em] px-6 bg-gold text-ink hover:bg-goldlight transition-colors"
                >
                  <Telescope className="w-4 h-4" /> {s.modal.follow}
                </Link>
              </div>
              <div data-testid="modal-next-steps" className="text-left border border-gold/20 bg-deck/60 p-5 mb-4">
                <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-3 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 shrink-0" /> {s.modal.nowTitle}
                </p>
                <ol className="space-y-2">
                  {s.modal.next.map((n, i) => (
                    <li key={`next-${i}`} className="flex gap-3 font-fell text-sm text-bone/80 leading-snug">
                      <span className="font-mono2 text-xs text-gold mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div data-testid="modal-wait-time" className="text-left border border-gold/20 bg-deck/60 p-5">
                <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-2 flex items-center gap-2">
                  <Hourglass className="w-4 h-4 shrink-0" /> {s.modal.waitTitle}
                </p>
                <p className="font-fell text-sm text-bone/80 leading-snug">{s.modal.wait}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
