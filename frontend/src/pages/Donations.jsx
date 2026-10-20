// GOLDEN PIRATES — « Le Coffre du Navire » (page de dons refaite de zéro)
// Stratégie : 1 seul parcours guidé en 3 étapes (pièce → nom → PayPal).
// Le bordereau est créé et sauvegardé AVANT PayPal (serveur + appareil) : aucun don ne se perd.
// PayPal s'ouvre via un VRAI lien (geste utilisateur) → jamais bloqué par iOS Safari.
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Coins, Anchor, Ship, TrendingUp, Beer, Lock, ShieldCheck, Feather, Copy, Check,
  Loader2, AlertTriangle, Hourglass, CheckCircle2, XCircle, FileText, FileSpreadsheet,
  ExternalLink, RefreshCw, Search, ChevronDown, ChevronLeft, Trash2, Users, Skull, Plus,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { DONATIONS_COPY } from "@/lib/donationsCopy";
import Seo from "@/lib/Seo";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { smoothScrollTo } from "@/lib/scroll";
import DonorProfileSheet from "@/components/DonorProfileSheet";

const EASE = [0.22, 1, 0.36, 1];
const WHY_ICONS = { ship: Ship, growth: TrendingUp, fest: Beer, free: Lock };
const GIFTS_KEY = "gp_gifts";
const DRAFT_KEY = "gp_gift_draft";
const RID_RX = /^GPD-1023-[A-Z0-9]{4}$/;

// ---------- Stockage local (carnet de bord + brouillon) ----------
const readJSON = (k, fb) => {
  try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? fb; } catch { return fb; }
};
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const readGifts = () => {
  const v = readJSON(GIFTS_KEY, []);
  return Array.isArray(v) ? v.filter((g) => g && typeof g.receipt_id === "string") : [];
};
const saveGifts = (list) => writeJSON(GIFTS_KEY, list.slice(0, 20));

const parseAmount = (s) => {
  const n = parseFloat(String(s ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const fmtAmt = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch { return false; }
  }
}

// ---------- Petits composants ----------
function Divider({ icon: Icon = Anchor }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
      <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-gold/50" />
      <span className="w-9 h-9 rounded-full border border-gold/50 bg-ink grid place-items-center">
        <Icon className="w-4 h-4 text-gold" />
      </span>
      <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-gold/50" />
    </div>
  );
}

function SectionHead({ icon, eyebrow, title, sub, testId }) {
  return (
    <div className="text-center mb-8 sm:mb-10">
      <Divider icon={icon} />
      {eyebrow && <p className="font-mono2 text-[10px] tracking-[0.32em] text-gold/80 mb-2">{eyebrow}</p>}
      <h2 data-testid={testId} className="font-display text-3xl sm:text-4xl lg:text-5xl text-bone leading-tight">{title}</h2>
      {sub && <p className="font-fell italic text-base sm:text-lg text-mist mt-3 max-w-2xl mx-auto">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status, labels }) {
  const map = {
    pending: ["border-gold/60 text-gold bg-gold/10", Hourglass],
    confirmed: ["border-emerald-400/60 text-emerald-300 bg-emerald-500/10", CheckCircle2],
    rejected: ["border-bloodglow/60 text-bloodglow bg-blood/15", XCircle],
    unknown: ["border-mist/40 text-mist bg-ink/60", XCircle],
  };
  const [cls, Icon] = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono2 text-[9px] tracking-[0.2em] whitespace-nowrap ${cls}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />{labels[status] || labels.pending}
    </span>
  );
}

