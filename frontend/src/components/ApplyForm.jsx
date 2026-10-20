import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Copy, Check, X, Anchor, ListChecks, Hourglass, Megaphone, Skull, Swords, Radio, Feather, LifeBuoy,
  ScrollText, Telescope, Shield, Loader2, AlertTriangle, Sailboat, Pencil, Stamp, Trash2, Timer, Zap,
  MessageCircle, Send, Ban, Quote,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useLang, fmtPower } from "@/lib/i18n";
import Countdown from "@/components/Countdown";
import { Checkbox } from "@/components/ui/checkbox";
import { saveBottle } from "@/lib/rack";
import useRole from "@/lib/role";
import { smoothScrollTo, lockScroll, unlockScroll, navOffset } from "@/lib/scroll";
import useSeason from "@/lib/season";

/*
 * PARCHEMIN D'ENRÔLEMENT — formulaire de recrutement UNE SEULE PAGE (zéro étape).
 * Stratégie conversion : tout est visible d'un coup, 4 blocs courts, chips tactiles,
 * contact facultatif (Discord / autre canal / aucun), message en 2 lignes avec amorces,
 * un seul bouton « SCELLER ». Brouillon silencieux. Écran de remerciement plein écran.
 */

const EASE = [0.16, 1, 0.3, 1];
const DRAFT_KEY = "gp_apply_draft_v2";
const LEGACY_DRAFT_KEY = "gp_apply_draft";
const POWER_MIN_M = 6;
const POWER_MAX_M = 20;
const MSG_MIN = 10;
const REQUIRED_TOTAL = 6; // pseudo, puissance, troupes, quarts, message, serment

const EMPTY = { pseudo: "", power: "", troops: null, activity: null, contactMode: "discord", contact: "", message: "" };

// Inputs ≥ 16px sur mobile (anti-zoom iOS) — text-base = 16px.
const inputBase =
  "w-full min-h-[52px] bg-ink/70 border px-4 py-3 font-fell text-base lg:text-[17px] text-bone placeholder:text-mist/45 focus:outline-none focus:border-gold focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-[border-color,box-shadow] duration-300";
const inputCls = (err) => `${inputBase} ${err ? "border-bloodglow/70" : "border-gold/25"}`;
const labelCls = "flex items-center justify-between gap-2 font-mono2 text-[11px] sm:text-xs tracking-[0.28em] text-gold mb-2.5";
const chipFocus =
  "inline-flex items-center justify-center min-h-[44px] border transition-[border-color,background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink";
const chipBase = `${chipFocus} px-3.5 font-mono2 text-[11px] tracking-[0.15em]`;
const starterChip = `${chipFocus} px-3 font-fell text-[14px] sm:text-[15px] text-left`;

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
    let d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!d) {
      // Migration douce de l'ancien brouillon (formulaire à étapes)
      const old = JSON.parse(localStorage.getItem(LEGACY_DRAFT_KEY) || "null");
      if (old?.form) {
        d = { form: { ...old.form, contactMode: "discord", contact: old.form.discord || "" } };
        localStorage.removeItem(LEGACY_DRAFT_KEY);
      }
    }
    if (!d || typeof d !== "object" || !d.form) return null;
    const f = { ...EMPTY, ...d.form };
    if (!["discord", "other", "none"].includes(f.contactMode)) f.contactMode = "discord";
    const filled = ["pseudo", "power", "contact", "message"].some((k) => String(f[k] || "").trim());
    return filled || f.troops !== null || f.activity !== null ? { form: f } : null;
  } catch {
    return null;
  }
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

function BlockHeader({ icon: Icon, title, done }) {
  return (
    <div className="flex items-center gap-3 w-full mb-4">
      <span className={`shrink-0 w-9 h-9 brass-porthole flex items-center justify-center transition-colors duration-300 ${done ? "bg-gold/20" : "bg-ink"}`}>
        {done ? <Check className="w-4 h-4 text-gold" strokeWidth={3} /> : <Icon className="w-4 h-4 text-gold" />}
      </span>
      <span className="font-mono2 text-[10px] sm:text-[11px] tracking-[0.28em] text-gold uppercase">{title}</span>
      <span className="flex-1 h-px bg-gold/15" />
    </div>
  );
}

