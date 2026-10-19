// Golden Pirates — Page BUTIN (donations) refaite de zéro
// Objectifs : flux limpide, zero doublon, mobile-first (390 → 1920), 100% pirate.
// Ordre strict : Hero → Soutien PayPal (picker + 1 bouton) → Déclaration → Hall (jauge+liste) → Pourquoi → Facture.
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/i18n";
import Seo from "@/lib/Seo";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import {
  Ship, TrendingUp, Beer, Lock, ShieldCheck, Anchor, Feather, Coins,
  Receipt, FileText, FileSpreadsheet, Loader2, AlertTriangle,
  Hourglass, CheckCircle2, XCircle, Copy, X, Download, Users,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];
const WHY_ICONS = { ship: Ship, growth: TrendingUp, fest: Beer, free: Lock };

// Cache local des bordereaux du donateur sur cet appareil
const GIFTS_KEY = "gp_gifts";
const readGifts = () => {
  try {
    const v = JSON.parse(localStorage.getItem(GIFTS_KEY) || "[]");
    return Array.isArray(v) ? v.filter((g) => g && typeof g.receipt_id === "string") : [];
  } catch {
    return [];
  }
};
const writeGifts = (list) => {
  try {
    localStorage.setItem(GIFTS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch { /* stockage indisponible */ }
};

// Badge statut (couleurs/libellés unifiés)
function StatusBadge({ status, labels }) {
  const map = {
    pending: ["border-gold/55 text-gold bg-gold/10", Hourglass, labels.pending],
    confirmed: ["border-emerald-400/60 text-emerald-300 bg-emerald-500/10", CheckCircle2, labels.confirmed],
    rejected: ["border-bloodglow/60 text-bloodglow bg-blood/15", XCircle, labels.rejected],
    unknown: ["border-mist/40 text-mist bg-ink/60", XCircle, labels.unknown],
  };
  const [cls, Icon, lbl] = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono2 text-[9px] tracking-[0.2em] whitespace-nowrap ${cls}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />{lbl}
    </span>
  );
}

export default function Donations() {
  const { c } = useLang();
  const d = c.donations;

  // --- Choix de montant + PayPal ---
  const [picked, setPicked] = useState(null);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [coming, setComing] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [thankAmount, setThankAmount] = useState(0);

  // --- Hall + jauge ---
  const [hallItems, setHallItems] = useState([]);
  const [hallTotal, setHallTotal] = useState(0);
  const [goal, setGoal] = useState(0);

  // --- Déclaration du don + bordereaux locaux ---
  const [declOpen, setDeclOpen] = useState(false);
  const [decl, setDecl] = useState({ pseudo: "", amount: "", email: "", message: "" });
  const [declBusy, setDeclBusy] = useState(false);
  const [declErr, setDeclErr] = useState(null);
  const [declDone, setDeclDone] = useState(null);
  const [declCopied, setDeclCopied] = useState(false);
  const [gifts, setGifts] = useState(readGifts);
  const [giftStatus, setGiftStatus] = useState({});

  // --- Recherche de facture par bordereau ---
  const [receiptCode, setReceiptCode] = useState("");
  const [receiptLang, setReceiptLang] = useState("fr");
  const [receiptFmt, setReceiptFmt] = useState("pdf");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState(null);

  // === EFFETS ===
  useEffect(() => {
    let dead = false;
    const load = () => api.get("/donators")
      .then(({ data }) => {
        if (dead) return;
        setHallItems(data.items || []);
        setHallTotal(data.total || 0);
        setGoal(Number(data.goal) || 0);
      })
      .catch(() => {});
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  const refreshGifts = useCallback(async (list = gifts) => {
    if (!list.length) return;
    const entries = await Promise.all(
      list.map((g) =>
        api.get(`/donations/status/${encodeURIComponent(g.receipt_id)}`)
          .then(({ data }) => [g.receipt_id, data.status])
          .catch((err) => [g.receipt_id, err?.response?.status === 404 ? "unknown" : "pending"])
      )
    );
    setGiftStatus((p) => ({ ...p, ...Object.fromEntries(entries) }));
  }, [gifts]);

  useEffect(() => {
    refreshGifts(gifts);
    const t = setInterval(() => { if (!document.hidden) refreshGifts(gifts); }, 30000);
    return () => clearInterval(t);
  }, [gifts, refreshGifts]);

  // === DÉRIVÉS ===
  const chosenAmount = useMemo(() => (
    picked === "free" ? (parseFloat((custom || "").replace(",", ".")) || 0) : (picked || 0)
  ), [picked, custom]);

  const goalPct = goal > 0 ? Math.min(100, Math.round((hallTotal / goal) * 100)) : 0;
  const goalReached = goal > 0 && hallTotal >= goal;
  const dropDisabled = busy || !picked || (picked === "free" && !(parseFloat((custom || "").replace(",", ".")) > 0));
  const activeTier = (amt) =>
    picked === amt || (picked === "free" && Math.round((parseFloat((custom || "").replace(",", ".")) || 0)) === amt);

  // === ACTIONS ===
  const drop = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const amt = chosenAmount >= 1 ? Math.min(chosenAmount, 10000) : null;
      const { data } = await api.get("/donations/paypal", { params: amt ? { amount: amt } : {} });
      if (data.configured && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        setThankAmount(amt || 0);
        setThanks(true);
      } else {
        setComing(true);
      }
    } catch { setComing(true); }
    finally { setBusy(false); }
  };

  const openDeclare = (amount) => {
    setDeclErr(null);
    setDeclDone(null);
    setDeclCopied(false);
    setDecl((p) => ({ ...p, amount: amount ? String(amount) : p.amount }));
    setThanks(false);
    setDeclOpen(true);
  };

  const submitDeclare = async () => {
    if (declBusy) return;
    const amt = parseFloat((decl.amount || "").replace(",", "."));
    if (decl.pseudo.trim().length < 2 || !(amt >= 0.5)) {
      setDeclErr(d.declare.invalid);
      return;
    }
    setDeclBusy(true);
    setDeclErr(null);
    try {
      const { data } = await api.post("/donations/declare", {
        pseudo: decl.pseudo.trim(),
        amount: amt,
        email: decl.email.trim() || null,
        message: decl.message.trim() || null,
      });
      const g = { receipt_id: data.receipt_id, pseudo: data.pseudo, amount: data.amount, at: Date.now() };
      const next = [g, ...readGifts().filter((x) => x.receipt_id !== g.receipt_id)];
      writeGifts(next);
      setGifts(next);
      setGiftStatus((p) => ({ ...p, [g.receipt_id]: "pending" }));
      setDeclDone(data);
      setReceiptCode(data.receipt_id);
    } catch (err) {
      const det = err?.response?.data?.detail;
      setDeclErr((det && (det.msg || (typeof det === "string" ? det : null))) || d.declare.invalid);
    } finally {
      setDeclBusy(false);
    }
  };

  const forgetGift = (rid) => {
    const next = readGifts().filter((x) => x.receipt_id !== rid);
    writeGifts(next);
    setGifts(next);
  };

  const copyCode = async (rid) => {
    try {
      await navigator.clipboard.writeText(rid);
      setDeclCopied(true);
      setTimeout(() => setDeclCopied(false), 1800);
    } catch { /* presse-papier indisponible */ }
  };

  const doDownload = async (rid, fmt, lk) => {
    setReceiptError(null);
    setReceiptBusy(true);
    try {
      const { data, headers } = await api.get(`/donations/invoice/${fmt}`, {
        params: { receipt_id: rid, lang: lk },
        responseType: "blob",
        timeout: 120000,
      });
      const m = /filename="?([^";]+)"?/.exec(headers?.["content-disposition"] || "");
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = m ? m[1] : `GOLDEN-PIRATES-FACTURE-${rid}.${fmt}`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 500);
    } catch (err) {
      let msg = d.receipt.notFound;
      try {
        if (err?.response?.data instanceof Blob) {
          const txt = await err.response.data.text();
          const p = JSON.parse(txt);
          if (p?.detail?.msg) msg = p.detail.msg;
        }
      } catch { /* ignore */ }
      setReceiptError(msg);
    } finally {
      setReceiptBusy(false);
    }
  };

  const downloadReceipt = async () => {
    const rid = (receiptCode || "").trim().toUpperCase();
    setReceiptError(null);
    if (!rid) { setReceiptError(d.receipt.noCode); return; }
    await doDownload(rid, receiptFmt, receiptLang);
  };

  // === RENDU ===
  return (
    <div className="min-h-screen bg-ink text-bone overflow-x-hidden">
      <Seo route="/donations" />
      <Nav />

      <main data-testid="donations-main" className="pt-24 sm:pt-32 pb-16 sm:pb-24">
        {/* ============ 1. HERO ============ */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-14 items-center">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.32em] text-gold border border-gold/40 bg-gold/5 px-3.5 py-2 mb-5"
              data-testid="donations-eyebrow"
            >
              <Coins className="w-3.5 h-3.5 shrink-0" /> {d.eyebrow}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.6, ease: EASE }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl text-bone leading-[1.05] mb-4"
              data-testid="donations-title"
            >
              {d.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6, ease: EASE }}
              className="font-fell text-base sm:text-lg text-bone/85 leading-relaxed mb-6 max-w-xl"
              data-testid="donations-lead"
            >
              {d.lead}
            </motion.p>

            {/* Chip stat (unique) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5, ease: EASE }}
              className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono2 text-[10px] tracking-[0.26em] text-emerald-300 border border-emerald-400/40 bg-emerald-500/5 px-3.5 py-2 mb-6"
              data-testid="donations-hero-stat"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {hallTotal.toFixed(0)} €{goal > 0 ? ` / ${goal.toFixed(0)} €` : ""}
              </span>
              <span aria-hidden className="h-3 w-px bg-emerald-400/30 hidden sm:inline-block" />
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                {d.hall.sailors(hallItems.length)}
              </span>
            </motion.div>

            {/* 2 CTA max : primaire (soutien) + secondaire (facture) */}
            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.6, ease: EASE }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <a
                href="#soutien"
                data-testid="donations-cta"
                className="inline-flex items-center justify-center gap-2.5 font-display text-xl tracking-wider uppercase px-6 py-3.5 min-h-[52px] bg-gold text-ink hover:bg-goldlight hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold transition-[background-color,box-shadow] duration-200"
              >
                <Anchor className="w-5 h-5 shrink-0" /> {d.cta}
              </a>
              <a
                href="#facture"
                data-testid="donations-cta-receipt"
                className="inline-flex items-center justify-center gap-2.5 font-mono2 text-xs tracking-[0.24em] uppercase px-5 py-3.5 min-h-[52px] border border-gold/50 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors duration-200"
              >
                <Receipt className="w-4 h-4 shrink-0" /> {d.receipt.title}
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
            className="relative border border-gold/40 bg-deck/60 p-3 max-w-sm w-full mx-auto lg:mx-0 lg:ml-auto"
            data-testid="donations-illustration"
          >
            <img
              src="/butin-tresor.png"
              alt={d.title}
              className="w-full h-[220px] sm:h-[300px] lg:h-[380px] object-cover"
              loading="eager"
            />
            <span className="absolute -bottom-3 left-5 font-mono2 text-[9px] tracking-[0.3em] text-gold bg-ink px-3 py-1.5 border border-gold/30">
              G.P. — 1023
            </span>
          </motion.div>
        </section>

        {/* ============ 2. SOUTIEN — amount picker + PayPal + "déjà donné" ============ */}
        <section id="soutien" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20 scroll-mt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: EASE }}
            className="relative border-2 border-gold/40 bg-deck/70 frame-plate p-5 sm:p-8"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
              <Coins className="w-5 h-5 text-gold shrink-0" />
              <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-gold uppercase tracking-wide text-center" data-testid="donations-tiers-title">
              {d.tiersTitle}
            </h2>
            <p className="font-fell italic text-sm sm:text-base text-mist text-center mt-2 mb-6">{d.tiersSub}</p>

            {/* Paliers 3 colonnes (mobile aussi) */}
            <div role="radiogroup" aria-label={d.tiersTitle} className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              {d.tierAmounts.map((amount, i) => (
                <motion.button
                  key={amount}
                  type="button"
                  role="radio"
                  aria-checked={activeTier(amount)}
                  data-testid={`donations-tier-${amount}`}
                  initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }} transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }}
                  onClick={() => { setPicked(amount); setCustom(""); setComing(false); }}
                  className={`relative border p-3 sm:p-4 text-center min-h-[108px] sm:min-h-[120px] flex flex-col justify-center transition-colors duration-200 ${
                    activeTier(amount)
                      ? "border-gold bg-gold/15 shadow-[0_0_24px_rgba(212,175,55,0.25)]"
                      : "border-gold/30 bg-ink/50 hover:border-gold/70 hover:bg-gold/5"
                  }`}
                >
                  {activeTier(amount) && (
                    <span className="absolute -top-2 right-2 font-mono2 text-[8px] tracking-[0.22em] bg-gold text-ink px-1.5 py-0.5">✓</span>
                  )}
                  <Coins className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 ${activeTier(amount) ? "text-gold" : "text-gold/55"}`} />
                  <p className={`font-display text-2xl sm:text-3xl mb-0.5 ${activeTier(amount) ? "text-gold" : "text-bone"}`}>{amount} €</p>
                  <p className="font-mono2 text-[8px] sm:text-[9px] tracking-[0.18em] text-mist leading-tight">{d.tierLabels[i]}</p>
                </motion.button>
              ))}
            </div>

            {/* Montant libre */}
            <div className="border border-gold/25 bg-ink/50 p-3.5 sm:p-4 mb-5" data-testid="donations-free-block">
              <label htmlFor="custom-amount" className="block font-mono2 text-[9px] tracking-[0.22em] text-gold/80 mb-2">
                {d.freeAmount}
              </label>
              <input
                id="custom-amount"
                data-testid="donations-custom-input"
                value={custom}
                onChange={(e) => { setCustom(e.target.value.replace(/[^\d.,]/g, "")); setPicked("free"); setComing(false); }}
                placeholder={d.freeAmountPh}
                inputMode="decimal"
                maxLength={7}
                autoComplete="off"
                className="w-full min-h-[48px] bg-ink/70 border border-gold/25 px-4 py-3 font-fell text-base sm:text-lg text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            {/* CTA PayPal (primaire, unique) */}
            <motion.button
              type="button"
              data-testid="donations-drop-btn"
              whileTap={{ scale: 0.98 }}
              onClick={drop}
              disabled={dropDisabled}
              className="w-full inline-flex items-center justify-center gap-2.5 font-display text-lg sm:text-xl lg:text-2xl tracking-wider uppercase px-5 py-4 min-h-[60px] bg-gold text-ink hover:bg-goldlight hover:shadow-[0_0_45px_rgba(212,175,55,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,box-shadow] duration-200"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />}
              <span className="text-center leading-tight">{busy ? d.dropBusy : d.dropBtn}</span>
            </motion.button>

            <p className="mt-3 font-mono2 text-[9px] sm:text-[10px] tracking-[0.22em] text-emerald-300 text-center flex items-center justify-center gap-1.5 flex-wrap" data-testid="donations-fee-note">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />{d.feeNote}
            </p>

            {/* CTA secondaire : déclarer */}
            <button
              type="button"
              data-testid="donations-declare-open"
              onClick={() => openDeclare(chosenAmount >= 0.5 ? chosenAmount : "")}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.22em] px-4 py-3 min-h-[48px] border border-gold/45 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors text-center"
            >
              <Feather className="w-4 h-4 shrink-0" /> {d.declare.openBtn}
            </button>

            {/* Note "coming soon" si PayPal non-configuré */}
            <AnimatePresence>
              {coming && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="mt-4 border border-gold/40 bg-gold/5 p-4"
                  data-testid="donations-coming"
                >
                  <p className="font-display text-base sm:text-lg text-gold uppercase tracking-wide mb-1 flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" /> {d.comingTitle}
                  </p>
                  <p className="font-fell text-sm sm:text-base text-bone/80">{d.comingText}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note confiance — ligne unique, pas de doublon */}
            <p className="mt-5 font-fell text-sm text-mist text-center max-w-xl mx-auto" data-testid="donations-trust">
              <ShieldCheck className="w-4 h-4 inline mr-1.5 -mt-0.5 text-gold/70" />
              {d.trustText}
            </p>
          </motion.div>
        </section>

        {/* ============ 3. HALL + JAUGE (unique) ============ */}
        <section id="jauge" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20 scroll-mt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
              <Anchor className="w-5 h-5 text-gold shrink-0" />
              <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-gold uppercase tracking-wide text-center" data-testid="donations-hall-title">
              {d.hall.title}
            </h2>
            <p className="font-fell italic text-sm sm:text-base text-mist text-center mt-2 mb-6 sm:mb-8">{d.hall.sub}</p>

            {/* Jauge unique */}
            <div className="mb-8 sm:mb-10 border border-gold/25 bg-deck/50 p-4 sm:p-6" data-testid="donations-progress">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2.5">
                <p className="font-mono2 text-[10px] tracking-[0.28em] text-gold">{d.hall.progressTitle}</p>
                <p className="font-mono2 text-[11px] tracking-[0.26em] text-emerald-300" data-testid="donations-hall-total">
                  {hallTotal.toFixed(2)} €{goal > 0 ? ` / ${goal.toFixed(0)} €` : ""}
                </p>
              </div>
              <div data-testid="donations-progress-bar" className="relative h-4 sm:h-5 border border-gold/40 bg-ink/70 overflow-hidden">
                <motion.div
                  data-testid="donations-progress-fill"
                  initial={{ width: 0 }} whileInView={{ width: `${goalPct}%` }}
                  viewport={{ once: true, amount: 0.5 }} transition={{ duration: 1, ease: EASE }}
                  className={`h-full ${goalReached ? "bg-emerald-400" : "bg-gradient-to-r from-gold/70 to-gold"}`}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-2">
                <p className="font-mono2 text-[9px] tracking-[0.22em] text-mist">
                  {d.hall.sailors(hallItems.length)}
                </p>
                <p className="font-mono2 text-[9px] tracking-[0.22em] text-mist text-right" data-testid="donations-progress-caption">
                  {goal > 0 ? `${goalPct} % ${d.hall.ofGoal}` : ""}{goalReached ? ` — ${d.hall.reached}` : ""}
                </p>
              </div>
            </div>

            {/* Grille de donateurs */}
            {hallItems.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {hallItems.map((it, i) => {
                  const tierName = it.amount >= 15 ? d.tierLabels[2] : it.amount >= 7 ? d.tierLabels[1] : d.tierLabels[0];
                  return (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }} transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35, ease: EASE }}
                      data-testid="donations-hall-item"
                      className="flex items-center gap-3 border border-gold/40 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent p-3.5 sm:p-4 min-w-0"
                    >
                      <div aria-hidden className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gold border-2 border-goldlight flex items-center justify-center shrink-0 rotate-3 shadow-[0_0_18px_rgba(212,175,55,0.25)]">
                        <span className="font-display text-base sm:text-lg text-ink">{(it.pseudo || "?").trim().charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base sm:text-lg text-bone truncate">{it.pseudo}</p>
                        <p className="font-mono2 text-[9px] tracking-[0.2em] text-gold/80 truncate">
                          {it.amount.toFixed(2)} € · {tierName}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="font-fell italic text-base text-mist text-center border border-gold/20 bg-deck/40 px-5 py-8" data-testid="donations-hall-empty">
                {d.hall.empty}
              </p>
            )}
          </motion.div>
        </section>

        {/* ============ 4. POURQUOI (grille 2x2 compacte) ============ */}
        <section id="pourquoi" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20 scroll-mt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
              <Ship className="w-5 h-5 text-gold shrink-0" />
              <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-gold uppercase tracking-wide text-center mb-6 sm:mb-8" data-testid="donations-why-title">
              {d.whyTitle}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {d.why.map((w, i) => {
                const Icon = WHY_ICONS[w.key] || Coins;
                return (
                  <motion.div
                    key={w.key}
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }} transition={{ delay: i * 0.05, duration: 0.45, ease: EASE }}
                    className="border border-gold/25 bg-deck/60 p-4 sm:p-5 hover:border-gold/60 hover:bg-gold/5 transition-colors duration-300"
                    data-testid={`donations-why-${w.key}`}
                  >
                    <Icon className="w-6 h-6 text-gold mb-2.5" strokeWidth={1.6} />
                    <p className="font-display text-lg sm:text-xl text-gold uppercase tracking-wide mb-1.5">{w.title}</p>
                    <p className="font-fell text-sm sm:text-base text-bone/80 leading-relaxed">{w.text}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Note "entrée libre" en bande unique (plus de doublon) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, ease: EASE }}
              className="mt-5 border-l-4 border-emerald-400 bg-emerald-500/10 p-4 sm:p-5"
              data-testid="donations-free-banner"
            >
              <p className="font-display text-lg sm:text-xl text-emerald-300 uppercase tracking-wide mb-1.5 flex items-center gap-2.5" data-testid="donations-free-title">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" /> {d.freeTitle}
              </p>
              <p className="font-fell text-sm sm:text-base text-bone/85 leading-relaxed" data-testid="donations-free-text">
                {d.freeText}
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* ============ 5. FACTURE — mes bordereaux + lookup ============ */}
        <section id="facture" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20 scroll-mt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: EASE }}
            data-testid="donations-receipt-section"
            className="relative border-2 border-gold/35 bg-deck/70 frame-plate p-5 sm:p-8"
          >
            <p className="font-mono2 text-[10px] tracking-[0.28em] text-gold/80 mb-2 flex items-center gap-2">
              <Receipt className="w-4 h-4" strokeWidth={1.6} /> {d.receiptEyebrow}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-gold uppercase tracking-wide mb-2" data-testid="donations-receipt-title">
              {d.receipt.title}
            </h2>
            <p className="font-fell italic text-sm sm:text-base text-mist mb-5 sm:mb-6">{d.receipt.sub}</p>

            {/* Mes dons (local) */}
            {gifts.length > 0 && (
              <div data-testid="donations-my-gifts" className="mb-6 border border-gold/30 bg-ink/50 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <p className="font-mono2 text-[10px] tracking-[0.28em] text-gold">{d.myGifts.title}</p>
                  <button
                    type="button"
                    data-testid="donations-my-gifts-refresh"
                    onClick={() => refreshGifts()}
                    className="font-mono2 text-[9px] tracking-[0.18em] text-mist hover:text-gold px-2 py-1.5 min-h-[36px] transition-colors"
                  >
                    {d.myGifts.refresh}
                  </button>
                </div>
                <p className="font-fell italic text-sm text-mist mb-3">{d.myGifts.sub}</p>
                <ul className="space-y-2.5">
                  {gifts.map((g) => {
                    const st = giftStatus[g.receipt_id] || "pending";
                    return (
                      <li key={g.receipt_id} data-testid={`my-gift-${g.receipt_id}`} data-status={st} className="border border-gold/20 bg-deck/60 p-3 sm:p-3.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <code className="font-mono2 text-[11px] tracking-[0.18em] text-goldlight break-all">{g.receipt_id}</code>
                          <span className="font-mono2 text-[10px] tracking-[0.14em] text-bone/80">{Number(g.amount || 0).toFixed(2)} € · {g.pseudo}</span>
                          <span data-testid={`my-gift-status-${g.receipt_id}`} className="ml-auto">
                            <StatusBadge status={st} labels={d.myGifts} />
                          </span>
                        </div>
                        {st === "pending" && <p className="font-fell text-sm text-mist mt-2">{d.myGifts.pendingHint}</p>}
                        {st === "rejected" && <p className="font-fell text-sm text-mist mt-2">{d.myGifts.rejectedHint}</p>}

                        {/* Boutons téléchargement — disponibles aussi en pending (sauf rejected) */}
                        {(st === "pending" || st === "confirmed") && (
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {[["pdf", "fr"], ["pdf", "en"], ["xlsx", "fr"], ["xlsx", "en"]].map(([f, lk]) => (
                              <button
                                key={f + lk}
                                type="button"
                                data-testid={`my-gift-dl-${f}-${lk}-${g.receipt_id}`}
                                onClick={() => doDownload(g.receipt_id, f, lk)}
                                disabled={receiptBusy}
                                className="inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.16em] px-2.5 py-2 min-h-[40px] border border-gold/40 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none disabled:opacity-50 transition-colors"
                              >
                                {f === "pdf" ? <FileText className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                {f.toUpperCase()} {lk === "fr" ? "FR" : "EN"}
                              </button>
                            ))}
                            <button
                              type="button"
                              data-testid={`my-gift-forget-${g.receipt_id}`}
                              onClick={() => forgetGift(g.receipt_id)}
                              className="ml-auto font-mono2 text-[9px] tracking-[0.16em] px-2.5 py-2 min-h-[40px] text-mist hover:text-bloodglow focus-visible:text-bloodglow focus-visible:outline-none transition-colors"
                            >
                              {d.myGifts.forget}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Lookup par bordereau */}
            <label htmlFor="receipt-input" className="block font-mono2 text-[10px] tracking-[0.28em] text-gold mb-1.5">
              {d.receipt.inputLabel}
            </label>
            <input
              id="receipt-input"
              data-testid="donations-receipt-input"
              value={receiptCode}
              onChange={(e) => setReceiptCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20))}
              placeholder={d.receipt.inputPh}
              autoComplete="off"
              inputMode="text"
              className="w-full min-h-[52px] bg-ink/70 border border-gold/35 px-4 py-3 font-mono2 text-base tracking-[0.18em] text-goldlight placeholder:text-bone/35 focus:border-gold focus:outline-none transition-colors uppercase"
            />
            <p className="font-mono2 text-[9px] tracking-[0.18em] text-mist mt-1.5 italic">{d.receipt.hint}</p>

            {/* Choix langue + format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
              <div>
                <p className="font-mono2 text-[10px] tracking-[0.28em] text-gold mb-2">{d.receipt.lang}</p>
                <div className="flex gap-2">
                  {[["fr", "FR"], ["en", "EN"]].map(([lk, flag]) => (
                    <button
                      key={lk}
                      type="button"
                      data-testid={`donations-receipt-lang-${lk}`}
                      onClick={() => setReceiptLang(lk)}
                      aria-pressed={receiptLang === lk}
                      className={`flex-1 font-mono2 text-xs tracking-[0.2em] py-3 min-h-[44px] border transition-colors ${
                        receiptLang === lk ? "bg-gold text-ink border-gold" : "border-gold/40 text-gold hover:bg-gold/10"
                      }`}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono2 text-[10px] tracking-[0.28em] text-gold mb-2">{d.receipt.format}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="donations-receipt-fmt-pdf"
                    onClick={() => setReceiptFmt("pdf")}
                    aria-pressed={receiptFmt === "pdf"}
                    className={`flex-1 inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.2em] py-3 min-h-[44px] border transition-colors ${
                      receiptFmt === "pdf" ? "bg-gold text-ink border-gold" : "border-gold/40 text-gold hover:bg-gold/10"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> {d.receipt.formatPdf}
                  </button>
                  <button
                    type="button"
                    data-testid="donations-receipt-fmt-xlsx"
                    onClick={() => setReceiptFmt("xlsx")}
                    aria-pressed={receiptFmt === "xlsx"}
                    className={`flex-1 inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.2em] py-3 min-h-[44px] border transition-colors ${
                      receiptFmt === "xlsx" ? "bg-gold text-ink border-gold" : "border-gold/40 text-gold hover:bg-gold/10"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> {d.receipt.formatXlsx}
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {receiptError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  data-testid="donations-receipt-error"
                  className="mt-4 flex items-start gap-2 border border-bloodglow/50 bg-blood/15 text-bone/90 px-4 py-3"
                >
                  <AlertTriangle className="w-4 h-4 text-bloodglow shrink-0 mt-0.5" />
                  <p className="font-fell text-sm leading-relaxed">{receiptError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              data-testid="donations-receipt-download"
              onClick={downloadReceipt}
              disabled={receiptBusy || !receiptCode.trim()}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 font-display text-lg sm:text-xl tracking-wider uppercase bg-gold text-ink px-6 py-3.5 min-h-[52px] hover:bg-goldlight focus-visible:bg-goldlight focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {receiptBusy ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{d.receipt.downloading}</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>{d.receipt.download}</span>
                </>
              )}
            </button>
          </motion.div>

          {/* Mer à tous — adieu compact */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, ease: EASE }}
            data-testid="donations-thanks"
            className="mt-10 text-center"
          >
            <Anchor className="w-7 h-7 text-gold mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-display text-xl sm:text-2xl text-bone uppercase tracking-wide mb-2">{d.thanksTitle}</p>
            <p className="font-fell text-base text-bone/80 leading-relaxed max-w-2xl mx-auto">{d.thanksText}</p>
          </motion.div>
        </section>
      </main>

      {/* ============ MODAL REMERCIEMENT (après ouverture PayPal) ============ */}
      <AnimatePresence>
        {thanks && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] bg-ink/90 flex items-end sm:items-center justify-center p-0 sm:p-5"
            onClick={() => setThanks(false)}
            data-testid="donation-cheer-overlay"
          >
            <motion.div
              data-testid="donation-cheer-modal"
              initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain border-2 border-gold/60 bg-parch frame-plate p-5 sm:p-8 text-center"
            >
              <button
                type="button"
                data-testid="donation-cheer-close-x"
                onClick={() => setThanks(false)}
                aria-label={d.declare.close}
                className="absolute top-2 right-2 p-2.5 text-ink/60 hover:text-ink focus-visible:text-ink focus-visible:outline-none transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div aria-hidden className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold border-2 border-goldlight flex items-center justify-center rotate-3 shadow-[0_0_30px_rgba(212,175,55,0.45)]">
                <Coins className="w-7 h-7 text-ink" />
              </div>
              <p className="font-display text-xl sm:text-2xl text-gold uppercase tracking-wide mb-3" data-testid="donation-cheer-title">
                {d.cheer.title}
              </p>
              <p className="font-fell text-sm sm:text-base text-ink/80 leading-relaxed mb-4" data-testid="donation-cheer-line">
                {d.cheer.line(thankAmount)}
              </p>
              <p className="font-fell text-xs sm:text-sm text-ink/70 leading-relaxed mb-5" data-testid="donation-cheer-hall-note">
                {d.cheer.hallNote}
              </p>
              <button
                type="button"
                data-testid="donation-cheer-declare"
                onClick={() => openDeclare(thankAmount || "")}
                className="w-full inline-flex items-center justify-center gap-2 font-display text-lg sm:text-xl tracking-wider uppercase py-3.5 min-h-[52px] bg-gold text-ink hover:bg-goldlight focus-visible:bg-goldlight focus-visible:outline-none transition-colors duration-200"
              >
                <Feather className="w-5 h-5 shrink-0" /> {d.declare.submit}
              </button>
              <button
                type="button"
                data-testid="donation-cheer-close"
                onClick={() => setThanks(false)}
                className="w-full mt-2.5 font-mono2 text-[10px] tracking-[0.22em] py-3 min-h-[44px] border border-ink/30 text-ink/70 hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none transition-colors"
              >
                {d.declare.later}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MODAL DÉCLARATION — bordereau immédiat ============ */}
      <AnimatePresence>
        {declOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] bg-ink/90 flex items-end sm:items-center justify-center p-0 sm:p-5"
            onClick={() => { if (!declBusy) setDeclOpen(false); }}
            data-testid="donation-declare-overlay"
          >
            <motion.div
              data-testid="donation-declare-modal"
              data-state={declDone ? "done" : "form"}
              initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain border-2 border-gold/60 bg-deck frame-plate p-5 sm:p-8"
            >
              <button
                type="button"
                data-testid="donation-declare-close"
                onClick={() => setDeclOpen(false)}
                disabled={declBusy}
                aria-label={d.declare.close}
                className="absolute top-2 right-2 p-2.5 text-mist hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {!declDone ? (
                <>
                  <p className="font-display text-xl sm:text-2xl lg:text-3xl text-gold uppercase tracking-wide mb-2 pr-10">{d.declare.title}</p>
                  <p className="font-fell text-sm sm:text-base text-mist mb-4 sm:mb-5">{d.declare.sub}</p>
                  <div className="grid gap-3.5 sm:gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3.5 sm:gap-4">
                      <div>
                        <label className="block font-mono2 text-[9px] tracking-[0.22em] text-gold mb-1.5" htmlFor="decl-pseudo">{d.declare.pseudo}</label>
                        <input id="decl-pseudo" data-testid="declare-pseudo" value={decl.pseudo} maxLength={40} autoComplete="nickname"
                          onChange={(e) => setDecl({ ...decl, pseudo: e.target.value })}
                          className="w-full min-h-[48px] bg-ink/70 border border-gold/30 px-4 py-3 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block font-mono2 text-[9px] tracking-[0.22em] text-gold mb-1.5" htmlFor="decl-amount">{d.declare.amount}</label>
                        <input id="decl-amount" data-testid="declare-amount" value={decl.amount} inputMode="decimal" maxLength={8} autoComplete="off"
                          onChange={(e) => setDecl({ ...decl, amount: e.target.value.replace(/[^\d.,]/g, "") })}
                          className="w-full min-h-[48px] bg-ink/70 border border-gold/30 px-4 py-3 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-mono2 text-[9px] tracking-[0.22em] text-gold mb-1.5" htmlFor="decl-email">{d.declare.email}</label>
                      <input id="decl-email" data-testid="declare-email" type="email" value={decl.email} maxLength={120} autoComplete="email" inputMode="email"
                        onChange={(e) => setDecl({ ...decl, email: e.target.value })}
                        className="w-full min-h-[48px] bg-ink/70 border border-gold/30 px-4 py-3 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono2 text-[9px] tracking-[0.22em] text-gold mb-1.5" htmlFor="decl-msg">{d.declare.message}</label>
                      <textarea id="decl-msg" data-testid="declare-message" value={decl.message} maxLength={400} rows={2}
                        onChange={(e) => setDecl({ ...decl, message: e.target.value })}
                        className="w-full bg-ink/70 border border-gold/30 px-4 py-3 font-fell text-base text-bone focus:border-gold focus:outline-none transition-colors resize-none" />
                    </div>
                  </div>
                  {declErr && (
                    <p data-testid="declare-error" className="mt-3.5 flex items-start gap-2 border border-bloodglow/50 bg-blood/15 px-4 py-3 font-fell text-sm text-bone/90">
                      <AlertTriangle className="w-4 h-4 text-bloodglow shrink-0 mt-0.5" /> {declErr}
                    </p>
                  )}
                  <button
                    type="button"
                    data-testid="declare-submit"
                    onClick={submitDeclare}
                    disabled={declBusy}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 font-display text-lg sm:text-xl tracking-wider uppercase px-6 py-3.5 min-h-[52px] bg-gold text-ink hover:bg-goldlight focus-visible:bg-goldlight focus-visible:outline-none disabled:opacity-60 transition-colors duration-200"
                  >
                    {declBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Feather className="w-5 h-5" />}
                    <span>{declBusy ? d.declare.busy : d.declare.submit}</span>
                  </button>
                </>
              ) : (
                <div data-testid="declare-done" className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-display text-xl sm:text-2xl lg:text-3xl text-gold uppercase tracking-wide mb-2">{d.declare.doneTitle}</p>
                  <p className="font-fell text-sm sm:text-base text-mist mb-4">{d.declare.doneSub}</p>
                  <code data-testid="declare-receipt-id" className="block font-mono2 text-lg sm:text-xl lg:text-2xl tracking-[0.22em] text-goldlight bg-ink/70 border border-gold/40 px-4 py-4 mb-3 break-all">
                    {declDone.receipt_id}
                  </code>
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                    <StatusBadge status="pending" labels={d.myGifts} />
                  </div>
                  <p className="font-fell text-sm text-mist mb-4">{d.myGifts.pendingHint}</p>

                  {/* Télécharger directement ici — PDF+XLSX, FR+EN */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[["pdf", "fr"], ["pdf", "en"], ["xlsx", "fr"], ["xlsx", "en"]].map(([f, lk]) => (
                      <button
                        key={f + lk}
                        type="button"
                        data-testid={`declare-dl-${f}-${lk}`}
                        onClick={() => doDownload(declDone.receipt_id, f, lk)}
                        disabled={receiptBusy}
                        className="inline-flex items-center justify-center gap-1.5 font-mono2 text-[10px] tracking-[0.18em] px-3 py-2.5 min-h-[44px] border border-gold/45 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none disabled:opacity-50 transition-colors"
                      >
                        {f === "pdf" ? <FileText className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                        {f.toUpperCase()} {lk === "fr" ? "FR" : "EN"}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button" data-testid="declare-copy" onClick={() => copyCode(declDone.receipt_id)}
                      className="inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.2em] py-3 min-h-[48px] border border-gold/45 text-gold hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none transition-colors">
                      <Copy className="w-4 h-4" /> {declCopied ? d.declare.copied : d.declare.copy}
                    </button>
                    <a href="#facture" data-testid="declare-goto-gifts" onClick={() => setDeclOpen(false)}
                      className="inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.2em] py-3 min-h-[48px] bg-gold text-ink hover:bg-goldlight focus-visible:bg-goldlight focus-visible:outline-none transition-colors">
                      <Receipt className="w-4 h-4" /> {d.myGifts.title}
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