// ---------- Page ----------
export default function Donations() {
  const { lang } = useLang();
  const t = DONATIONS_COPY[lang] || DONATIONS_COPY.fr;

  // Hall + jauge
  const [hall, setHall] = useState({ items: [], total: 0, goal: 0, count: 0, configured: true, loaded: false });

  // Profil public du donateur (feuille modale ouverte au clic sur un item du Hall)
  const [profilePseudo, setProfilePseudo] = useState(null);

  // Assistant de don (brouillon persistant : rien ne se perd si on quitte la page)
  const draft0 = useMemo(() => readJSON(DRAFT_KEY, {}), []);
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState(draft0.tier ?? 7);
  const [custom, setCustom] = useState(draft0.custom || "");
  const [pseudo, setPseudo] = useState(draft0.pseudo || "");
  const [anon, setAnon] = useState(!!draft0.anon);
  const [message, setMessage] = useState(draft0.message || "");
  const [email, setEmail] = useState(draft0.email || "");
  const [err, setErr] = useState(null);
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(null); // { receipt_id, amount, paypal_url, pseudo }
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  // Carnet de bord
  const [gifts, setGifts] = useState(readGifts);
  const [giftInfo, setGiftInfo] = useState({}); // rid → {status, paypal_url, amount, pseudo}
  const [refreshing, setRefreshing] = useState(false);
  const [lookup, setLookup] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupErr, setLookupErr] = useState(null);
  const [dlBusy, setDlBusy] = useState(null);

  const [openFaq, setOpenFaq] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const coffreRef = useRef(null);

  const amount = tier === "custom" ? parseAmount(custom) : Number(tier) || 0;
  const amountOk = amount >= 1 && amount <= 10000;

  // brouillon
  useEffect(() => {
    writeJSON(DRAFT_KEY, { tier, custom, pseudo, anon, message, email });
  }, [tier, custom, pseudo, anon, message, email]);

  // Hall : chargement + rafraîchissement
  const loadHall = useCallback(() => (
    api.get("/donators")
      .then(({ data }) => setHall({
        items: data.items || [], total: Number(data.total) || 0, goal: Number(data.goal) || 0,
        count: Number(data.count ?? (data.items || []).length) || 0,
        configured: data.configured !== false, loaded: true,
      }))
      .catch(() => setHall((h) => ({ ...h, loaded: true })))
  ), []);

  // Carnet : statut serveur de chaque bordereau
  const refreshGifts = useCallback(async (list) => {
    const src = list || readGifts();
    if (!src.length) return;
    setRefreshing(true);
    const entries = await Promise.all(src.map((g) =>
      api.get(`/donations/status/${encodeURIComponent(g.receipt_id)}`)
        .then(({ data }) => [g.receipt_id, { status: data.status, paypal_url: data.paypal_url, amount: data.amount, pseudo: data.pseudo, created_at: data.created_at }])
        .catch((e) => [g.receipt_id, e?.response?.status === 404 ? { status: "unknown" } : null])
    ));
    setGiftInfo((p) => {
      const n = { ...p };
      entries.forEach(([rid, v]) => { if (v) n[rid] = { ...(p[rid] || {}), ...v }; });
      return n;
    });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadHall();
    refreshGifts();
    const onVis = () => { if (!document.hidden) { loadHall(); refreshGifts(); } };
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(onVis, 45000);
    return () => { document.removeEventListener("visibilitychange", onVis); clearInterval(iv); };
  }, [loadHall, refreshGifts]);

  // Barre collante mobile : visible quand le coffre n'est pas à l'écran
  useEffect(() => {
    const el = coffreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && window.scrollY > 400), { threshold: 0.05 });
    io.observe(el);
    const onScroll = () => { if (window.scrollY < 400) setShowSticky(false); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  // Dérivés jauge
  const goalPct = hall.goal > 0 ? Math.min(100, Math.round((hall.total / hall.goal) * 100)) : 0;
  const reached = hall.goal > 0 && hall.total >= hall.goal;
  const remaining = Math.max(0, Math.round((hall.goal - hall.total) * 100) / 100);

  const goCoffre = () => {
    smoothScrollTo("coffre");
  };

  // ----- Actions -----
  const toStep2 = () => {
    if (!amountOk) { setErr(t.s1.min); return; }
    setErr(null); setStep(2); goCoffre();
  };

  const seal = async () => {
    if (sealing) return;
    const p = pseudo.trim();
    const em = email.trim();
    if (p.length < 2) { setErr(t.s2.errPseudo); return; }
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { setErr(t.s2.errEmail); return; }
    if (!amountOk) { setErr(t.s1.min); setStep(1); return; }
    setErr(null); setSealing(true);
    try {
      const { data } = await api.post("/donations/declare", {
        pseudo: p, amount, email: em || null, message: message.trim() || null, anonymous: anon,
      });
      const g = { receipt_id: data.receipt_id, pseudo: data.pseudo, amount: data.amount, at: Date.now() };
      const next = [g, ...readGifts().filter((x) => x.receipt_id !== g.receipt_id)];
      saveGifts(next); setGifts(next);
      setGiftInfo((s) => ({ ...s, [g.receipt_id]: { status: "pending", paypal_url: data.paypal_url, amount: data.amount, pseudo: data.pseudo, created_at: data.created_at } }));
      setSealed({ receipt_id: data.receipt_id, amount: data.amount, paypal_url: data.paypal_url, pseudo: data.pseudo });
      setOpened(false); setStep(3); goCoffre();
    } catch (e) {
      const det = e?.response?.data?.detail;
      const msg = (det && (det.msg || (typeof det === "string" ? det : null))) || t.s2.errGeneric;
      setErr(msg);
    } finally { setSealing(false); }
  };

  const resetWizard = () => {
    setSealed(null); setOpened(false); setCopied(false); setErr(null); setStep(1); setMessage("");
    goCoffre();
  };

  const doCopy = async (rid) => {
    const ok = await copyText(rid);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };

  const download = async (rid, fmt) => {
    if (dlBusy) return;
    setDlBusy(`${rid}-${fmt}`);
    try {
      const { data, headers } = await api.get(`/donations/invoice/${fmt}`, {
        params: { receipt_id: rid, lang }, responseType: "blob", timeout: 120000,
      });
      const m = /filename="?([^";]+)"?/.exec(headers?.["content-disposition"] || "");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = m ? m[1] : `GOLDEN-PIRATES-${rid}.${fmt}`; a.rel = "noopener";
      document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 800);
    } catch (e) {
      let msg = t.track.downloadErr;
      try {
        if (e?.response?.data instanceof Blob) {
          const p = JSON.parse(await e.response.data.text());
          if (p?.detail?.msg) msg = p.detail.msg;
        }
      } catch { /* ignore */ }
      toast.error(msg);
    } finally { setDlBusy(null); }
  };

  const forget = (rid) => {
    const next = readGifts().filter((x) => x.receipt_id !== rid);
    saveGifts(next); setGifts(next);
  };

  const doLookup = async (e) => {
    e?.preventDefault?.();
    const rid = lookup.trim().toUpperCase();
    setLookupErr(null);
    if (!RID_RX.test(rid)) { setLookupErr(t.track.lookupNotFound); return; }
    setLookupBusy(true);
    try {
      const { data } = await api.get(`/donations/status/${encodeURIComponent(rid)}`);
      const g = { receipt_id: rid, pseudo: data.pseudo, amount: data.amount, at: Date.now() };
      const next = [g, ...readGifts().filter((x) => x.receipt_id !== rid)];
      saveGifts(next); setGifts(next);
      setGiftInfo((s) => ({ ...s, [rid]: { status: data.status, paypal_url: data.paypal_url, amount: data.amount, pseudo: data.pseudo, created_at: data.created_at } }));
      setLookup("");
      toast.success(t.track.lookupAdded);
    } catch {
      setLookupErr(t.track.lookupNotFound);
    } finally { setLookupBusy(false); }
  };

  const dateFmt = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" }); } catch { return ""; }
  };

  // ----- Rendu -----
  const inputCls = "w-full min-h-[50px] bg-ink/80 border border-gold/30 px-4 py-3 font-fell text-base text-bone placeholder:text-bone/35 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40 transition-colors";
  const labelCls = "block font-mono2 text-[10px] tracking-[0.22em] text-gold mb-2";

  return (
    <div className="min-h-screen bg-ink text-bone overflow-x-hidden">
      <Seo route="/donations" />
      <Nav />

      <main data-testid="donations-main" className="pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* ================= 1. HÉROS + JAUGE ================= */}
        <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
                data-testid="donations-eyebrow"
                className="inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.3em] text-gold border border-gold/40 bg-deck px-3.5 py-2 mb-6"
              >
                <Coins className="w-3.5 h-3.5 shrink-0" /> {t.eyebrow}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: EASE }}
                data-testid="donations-title"
                className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] mb-5"
              >
                <span className="block text-gold drop-shadow-[0_0_24px_rgba(212,175,55,0.35)]">{t.title1}</span>
                <span className="block text-bone">{t.title2}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6, ease: EASE }}
                data-testid="donations-lead"
                className="font-fell text-lg sm:text-xl text-bone/85 leading-relaxed mb-7 max-w-xl"
              >
                {t.lead}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
                className="flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <button
                  type="button" onClick={goCoffre} data-testid="donations-cta"
                  className="plank-cut gold-ingot inline-flex items-center justify-center gap-3 font-display text-xl sm:text-2xl tracking-wider uppercase whitespace-nowrap shrink-0 px-8 py-4 min-h-[58px] text-ink active:translate-y-px transition-transform"
                >
                  <Coins className="w-5 h-5 shrink-0" /> {t.cta}
                </button>
                <p className="inline-flex items-start gap-2 font-mono2 text-[9px] sm:text-[10px] tracking-[0.2em] text-emerald-300 max-w-xs leading-relaxed" data-testid="donations-free-chip">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" /> {t.freeChip}
                </p>
              </motion.div>
            </div>

            {/* Jauge du coffre */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
              data-testid="donations-gauge"
              className="relative border-2 border-gold/45 bg-deck frame-plate overflow-hidden"
            >
              <div className="relative h-40 sm:h-48 overflow-hidden">
                <img src="/img/butin-tresor.jpg" alt="" className="w-full h-full object-cover" loading="eager" decoding="async" width="768" height="1376" />
                <div className="absolute inset-0 bg-gradient-to-t from-deck via-deck/40 to-transparent" />
                <span className="absolute top-3 left-3 font-mono2 text-[9px] tracking-[0.3em] text-gold bg-ink/90 border border-gold/40 px-2.5 py-1">{t.gauge.title}</span>
              </div>
              <div className="relative px-5 sm:px-7 pb-6 -mt-10">
                <div className="flex items-end justify-between gap-4 mb-4">
                  <div>
                    <p className="font-mono2 text-[9px] tracking-[0.28em] text-mist mb-1">{t.gauge.collected}</p>
                    <p className="font-display text-4xl sm:text-5xl text-gold leading-none" data-testid="donations-gauge-total">
                      {fmtAmt(hall.total)} €
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono2 text-[9px] tracking-[0.28em] text-mist mb-1">{t.gauge.goal}</p>
                    <p className="font-display text-2xl sm:text-3xl text-bone leading-none" data-testid="donations-gauge-goal">{fmtAmt(hall.goal)} €</p>
                  </div>
                </div>
                <div className="relative h-5 border border-gold/50 bg-ink overflow-hidden" data-testid="donations-progress-bar" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100}>
                  <motion.div
                    data-testid="donations-progress-fill"
                    initial={{ width: 0 }} animate={{ width: `${goalPct}%` }} transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
                    className={`h-full ${reached ? "bg-emerald-400" : "bg-gradient-to-r from-[#8a6d1c] via-gold to-goldlight"}`}
                  />
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_18px,rgba(6,9,14,0.35)_18px,rgba(6,9,14,0.35)_20px)]" aria-hidden="true" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-3">
                  <p className="font-mono2 text-[10px] tracking-[0.2em] text-gold" data-testid="donations-progress-caption">
                    {goalPct} % {t.gauge.ofGoal}
                  </p>
                  <p className="font-mono2 text-[10px] tracking-[0.18em] text-bone/75 inline-flex items-center gap-1.5" data-testid="donations-sailors">
                    <Users className="w-3.5 h-3.5 text-gold/70" /> {t.gauge.sailors(hall.count)}
                  </p>
                </div>
                <p className={`mt-3 font-fell text-sm ${reached ? "text-emerald-300" : "text-mist"}`}>
                  {reached ? t.gauge.reached : t.gauge.remaining(fmtAmt(remaining))}
                </p>
                <p className="mt-1 font-fell italic text-xs text-mist/80">{t.gauge.confirmedNote}</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================= 2. LE COFFRE — parcours en 3 étapes ================= */}
        <section id="coffre" ref={coffreRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24 scroll-mt-24 sm:scroll-mt-32">
          <div className="relative border-2 border-gold/50 bg-deck frame-plate shadow-[0_0_60px_rgba(212,175,55,0.08)]" data-testid="donate-wizard" data-step={step}>
            {/* Stepper */}
            <ol className="grid grid-cols-3 border-b border-gold/25" data-testid="donate-stepper">
              {t.steps.map((label, i) => {
                const n = i + 1;
                const cur = step === n;
                const done = step > n;
                return (
                  <li key={label} className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 py-3.5 px-2 text-center ${cur ? "bg-gold/10" : ""} ${i < 2 ? "border-r border-gold/20" : ""}`}>
                    <span className={`w-7 h-7 grid place-items-center font-display text-sm shrink-0 ${cur ? "gold-ingot text-ink" : done ? "bg-gold/25 border border-gold text-gold" : "border border-gold/30 text-mist"}`}>
                      {done ? <Check className="w-3.5 h-3.5" /> : ["I", "II", "III"][i]}
                    </span>
                    <span className={`font-mono2 text-[8.5px] sm:text-[10px] tracking-[0.18em] ${cur ? "text-gold" : done ? "text-gold/70" : "text-mist"}`}>{label}</span>
                  </li>
                );
              })}
            </ol>

            <div className="p-5 sm:p-8">
              {!hall.configured ? (
                <div data-testid="donate-coming" className="text-center py-6">
                  <Lock className="w-10 h-10 text-gold mx-auto mb-3" />
                  <p className="font-display text-2xl text-gold uppercase mb-2">{t.coming.title}</p>
                  <p className="font-fell text-base text-bone/80">{t.coming.text}</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {/* ---------- ÉTAPE I ---------- */}
                  {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28, ease: EASE }} data-testid="donate-step-1">
                      <p className="font-mono2 text-[9px] tracking-[0.28em] text-mist mb-1">{t.stepOf(1, 3)}</p>
                      <h3 className="font-display text-3xl sm:text-4xl text-gold mb-1.5">{t.s1.title}</h3>
                      <p className="font-fell italic text-base text-mist mb-6">{t.s1.sub}</p>

                      <div role="radiogroup" aria-label={t.s1.title} className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-4">
                        {t.s1.tiers.map((ti) => {
                          const on = tier === ti.amount;
                          return (
                            <button
                              key={ti.amount} type="button" role="radio" aria-checked={on}
                              data-testid={`donate-tier-${ti.amount}`}
                              onClick={() => { setTier(ti.amount); setErr(null); }}
                              className={`relative flex flex-col items-center justify-center text-center px-1.5 sm:px-3 pt-6 pb-4 min-h-[132px] sm:min-h-[150px] border-2 transition-all duration-200 ${
                                on ? "border-gold bg-gold/15 shadow-[0_0_28px_rgba(212,175,55,0.3)]" : "border-gold/25 bg-ink/70 hover:border-gold/60"
                              }`}
                            >
                              {ti.popular && (
                                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono2 text-[7.5px] sm:text-[8.5px] tracking-[0.16em] bg-blood text-bone px-2 py-0.5">{t.s1.popular}</span>
                              )}
                              <span className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full grid place-items-center mb-2 ${on ? "gold-ingot text-ink" : "border border-gold/40 text-gold"}`}>
                                <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                              </span>
                              <span className={`font-display text-3xl sm:text-4xl leading-none ${on ? "text-gold" : "text-bone"}`}>{ti.amount} €</span>
                              <span className="mt-1.5 font-mono2 text-[7.5px] sm:text-[9px] tracking-[0.12em] sm:tracking-[0.16em] text-gold/80 leading-tight">{ti.name}</span>
                              <span className="hidden sm:block mt-1 font-fell italic text-xs text-mist">{ti.hint}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className={`border-2 p-3.5 sm:p-4 mb-5 transition-colors ${tier === "custom" ? "border-gold bg-gold/10" : "border-gold/25 bg-ink/70"}`}>
                        <label htmlFor="donate-custom" className={labelCls}>{t.s1.custom}</label>
                        <div className="relative">
                          <input
                            id="donate-custom" data-testid="donate-custom-input"
                            value={custom} inputMode="decimal" maxLength={8} autoComplete="off" placeholder={t.s1.customPh}
                            onFocus={() => setTier("custom")}
                            onChange={(e) => { setCustom(e.target.value.replace(/[^\d.,]/g, "")); setTier("custom"); setErr(null); }}
                            className={`${inputCls} pr-12 text-xl`}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-display text-xl text-gold" aria-hidden="true">€</span>
                        </div>
                      </div>

                      {err && <ErrorLine msg={err} />}

                      <button
                        type="button" data-testid="donate-next-1" onClick={toStep2} disabled={!amountOk}
                        className="plank-cut gold-ingot w-full inline-flex items-center justify-center gap-3 font-display text-xl sm:text-2xl tracking-wider uppercase px-6 py-4 min-h-[60px] text-ink disabled:opacity-45 disabled:cursor-not-allowed active:translate-y-px transition-transform"
                      >
                        {amountOk ? `${t.s1.next} — ${fmtAmt(amount)} €` : t.s1.next}
                      </button>
                      <p className="mt-3 text-center font-mono2 text-[9px] tracking-[0.2em] text-mist">{t.s1.min}</p>
                    </motion.div>
                  )}

                  {/* ---------- ÉTAPE II ---------- */}
                  {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28, ease: EASE }} data-testid="donate-step-2">
                      <p className="font-mono2 text-[9px] tracking-[0.28em] text-mist mb-1">{t.stepOf(2, 3)}</p>
                      <h3 className="font-display text-3xl sm:text-4xl text-gold mb-1.5">{t.s2.title}</h3>
                      <p className="font-fell italic text-base text-mist mb-6">{t.s2.sub}</p>

                      <div className="flex items-center justify-between gap-3 border border-gold/40 bg-ink/70 px-4 py-3 mb-5" data-testid="donate-recap">
                        <span className="font-mono2 text-[10px] tracking-[0.24em] text-mist">{t.s2.amount}</span>
                        <span className="font-display text-2xl text-gold">{fmtAmt(amount)} €</span>
                        <button type="button" data-testid="donate-edit-amount" onClick={() => { setStep(1); setErr(null); }} className="font-mono2 text-[9px] tracking-[0.2em] text-gold/80 hover:text-gold underline underline-offset-4 px-1 py-2">
                          {t.s2.edit}
                        </button>
                      </div>

                      <div className="grid gap-4">
                        <div>
                          <label htmlFor="donate-pseudo" className={labelCls}>{t.s2.pseudo}</label>
                          <input id="donate-pseudo" data-testid="donate-pseudo" value={pseudo} maxLength={40} autoComplete="nickname" placeholder={t.s2.pseudoPh}
                            onChange={(e) => { setPseudo(e.target.value); setErr(null); }} className={inputCls} />
                        </div>

                        <label className="flex items-start gap-3 border border-gold/25 bg-ink/60 px-4 py-3.5 cursor-pointer select-none" data-testid="donate-anon-label">
                          <input type="checkbox" data-testid="donate-anon" checked={anon} onChange={(e) => setAnon(e.target.checked)}
                            className="mt-0.5 w-5 h-5 shrink-0 accent-[#D4AF37]" />
                          <span>
                            <span className="block font-fell text-base text-bone">{t.s2.anon}</span>
                            <span className="block font-fell italic text-sm text-mist mt-0.5">{t.s2.anonHint}</span>
                          </span>
                        </label>

                        <div>
                          <label htmlFor="donate-message" className={labelCls}>{t.s2.message}</label>
                          <textarea id="donate-message" data-testid="donate-message" value={message} maxLength={400} rows={2} placeholder={t.s2.messagePh}
                            onChange={(e) => setMessage(e.target.value)} className={`${inputCls} resize-none`} />
                        </div>
                        <div>
                          <label htmlFor="donate-email" className={labelCls}>{t.s2.email}</label>
                          <input id="donate-email" data-testid="donate-email" type="email" inputMode="email" autoComplete="email" value={email} maxLength={120} placeholder={t.s2.emailPh}
                            onChange={(e) => { setEmail(e.target.value); setErr(null); }} className={inputCls} />
                        </div>
                      </div>

                      {err && <div className="mt-4"><ErrorLine msg={err} /></div>}

                      <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
                        <button type="button" data-testid="donate-back" onClick={() => { setStep(1); setErr(null); }} disabled={sealing}
                          className="inline-flex items-center justify-center gap-1.5 font-mono2 text-[10px] tracking-[0.2em] px-4 min-h-[60px] border border-gold/40 text-gold hover:bg-gold/10 transition-colors">
                          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">{t.s2.back}</span>
                        </button>
                        <button type="button" data-testid="donate-seal" onClick={seal} disabled={sealing}
                          className="plank-cut gold-ingot inline-flex items-center justify-center gap-2.5 font-display text-lg sm:text-2xl tracking-wider uppercase px-4 py-4 min-h-[60px] text-ink disabled:opacity-60 active:translate-y-px transition-transform">
                          {sealing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Feather className="w-5 h-5 shrink-0" />}
                          <span className="leading-tight">{sealing ? t.s2.sealing : t.s2.seal}</span>
                        </button>
                      </div>
                      <p data-testid="donate-legal-note" className="mt-4 font-fell text-sm text-mist leading-relaxed">
                        {t.s2.legalBefore}{" "}
                        <a href="/conditions#dons" data-testid="donate-legal-link" className="text-gold underline underline-offset-4 hover:text-goldlight">{t.s2.legalLink}</a>
                        {t.s2.legalAfter}
                      </p>
                    </motion.div>
                  )}

                  {/* ---------- ÉTAPE III ---------- */}
                  {step === 3 && sealed && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28, ease: EASE }} data-testid="donate-step-3">
                      <div className="text-center">
                        <motion.span initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
                          className="wax-seal w-16 h-16 mx-auto mb-4 grid place-items-center">
                          <Check className="w-7 h-7 text-goldlight" />
                        </motion.span>
                        <p className="font-mono2 text-[9px] tracking-[0.28em] text-mist mb-1">{t.stepOf(3, 3)}</p>
                        <h3 className="font-display text-3xl sm:text-4xl text-gold mb-1.5">{t.s3.title}</h3>
                        <p className="font-fell italic text-base text-mist mb-5 max-w-lg mx-auto">{t.s3.sub}</p>
                      </div>

                      <div className="border-2 border-dashed border-gold/50 bg-ink/80 px-4 py-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-center sm:text-left">
                          <p className="font-mono2 text-[9px] tracking-[0.28em] text-mist">{t.s3.receipt}</p>
                          <code data-testid="donate-receipt-id" className="font-mono2 text-2xl sm:text-3xl tracking-[0.16em] text-goldlight">{sealed.receipt_id}</code>
                          <p className="font-fell text-sm text-bone/75 mt-0.5">{sealed.pseudo} · {fmtAmt(sealed.amount)} €</p>
                        </div>
                        <button type="button" data-testid="donate-copy" onClick={() => doCopy(sealed.receipt_id)}
                          className={`inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.2em] px-4 min-h-[46px] border transition-colors ${copied ? "border-emerald-400/60 text-emerald-300" : "border-gold/50 text-gold hover:bg-gold/10"}`}>
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? t.s3.copied : t.s3.copy}
                        </button>
                      </div>

                      <p className="font-mono2 text-[10px] tracking-[0.28em] text-gold mb-3">{t.s3.how}</p>
                      <ol className="space-y-2.5 mb-6">
                        {t.s3.howSteps.map((fn, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-6 h-6 shrink-0 grid place-items-center border border-gold/50 font-display text-xs text-gold">{i + 1}</span>
                            <span className="font-fell text-base text-bone/85 leading-snug">{fn(fmtAmt(sealed.amount), sealed.receipt_id)}</span>
                          </li>
                        ))}
                      </ol>

                      {sealed.paypal_url ? (
                        <a
                          href={sealed.paypal_url} target="_blank" rel="noopener noreferrer"
                          data-testid="donate-paypal-link"
                          onClick={() => { copyText(sealed.receipt_id); setOpened(true); }}
                          className="plank-cut gold-ingot w-full inline-flex items-center justify-center gap-3 font-display text-xl sm:text-2xl tracking-wider uppercase px-6 py-4 min-h-[62px] text-ink active:translate-y-px transition-transform"
                        >
                          <ExternalLink className="w-5 h-5 shrink-0" /> {opened ? t.s3.payAgain : t.s3.pay(fmtAmt(sealed.amount))}
                        </a>
                      ) : (
                        <div data-testid="donate-coming" className="border border-gold/40 bg-gold/5 p-4 text-center">
                          <p className="font-display text-lg text-gold uppercase">{t.coming.title}</p>
                          <p className="font-fell text-sm text-bone/80">{t.coming.text}</p>
                        </div>
                      )}

                      <AnimatePresence>
                        {opened && (
                          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            data-testid="donate-opened" className="mt-4 flex items-start gap-2 border-l-4 border-emerald-400 bg-emerald-500/10 px-4 py-3 font-fell text-sm sm:text-base text-bone/90">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" /> {t.s3.opened}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button type="button" data-testid="donate-invoice" onClick={() => download(sealed.receipt_id, "pdf")} disabled={!!dlBusy}
                          className="inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.16em] px-3 min-h-[48px] border border-gold/40 text-gold hover:bg-gold/10 disabled:opacity-50 transition-colors">
                          {dlBusy === `${sealed.receipt_id}-pdf` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} {t.s3.invoice}
                        </button>
                        <a href="#mes-dons" data-testid="donate-see-gifts"
                          className="inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.16em] px-3 min-h-[48px] border border-gold/40 text-gold hover:bg-gold/10 transition-colors">
                          <Hourglass className="w-4 h-4" /> {t.s3.seeGifts}
                        </a>
                        <button type="button" data-testid="donate-new" onClick={resetWizard}
                          className="inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.16em] px-3 min-h-[48px] border border-gold/25 text-mist hover:text-gold hover:border-gold/50 transition-colors">
                          <Plus className="w-4 h-4" /> {t.s3.newGift}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </section>

        {/* ================= 3. MES DONS (carnet de bord) ================= */}
        <section id="mes-dons" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24 scroll-mt-24 sm:scroll-mt-32" data-testid="mygifts-section">
          <SectionHead icon={Feather} eyebrow={t.track.eyebrow} title={t.track.title} sub={t.track.sub} testId="mygifts-title" />

          {gifts.length > 0 ? (
            <>
              <div className="flex justify-end mb-3">
                <button type="button" data-testid="mygifts-refresh" onClick={() => refreshGifts()}
                  className="inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.2em] text-mist hover:text-gold px-2 py-2 min-h-[40px] transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> {t.track.refresh}
                </button>
              </div>
              <ul className="space-y-3.5">
                {gifts.map((g) => {
                  const info = giftInfo[g.receipt_id] || {};
                  const st = info.status || "pending";
                  const amt = info.amount ?? g.amount;
                  const stepIdx = st === "confirmed" ? 2 : st === "pending" ? 1 : 0;
                  return (
                    <li key={g.receipt_id} data-testid={`my-gift-${g.receipt_id}`} data-status={st} className="border border-gold/30 bg-deck p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <code className="font-mono2 text-sm sm:text-base tracking-[0.16em] text-goldlight">{g.receipt_id}</code>
                          <p className="font-fell text-base text-bone/85 mt-0.5 break-words">
                            <span className="font-display text-xl text-gold">{fmtAmt(amt)} €</span> · {info.pseudo || g.pseudo}
                            {info.created_at && <span className="text-mist text-sm"> · {dateFmt(info.created_at)}</span>}
                          </p>
                        </div>
                        <span data-testid={`my-gift-status-${g.receipt_id}`}><StatusBadge status={st} labels={t.status} /></span>
                      </div>

                      {st !== "unknown" && st !== "rejected" && (
                        <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden="true">
                          {t.track.timeline.map((lbl, i) => (
                            <div key={lbl}>
                              <div className={`h-1.5 ${i <= stepIdx ? (st === "confirmed" ? "bg-emerald-400" : "bg-gold") : "bg-gold/15"}`} />
                              <p className={`mt-1.5 font-mono2 text-[8px] sm:text-[9px] tracking-[0.18em] ${i <= stepIdx ? "text-gold" : "text-mist/60"}`}>{lbl}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="font-fell text-sm text-mist mt-3">
                        {st === "confirmed" ? t.track.confirmedHint : st === "rejected" ? t.track.rejectedHint : st === "unknown" ? t.track.unknownHint : t.track.pendingHint}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-3.5">
                        {st === "pending" && info.paypal_url && (
                          <a href={info.paypal_url} target="_blank" rel="noopener noreferrer" data-testid={`my-gift-pay-${g.receipt_id}`}
                            onClick={() => copyText(g.receipt_id)}
                            className="gold-ingot inline-flex items-center gap-1.5 font-mono2 text-[10px] tracking-[0.16em] px-3.5 min-h-[44px] text-ink">
                            <ExternalLink className="w-3.5 h-3.5" /> {t.track.pay}
                          </a>
                        )}
                        {(st === "pending" || st === "confirmed") && (
                          <>
                            <button type="button" data-testid={`my-gift-pdf-${g.receipt_id}`} onClick={() => download(g.receipt_id, "pdf")} disabled={!!dlBusy}
                              className="inline-flex items-center gap-1.5 font-mono2 text-[10px] tracking-[0.16em] px-3.5 min-h-[44px] border border-gold/45 text-gold hover:bg-gold/10 disabled:opacity-50 transition-colors">
                              {dlBusy === `${g.receipt_id}-pdf` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} {t.track.pdf}
                            </button>
                            <button type="button" data-testid={`my-gift-xlsx-${g.receipt_id}`} onClick={() => download(g.receipt_id, "xlsx")} disabled={!!dlBusy}
                              className="inline-flex items-center gap-1.5 font-mono2 text-[10px] tracking-[0.16em] px-3.5 min-h-[44px] border border-gold/25 text-gold/80 hover:bg-gold/10 disabled:opacity-50 transition-colors">
                              {dlBusy === `${g.receipt_id}-xlsx` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} {t.track.xlsx}
                            </button>
                          </>
                        )}
                        <button type="button" data-testid={`my-gift-forget-${g.receipt_id}`} onClick={() => forget(g.receipt_id)}
                          className="ml-auto inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.16em] px-2 min-h-[44px] text-mist hover:text-bloodglow transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.track.forget}</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p data-testid="mygifts-empty" className="font-fell italic text-base text-mist text-center border border-gold/20 bg-deck px-5 py-6">{t.track.empty}</p>
          )}

          {/* Retrouver un bordereau d'un autre appareil */}
          <form onSubmit={doLookup} className="mt-5 border border-gold/25 bg-deck p-4 sm:p-5" data-testid="lookup-form">
            <label htmlFor="lookup-input" className="flex items-center gap-2 font-display text-lg text-gold mb-3">
              <Search className="w-4 h-4" /> {t.track.lookupTitle}
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2.5">
              <input id="lookup-input" data-testid="lookup-input" value={lookup} placeholder={t.track.lookupPh} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                onChange={(e) => { setLookup(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 13)); setLookupErr(null); }}
                className={`${inputCls} font-mono2 tracking-[0.16em] text-goldlight uppercase`} />
              <button type="submit" data-testid="lookup-btn" disabled={lookupBusy || lookup.length < 4}
                className="gold-ingot inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.18em] px-4 sm:px-5 min-h-[50px] text-ink disabled:opacity-45 disabled:cursor-not-allowed">
                {lookupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} <span className="hidden sm:inline">{t.track.lookupBtn}</span>
              </button>
            </div>
            {lookupErr && <div className="mt-3"><ErrorLine msg={lookupErr} testId="lookup-error" /></div>}
          </form>
        </section>

        {/* ================= 4. LE HALL DES DONATEURS ================= */}
        <section id="hall" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24 scroll-mt-24 sm:scroll-mt-32" data-testid="hall-section">
          <SectionHead icon={Skull} eyebrow={t.hall.eyebrow} title={t.hall.title} sub={t.hall.sub} testId="hall-title" />
          {hall.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {hall.items.map((it, i) => {
                const clickable = !it.anonymous && (it.pseudo || "").trim().length >= 2;
                const inner = (
                  <>
                    <span className="wax-seal w-11 h-11 shrink-0 grid place-items-center font-display text-lg text-goldlight">
                      {it.anonymous ? <Skull className="w-5 h-5" /> : (it.pseudo || "?").trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className={`font-display text-lg truncate ${it.anonymous ? "text-mist italic" : "text-bone"}`}>{it.anonymous ? t.hall.anon : it.pseudo}</p>
                      <p className="font-mono2 text-[9px] tracking-[0.18em] text-gold/80 truncate">{dateFmt(it.created_at)}</p>
                    </div>
                    <span className="font-display text-xl text-gold shrink-0">{fmtAmt(it.amount)} €</span>
                  </>
                );
                return (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35, ease: EASE }}
                    data-testid="hall-item"
                  >
                    {clickable ? (
                      <button
                        type="button"
                        onClick={() => setProfilePseudo(it.pseudo)}
                        aria-label={`${t.hall.openProfile || "Voir le profil"} — ${it.pseudo}`}
                        data-testid="hall-item-btn"
                        className="w-full flex items-center gap-3.5 border border-gold/35 bg-deck p-4 min-w-0 min-h-[72px] text-left hover:border-gold hover:bg-ink/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/60 active:bg-ink/60 transition-colors cursor-pointer"
                      >
                        {inner}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3.5 border border-gold/35 bg-deck p-4 min-w-0 min-h-[72px]">
                        {inner}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div data-testid="hall-empty" className="text-center border border-gold/25 bg-deck px-5 py-10">
              <p className="font-fell italic text-lg text-mist mb-5">{t.hall.empty}</p>
              <button type="button" onClick={goCoffre} data-testid="hall-be-first"
                className="gold-ingot inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.2em] px-5 min-h-[48px] text-ink">
                <Feather className="w-4 h-4" /> {t.hall.beFirst}
              </button>
            </div>
          )}
        </section>

        {/* ================= 5. OÙ VA TON OR ================= */}
        <section id="pourquoi" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24" data-testid="why-section">
          <SectionHead icon={Ship} eyebrow={t.why.eyebrow} title={t.why.title} testId="why-title" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {t.why.items.map((w) => {
              const Icon = WHY_ICONS[w.key] || Coins;
              return (
                <div key={w.key} data-testid={`why-${w.key}`} className="border border-gold/25 bg-deck p-5 hover:border-gold/60 transition-colors">
                  <Icon className="w-7 h-7 text-gold mb-3" strokeWidth={1.6} />
                  <p className="font-display text-xl text-gold uppercase tracking-wide mb-1.5">{w.title}</p>
                  <p className="font-fell text-base text-bone/80 leading-relaxed">{w.text}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 border-l-4 border-emerald-400 bg-emerald-500/10 p-4 sm:p-5" data-testid="donations-free-banner">
            <p className="font-display text-xl text-emerald-300 uppercase tracking-wide mb-1 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" /> {t.why.freeTitle}
            </p>
            <p className="font-fell text-base text-bone/85 leading-relaxed">{t.why.freeText}</p>
          </div>
        </section>

        {/* ================= 6. FAQ ================= */}
        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24" data-testid="faq-section">
          <SectionHead icon={Anchor} title={t.faq.title} testId="faq-title" />
          <div className="border border-gold/25 bg-deck divide-y divide-gold/15">
            {t.faq.items.map((f, i) => {
              const on = openFaq === i;
              return (
                <div key={f.q}>
                  <button type="button" data-testid={`faq-q-${i}`} aria-expanded={on} onClick={() => setOpenFaq(on ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-4 sm:px-5 py-4 min-h-[56px] hover:bg-gold/5 transition-colors">
                    <span className="font-display text-lg sm:text-xl text-bone">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gold shrink-0 transition-transform duration-300 ${on ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <p data-testid={`faq-a-${i}`} className="px-4 sm:px-5 pb-4 font-fell text-base text-bone/80 leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center" data-testid="donations-thanks">
            <Anchor className="w-7 h-7 text-gold mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-display text-2xl sm:text-3xl text-bone uppercase tracking-wide mb-2">{t.thanksTitle}</p>
            <p className="font-fell text-base sm:text-lg text-bone/80 leading-relaxed max-w-2xl mx-auto">{t.thanksText}</p>
          </div>
        </section>
      </main>

      {/* Barre collante mobile */}
      <AnimatePresence>
        {showSticky && hall.configured && (
          <motion.div
            initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} transition={{ duration: 0.3, ease: EASE }}
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink border-t border-gold/40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            data-testid="donations-sticky"
          >
            <button type="button" onClick={goCoffre} data-testid="donations-sticky-cta"
              className="plank-cut gold-ingot w-full inline-flex items-center justify-center gap-2.5 font-display text-lg tracking-wider uppercase min-h-[52px] text-ink">
              <Coins className="w-5 h-5" /> {t.sticky} · {goalPct} %
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <DonorProfileSheet
        open={!!profilePseudo}
        pseudo={profilePseudo}
        lang={lang}
        t={t.hall}
        onClose={() => setProfilePseudo(null)}
      />

      <Footer />
    </div>
  );
}

function ErrorLine({ msg, testId = "donate-error" }) {
  return (
    <p data-testid={testId} role="alert" className="mb-4 flex items-start gap-2 border border-bloodglow/50 bg-blood/15 px-4 py-3 font-fell text-sm sm:text-base text-bone/90">
      <AlertTriangle className="w-4 h-4 text-bloodglow shrink-0 mt-0.5" /> {msg}
    </p>
  );
}