function ChoiceGroup({ id, label, options, value, onChange, error, groupRef }) {
  return (
    <div ref={groupRef} tabIndex={-1} className="outline-none">
      <p id={`${id}-label`} className={labelCls}><span>{label}</span></p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} data-testid={`select-${id}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              className={`group relative min-h-[48px] flex items-center gap-3 text-left px-3.5 py-2.5 border transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                on
                  ? "border-gold bg-gold/10 shadow-[inset_0_0_18px_rgba(212,175,55,0.12)]"
                  : `${error ? "border-bloodglow/50" : "border-gold/20"} bg-ink/50 hover:border-gold/55`
              }`}
            >
              <span className={`shrink-0 w-[18px] h-[18px] rotate-45 border flex items-center justify-center transition-colors ${on ? "border-gold bg-gold" : "border-gold/40"}`}>
                {on && <Check className="w-3 h-3 -rotate-45 text-ink" strokeWidth={3} />}
              </span>
              <span className={`font-fell text-[15px] sm:text-base leading-snug ${on ? "text-bone" : "text-bone/75"}`}>{o}</span>
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
  const navigate = useNavigate();
  const { role, latest } = useRole();
  const locale = lang === "fr" ? "fr-FR" : "en-GB";

  const initialDraft = useMemo(() => readDraft(), []);
  const [form, setForm] = useState(() => initialDraft?.form || EMPTY);
  const [draftRestored, setDraftRestored] = useState(!!initialDraft);
  const [draftState, setDraftState] = useState(initialDraft ? "idle" : null); // null | "saved" | "idle"
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

  // ---------- Brouillon silencieux (survit à un rechargement / un appel entrant) ----------
  // On n'EFFACE JAMAIS un brouillon valide sans action explicite (Effacer / envoi réussi).
  const userClearedRef = useRef(false);
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (result) return;
    if (firstRunRef.current) { firstRunRef.current = false; return; }
    const t = setTimeout(() => {
      try {
        const empty = JSON.stringify(form) === JSON.stringify(EMPTY);
        if (empty) {
          if (userClearedRef.current) {
            localStorage.removeItem(DRAFT_KEY);
            userClearedRef.current = false;
          }
          setDraftState(null);
        } else {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, at: Date.now() }));
          setDraftState("saved");
        }
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [form, result]);

  useEffect(() => {
    if (draftState !== "saved") return;
    const t = setTimeout(() => setDraftState("idle"), 2000);
    return () => clearTimeout(t);
  }, [draftState]);

  const clearDraft = () => {
    userClearedRef.current = true;
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setForm(EMPTY);
    setErrors({});
    setOath(false);
    setDraftRestored(false);
    setDraftState(null);
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

  // ---------- Validation (une seule passe, tout le parchemin) ----------
  const validateAll = useCallback(() => {
    const e = {};
    if (form.pseudo.trim().length < 2) e.pseudo = s.errors.pseudo;
    else if (blockedPseudo) e.pseudo = pcheck.state === "active" ? s.errors.duplicateActive : pcheck.state === "accepted" ? s.errors.alreadyAccepted : s.errors.cooldown(fmtDate(pcheck.retry_at));
    if (!form.power.trim()) e.power = fmtPower(s.errors.power);
    else if (parsePowerM(form.power) === null) e.power = s.powerHint.unreadable;
    if (form.troops === null) e.troops = s.errorsInline.troops;
    if (form.activity === null) e.activity = s.errorsInline.activity;
    if (form.contactMode !== "none" && form.contact.trim().length > 0 && form.contact.trim().length < 2) e.contact = s.errors.contact;
    if (form.message.trim().length < MSG_MIN) e.message = s.errors.message;
    if (!oath) e.oath = s.errorsInline.oath;
    return e;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, oath, blockedPseudo, pcheck, s]);

  const focusFirstError = (er) => {
    const order = ["pseudo", "power", "troops", "activity", "contact", "message", "oath"];
    const first = order.find((k) => er[k]);
    const el = fieldRefs.current[first];
    if (!el) return;
    try { smoothScrollTo(el, { offset: -navOffset(40) }); } catch {}
    setTimeout(() => el.focus?.({ preventScroll: true }), 250);
  };

  const seal = async (e) => {
    e?.preventDefault?.();
    if (sendingRef.current || councilPreview) return;
    const er = validateAll();
    if (Object.keys(er).length) {
      setErrors(er);
      focusFirstError(er);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setServerError(null);
    const handle = form.contact.trim();
    const payload = {
      pseudo: form.pseudo.trim(),
      power: form.power.trim(),
      troops: s.troopsOptions[form.troops] ?? s.troopsOptions[1],
      activity: s.activityOptions[form.activity] ?? s.activityOptions[1],
      experience: "",
      discord: form.contactMode === "discord" ? handle : "",
      contact: form.contactMode === "other" ? handle : "",
      message: form.message.trim(),
    };
    try {
      const { data } = await api.post("/applications", payload);
      saveBottle(data.tracking_code, data.pseudo || payload.pseudo, data.status || "pending");
      userClearedRef.current = true;
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
    setOath(false);
    setErrors({});
    setDraftRestored(false);
    setDraftState(null);
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

  // Voiles hissées (motivation visuelle, sans étapes)
  const doneFlags = {
    pseudo: form.pseudo.trim().length >= 2 && !blockedPseudo,
    power: parsePowerM(form.power) !== null,
    troops: form.troops !== null,
    activity: form.activity !== null,
    message: form.message.trim().length >= MSG_MIN,
    oath,
  };
  const doneCount = Object.values(doneFlags).filter(Boolean).length;
  const allReady = doneCount === REQUIRED_TOTAL;
  const errorCount = Object.values(errors).filter(Boolean).length;

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

  const contactIcons = { discord: MessageCircle, other: Send, none: Ban };
  const addStarter = (txt) => {
    setForm((f) => {
      const cur = f.message.trim();
      if (cur.includes(txt)) return f;
      const next = cur ? `${cur}\n${txt}` : txt;
      return { ...f, message: next.slice(0, 2000) };
    });
    setErrors((er) => (er.message ? { ...er, message: null } : er));
    setTimeout(() => fieldRefs.current.message?.focus?.({ preventScroll: true }), 30);
  };

  const hasContent = JSON.stringify(form) !== JSON.stringify(EMPTY);

  return (
    <section id="postuler" data-testid="application-section" className="relative py-20 md:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* ===== COLONNE GAUCHE — l'appel du Conseil ===== */}
          <div className="lg:col-span-5 min-w-0" data-testid="postuler-pitch">
            <p className="font-mono2 text-[11px] tracking-[0.35em] text-gold mb-5 uppercase">{s.eyebrow}</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-bone leading-[1.02] mb-6 uppercase">
              {s.title1}<span className="text-gold">{s.titleGold}</span>
            </h2>

            <div className="flex flex-wrap gap-2 mb-6" data-testid="apply-trust-chips">
              <span data-testid="apply-time-chip" className="inline-flex items-center gap-2 min-h-[36px] border border-gold/35 bg-gold/[0.08] px-3 font-mono2 text-[10px] tracking-[0.25em] text-goldlight">
                <Timer className="w-3.5 h-3.5" /> {s.timeChip}
              </span>
              <span data-testid="apply-onepage-chip" className="inline-flex items-center gap-2 min-h-[36px] border border-gold/20 bg-ink/40 px-3 font-mono2 text-[10px] tracking-[0.25em] text-bone/80">
                <Zap className="w-3.5 h-3.5 text-gold" /> {s.onePage}
              </span>
            </div>

            <div data-testid="apply-mission-order" className="mb-6 border border-blood/45 bg-blood/[0.08]">
              <p
                data-testid="migration-banner"
                className="flex items-start gap-2.5 px-4 py-3 font-mono2 text-[9px] sm:text-[10px] leading-relaxed tracking-[0.18em] sm:tracking-[0.22em] text-bloodhot"
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
              onClick={() => (gated ? navigate(role === "council" ? "/admin#registry" : "/suivi#dossier", { state: { navTs: Date.now() } }) : smoothScrollTo(formRef.current))}
              className="lg:hidden mb-8 w-full inline-flex items-center justify-center gap-2 min-h-[52px] font-display text-xl tracking-wider uppercase bg-gold text-ink active:scale-[0.99] transition-transform"
            >
              <Sailboat className="w-5 h-5" /> {gated ? (role === "council" ? s.rolePanel.openRegistry : s.rolePanel.openFile) : s.voyageCta}
            </button>

            <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-3">{s.promisesTitle}</p>
            <ul data-testid="apply-promises" className="grid gap-2.5">
              {s.bullets.map((item, i) => {
                const Icon = [Swords, Hourglass, LifeBuoy][i] || Anchor;
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

          {/* ===== COLONNE DROITE — le parchemin d'enrôlement (UNE PAGE) ===== */}
          {gated ? (
            <RolePanel
              role={role}
              latest={latest}
              c={c}
              s={s}
              navigate={navigate}
              stats={councilStats}
              panelRef={formRef}
              onOverride={() => { setOverride(true); setTimeout(() => smoothScrollTo(formRef.current), 60); }}
            />
          ) : (
          <motion.form
            ref={formRef}
            data-testid="application-form"
            data-ready={allReady ? "true" : "false"}
            onSubmit={seal}
            noValidate
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="lg:col-span-7 min-w-0 relative border-2 border-gold/30 bg-parch/85 frame-plate p-5 sm:p-8 lg:p-10 scroll-mt-28"
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

            {/* --- En-tête du parchemin + brouillon --- */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 w-11 h-11 wax-seal flex items-center justify-center">
                  <ScrollText className="w-5 h-5 text-amber-100" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-2xl sm:text-3xl text-gold leading-none" data-testid="apply-card-title">{s.cardTitle}</p>
                  <p className="mt-1.5 font-mono2 text-[8px] sm:text-[9px] tracking-[0.22em] text-mist leading-relaxed">{s.cardHint}</p>
                </div>
              </div>
              {hasContent && !result && (
                <div className="shrink-0 flex items-center gap-2">
                  <span data-testid="draft-indicator" data-state={draftState || "none"} className="hidden sm:inline-flex items-center gap-2 font-mono2 text-[8px] tracking-[0.2em] text-mist">
                    <span className={`w-2 h-2 rounded-full ${draftState === "saved" ? "bg-emerald-400" : "bg-gold/40"}`} aria-hidden="true" />
                    {draftState === "saved" ? s.draft.saved : s.draft.idle}
                  </span>
                  <button
                    type="button"
                    data-testid="draft-clear-btn"
                    onClick={clearDraft}
                    className="inline-flex items-center gap-1.5 min-h-[40px] font-mono2 text-[9px] tracking-[0.2em] text-mist hover:text-bloodglow px-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {s.draft.clear}
                  </button>
                </div>
              )}
            </div>

            {/* --- Voiles hissées : progression douce, sans étapes --- */}
            <div data-testid="apply-readiness" data-done={doneCount} className="mb-7">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className={`font-mono2 text-[9px] sm:text-[10px] tracking-[0.25em] transition-colors ${allReady ? "text-emerald-300" : "text-mist"}`}>
                  {allReady ? s.readyToSeal : s.readiness(doneCount, REQUIRED_TOTAL)}
                </p>
                <span className="font-mono2 text-[9px] tracking-[0.2em] text-gold/80 inline-flex items-center gap-1.5"><Timer className="w-3 h-3" /> {s.timeChip}</span>
              </div>
              <div className="h-[3px] bg-gold/15 overflow-hidden">
                <motion.div
                  aria-hidden="true"
                  className={`h-full origin-left ${allReady ? "bg-emerald-400" : "bg-gold"}`}
                  initial={false}
                  animate={{ scaleX: doneCount / REQUIRED_TOTAL }}
                  style={{ width: "100%" }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
            </div>

            {draftRestored && (
              <div data-testid="draft-restored" className="mb-6 flex items-center gap-2 border border-gold/25 bg-gold/[0.06] px-4 py-2.5">
                <p className="flex items-center gap-2 font-mono2 text-[9px] tracking-[0.18em] text-gold/90 leading-relaxed">
                  <Sailboat className="w-3.5 h-3.5 shrink-0" /> {s.draft.restored}
                </p>
              </div>
            )}

            <div className="space-y-9">
              {/* I — IDENTITÉ */}
              <fieldset data-testid="form-group-identity" className="space-y-5">
                <legend className="sr-only">{s.groups.identity}</legend>
                <BlockHeader icon={Skull} title={s.groups.identity} done={doneFlags.pseudo && doneFlags.power} />
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
                    aria-describedby={pseudoStatus ? "pseudo-check-status" : undefined}
                  />
                  {pseudoStatus && !errors.pseudo && (
                    <p id="pseudo-check-status" data-testid="pseudo-check-status" data-state={pseudoStatus.st} aria-live="polite" className={`mt-2 flex items-start gap-2 font-mono2 text-[9px] tracking-[0.18em] leading-relaxed ${pseudoStatus.cls}`}>
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
                  <div className="flex flex-wrap gap-2 mb-2.5" role="group" aria-label={s.labels.power}>
                    {s.powerQuick.map((p, i) => {
                      const on = form.power.trim().toUpperCase() === p;
                      return (
                        <button
                          key={`pq-${i}`}
                          type="button"
                          data-testid={`power-quick-${i}`}
                          onClick={() => set("power")(p)}
                          aria-pressed={on}
                          className={`${chipBase} min-w-[60px] ${on ? "gold-ingot border-gold text-ink" : "border-gold/30 bg-ink/50 text-gold hover:border-gold hover:bg-gold/10"}`}
                        >
                          {p}
                        </button>
                      );
                    })}
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
                    inputMode="text"
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

              {/* II — FORCE */}
              <fieldset data-testid="form-group-force" className="space-y-6">
                <legend className="sr-only">{s.groups.force}</legend>
                <BlockHeader icon={Swords} title={s.groups.force} done={doneFlags.troops && doneFlags.activity} />
                <ChoiceGroup groupRef={reg("troops")} id="troops" label={s.labels.troops} options={s.troopsOptions} value={form.troops} onChange={set("troops")} error={errors.troops} />
                <ChoiceGroup groupRef={reg("activity")} id="activity" label={s.labels.activity} options={s.activityOptions} value={form.activity} onChange={set("activity")} error={errors.activity} />
              </fieldset>

              {/* III — SIGNAUX (contact facultatif) */}
              <fieldset data-testid="form-group-signals" className="space-y-4">
                <legend className="sr-only">{s.groups.signals}</legend>
                <BlockHeader icon={Radio} title={s.groups.signals} done={form.contactMode === "none" || form.contact.trim().length >= 2} />
                <div>
                  <p id="contact-label" className={labelCls}>
                    <span>{s.labels.contact}</span>
                    <span className="text-mist/60 tracking-[0.2em] shrink-0">{s.optional}</span>
                  </p>
                  <div role="radiogroup" aria-labelledby="contact-label" data-testid="contact-segment" className="grid grid-cols-3 gap-1 border border-gold/25 bg-ink/40 p-1">
                    {s.contactOptions.map((o) => {
                      const on = form.contactMode === o.key;
                      const Icon = contactIcons[o.key] || Radio;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          data-testid={`contact-option-${o.key}`}
                          onClick={() => {
                            setForm((f) => ({ ...f, contactMode: o.key, contact: o.key === "none" ? "" : f.contact }));
                            setErrors((er) => (er.contact ? { ...er, contact: null } : er));
                          }}
                          className={`relative min-h-[44px] inline-flex items-center justify-center gap-1.5 px-1 sm:px-2 font-mono2 text-[9px] sm:text-[10px] tracking-[0.12em] sm:tracking-[0.18em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
                            on ? "bg-gold/15 text-bone border border-gold/70" : "text-bone/70 border border-transparent hover:text-bone hover:bg-ink/60"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${on ? "text-gold" : "text-mist"}`} />
                          <span className="truncate">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`contact-${form.contactMode}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="mt-3"
                    >
                      {form.contactMode !== "none" ? (
                        <>
                          <label className="sr-only" htmlFor="f-contact">{form.contactMode === "discord" ? s.labels.discord : s.labels.other}</label>
                          <input
                            ref={reg("contact")}
                            id="f-contact"
                            name="contact"
                            data-testid="input-contact"
                            className={inputCls(errors.contact)}
                            value={form.contact}
                            onChange={set("contact")}
                            placeholder={form.contactMode === "discord" ? s.ph.discord : s.ph.other}
                            maxLength={form.contactMode === "discord" ? 60 : 120}
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="next"
                            aria-invalid={!!errors.contact}
                          />
                          <FieldError id="contact">{errors.contact}</FieldError>
                        </>
                      ) : null}
                      <p data-testid="contact-hint" data-mode={form.contactMode} className="mt-3 flex items-start gap-2.5 border border-gold/15 bg-ink/40 px-4 py-3 font-mono2 text-[9px] tracking-[0.18em] text-mist/85 leading-relaxed">
                        <LifeBuoy className="w-4 h-4 text-gold shrink-0" />
                        <span>{s.contactHint[form.contactMode]}</span>
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </fieldset>

              {/* IV — LETTRE (courte) */}
              <fieldset data-testid="form-group-letter" className="space-y-4">
                <legend className="sr-only">{s.groups.letter}</legend>
                <BlockHeader icon={Feather} title={s.groups.letter} done={doneFlags.message} />
                <div>
                  <label className={labelCls} htmlFor="f-message"><span>{s.labels.message}</span></label>
                  <div className="mb-2.5">
                    <p className="font-mono2 text-[8px] tracking-[0.22em] text-mist/70 mb-1.5 inline-flex items-center gap-1.5"><Quote className="w-3 h-3" /> {s.startersTitle}</p>
                    <div className="flex flex-wrap gap-2">
                      {s.starters.map((txt, i) => {
                        const used = form.message.includes(txt);
                        return (
                          <button
                            key={`starter-${i}`}
                            type="button"
                            data-testid={`starter-chip-${i}`}
                            onClick={() => addStarter(txt)}
                            disabled={used}
                            aria-pressed={used}
                            className={`${starterChip} ${used ? "border-gold/50 bg-gold/10 text-gold/70 cursor-default" : "border-gold/25 bg-ink/50 text-bone/80 hover:border-gold hover:bg-gold/10"}`}
                          >
                            {used ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <span className="mr-1.5 text-gold">+</span>}
                            {txt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <textarea
                    ref={reg("message")}
                    id="f-message"
                    name="message"
                    data-testid="textarea-message"
                    className={`${inputCls(errors.message)} min-h-[110px] resize-y`}
                    value={form.message}
                    onChange={set("message")}
                    placeholder={s.ph.message}
                    maxLength={2000}
                    rows={3}
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

              {/* SERMENT + SCEAU */}
              <div className="space-y-4 pt-1">
                <label
                  ref={reg("oath")}
                  tabIndex={-1}
                  htmlFor="oath-checkbox"
                  className={`flex items-start gap-3 cursor-pointer border px-4 py-3.5 outline-none transition-colors ${oath ? "border-gold/60 bg-gold/[0.07]" : errors.oath ? "border-bloodglow/60" : "border-gold/20 hover:border-gold/45"}`}
                >
                  <Checkbox
                    id="oath-checkbox"
                    data-testid="oath-checkbox"
                    checked={oath}
                    onCheckedChange={(v) => { setOath(v === true); setErrors((er) => ({ ...er, oath: null })); }}
                    className="mt-0.5 h-5 w-5 border-gold data-[state=checked]:bg-gold data-[state=checked]:text-ink"
                  />
                  <span className="font-fell text-[15px] sm:text-base text-bone/85 leading-snug">{s.oathCheck}</span>
                </label>
                <FieldError id="oath">{errors.oath}</FieldError>

                {errorCount > 0 && (
                  <p data-testid="apply-error-summary" role="alert" aria-live="polite" className="flex items-start gap-2 border border-bloodglow/40 bg-bloodglow/[0.08] px-4 py-3 font-mono2 text-[9px] tracking-[0.18em] text-bloodglow leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <span>{s.errors.fixFields(errorCount)}</span>
                  </p>
                )}

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

                <motion.button
                  type="submit"
                  data-testid="submit-application-btn"
                  disabled={sending || councilPreview}
                  title={councilPreview ? s.rolePanel.previewBanner : undefined}
                  aria-busy={sending}
                  whileTap={{ scale: 0.985 }}
                  className={`w-full inline-flex items-center justify-center gap-2.5 min-h-[58px] font-display text-xl sm:text-2xl tracking-wider uppercase text-ink disabled:opacity-60 disabled:cursor-wait transition-[box-shadow,opacity] ${
                    allReady ? "bg-gold shadow-[0_0_34px_rgba(212,175,55,0.45)] hover:shadow-[0_0_48px_rgba(212,175,55,0.6)]" : "bg-gold/85 hover:bg-gold hover:shadow-[0_0_30px_rgba(212,175,55,0.35)]"
                  }`}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stamp className="w-5 h-5" />}
                  {sending ? s.submitting : s.seal}
                </motion.button>

                <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist text-center leading-relaxed">{s.oathNote}</p>
                <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist text-center leading-relaxed" data-testid="apply-cgu-accept">
                  {c.conditions.applyNote.before}{" "}
                  <Link to="/conditions" className="text-gold underline underline-offset-2 hover:text-goldlight transition-colors">
                    {c.conditions.applyNote.link}
                  </Link>
                </p>
              </div>
            </div>
          </motion.form>
          )}
        </div>
      </div>

      {/* ===== BOUTEILLE À LA MER — remerciement plein écran + numéro de suivi ===== */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] h-screen-dvh bg-ink/92 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain pt-safe pb-safe"
            data-lenis-prevent
            data-testid="recruit-success-overlay"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="apply-success-title"
              data-testid="application-success-modal"
              initial={{ scale: 0.96, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: 12, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
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
                className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-mist hover:text-gold transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 160, damping: 12 }}
                className="w-20 h-20 mx-auto mb-4 wax-seal flex items-center justify-center"
              >
                <Check className="w-9 h-9 text-amber-100" strokeWidth={2.5} />
              </motion.div>
              <p className="font-mono2 text-[9px] sm:text-[10px] tracking-[0.3em] text-emerald-300 mb-2" data-testid="success-eyebrow">{s.modal.eyebrow}</p>
              <h3 id="apply-success-title" className="font-display text-3xl sm:text-4xl text-gold mb-3 break-words">{s.modal.title(result.pseudo)}</h3>
              <p className="font-fell text-base text-bone/80 mb-6">{s.modal.text}</p>
              <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist mb-2">{s.modal.codeCaption}</p>
              <div
                data-testid="generated-tracking-code"
                className="font-mono2 text-3xl sm:text-[2.6rem] leading-none tracking-[0.14em] text-goldlight bg-ink/70 border-2 border-gold/50 px-4 py-5 mb-3 select-all break-all shadow-[inset_0_0_30px_rgba(212,175,55,0.08)]"
              >
                {result.tracking_code}
              </div>
              <p data-testid="modal-saved-note" className="font-fell italic text-sm text-emerald-300/90 mb-6">{s.modalExtra.saved}</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  data-testid="copy-tracking-code-btn"
                  onClick={copyCode}
                  className={`inline-flex items-center justify-center gap-2 min-h-[52px] font-mono2 text-xs tracking-[0.25em] px-6 border transition-colors ${copied ? "border-emerald-400/60 text-emerald-300 bg-emerald-400/10" : "border-gold/50 text-gold hover:bg-gold/10"}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? s.modal.copied : s.modal.copy}
                </button>
                <Link
                  data-testid="goto-suivi-btn"
                  to="/suivi"
                  onClick={() => setResult(null)}
                  className="inline-flex items-center justify-center gap-2 min-h-[52px] font-mono2 text-xs tracking-[0.25em] px-6 bg-gold text-ink hover:bg-goldlight transition-colors"
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
              <button
                type="button"
                data-testid="success-another-btn"
                onClick={closeResult}
                className="mt-5 inline-flex items-center justify-center gap-2 min-h-[44px] font-mono2 text-[9px] tracking-[0.25em] text-mist hover:text-gold transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> {s.modal.another}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
