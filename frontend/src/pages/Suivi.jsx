import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Compass, FileQuestion, Bell, RefreshCw, ScrollText, Anchor as AnchorIcon, RotateCcw, X, HelpCircle,
  Check, Copy, Users, MessageSquare, ShieldCheck, Database, LifeBuoy, KeyRound, Swords, Ship, Feather, ChevronRight,
} from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import ChatBox from "@/components/ChatBox";
import PeerDen from "@/components/PeerDen";
import { SkullIcon } from "@/components/LogoMark";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useRack, saveBottle, removeBottle } from "@/lib/rack";
import { useRecruitNotif, useLastSeen, useBellRing } from "@/lib/notifHub";
import Countdown from "@/components/Countdown";
import { smoothScrollTo } from "@/lib/scroll";

const DISCORD_URL = "https://discord.gg/dSzGk7PYUW";

const EASE = [0.16, 1, 0.3, 1];
const TAB_IDS = ["dossier", "mer", "taniere", "etagere"];

const STATUS_DOT = {
  pending: "bg-gold",
  accepted: "bg-emerald-400",
  rejected: "bg-bloodglow",
  reserve: "bg-amber-400",
};

const STAMP = {
  pending: "text-gold border-gold",
  accepted: "text-emerald-300 border-emerald-400",
  rejected: "text-bloodglow border-bloodglow",
  reserve: "text-amber-300 border-amber-400",
};

function copyText(text, done) {
  const fallback = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch {
      /* presse-papier indisponible : la recrue recopie à la main */
    }
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
  else fallback();
}

// ---------- LA BOUTEILLE À LA MER (illustration maison) ----------
function BottleArt({ className = "" }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#2d6b63" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#7fb8a8" stopOpacity="0.25" />
          <stop offset="1" stopColor="#1d4a44" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="1" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="92" r="86" fill="url(#halo)" />
      <g className="bottle-bob" style={{ transformOrigin: "100px 110px" }}>
        <g transform="rotate(-28 100 100)">
          <rect x="88" y="22" width="24" height="16" rx="3" fill="#8B5A2B" stroke="#5a3a1a" />
          <rect x="91" y="36" width="18" height="22" fill="url(#glass)" stroke="#D4AF37" strokeWidth="1.4" />
          <path
            d="M91 58 Q 80 66 74 78 Q 66 92 66 110 V160 Q 66 172 78 172 H122 Q134 172 134 160 V110 Q134 92 126 78 Q120 66 109 58 Z"
            fill="url(#glass)"
            stroke="#D4AF37"
            strokeWidth="1.8"
          />
          <rect x="82" y="96" width="36" height="62" rx="5" fill="#E8D8C8" opacity="0.92" />
          <path d="M88 108h24M88 116h22M88 124h24M88 132h18M88 140h22" stroke="#6b5435" strokeWidth="1.3" opacity="0.7" />
          <rect x="82" y="122" width="36" height="6" fill="#8B0F0F" />
          <circle cx="100" cy="125" r="6" fill="#B91C1C" stroke="#5a0707" />
          <path d="M74 88 Q 72 120 74 156" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <path d="M0 172 Q 25 160 50 172 T 100 172 T 150 172 T 200 172 V200 H0 Z" fill="#0B192C" opacity="0.95" />
      <path d="M0 172 Q 25 160 50 172 T 100 172 T 150 172 T 200 172" fill="none" stroke="#D4AF37" strokeOpacity="0.45" strokeWidth="1.4" />
      <path d="M0 184 Q 25 176 50 184 T 100 184 T 150 184 T 200 184" fill="none" stroke="#D4AF37" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

// ---------- LE VOYAGE — le navire avance selon le statut ----------
function VoyageTrack({ status, x }) {
  const step = status === "accepted" ? 3 : status === "pending" ? 1 : 2;
  const tone = status === "rejected" ? "bloodglow" : status === "reserve" ? "amber" : "gold";
  const pct = (step / 3) * 100;
  return (
    <div data-testid="voyage-track" data-step={step} className="border border-gold/20 bg-ink/60 p-5 sm:p-6">
      <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-2 flex items-center gap-2">
        <Compass className="w-4 h-4" /> {x.voyageTitle}
      </p>
      <div className="relative mt-8">
        <div className="absolute left-[12.5%] right-[12.5%] top-[15px] border-t-2 border-dashed border-gold/25" />
        <motion.div
          className={`absolute left-[12.5%] top-[14px] h-[3px] ${
            tone === "bloodglow" ? "bg-bloodglow" : tone === "amber" ? "bg-amber-400" : "bg-gold"
          } shadow-[0_0_10px_rgba(212,175,55,0.6)]`}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 0.75}%` }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
        />
        <motion.div
          className="absolute -top-[34px] -translate-x-1/2"
          initial={{ left: "12.5%" }}
          animate={{ left: `${12.5 + step * 25}%` }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
          data-testid="voyage-ship"
        >
          <Ship className="w-7 h-7 text-goldlight ship-bob drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" strokeWidth={1.6} />
        </motion.div>
        <ol className="relative grid grid-cols-4">
          {x.voyage.map((v, i) => {
            const done = i < step;
            const current = i === step;
            const verdict = i === 2 && (status === "rejected" || status === "reserve");
            return (
              <li key={`voyage-step-${i}`} className="flex flex-col items-center px-0.5">
                <span
                  className={`relative z-10 grid place-items-center w-8 h-8 rounded-full border-2 ${
                    current
                      ? verdict
                        ? status === "rejected"
                          ? "bg-blood border-bloodglow"
                          : "bg-amber-600 border-amber-300"
                        : status === "accepted"
                          ? "bg-emerald-600 border-emerald-300"
                          : "bg-gold border-goldlight"
                      : done
                        ? "bg-gold/80 border-gold"
                        : "bg-ink border-gold/30"
                  }`}
                >
                  {done ? (
                    <Check className="w-4 h-4 text-ink" />
                  ) : i === 3 ? (
                    <AnchorIcon className={`w-4 h-4 ${current ? "text-ink" : "text-gold/50"}`} />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${current ? "bg-ink" : "bg-gold/40"}`} />
                  )}
                  {current && <span className="absolute inset-0 rounded-full border border-gold/60 animate-ping" />}
                </span>
                <span
                  className={`mt-3 font-display text-[13px] sm:text-lg leading-tight text-center ${current ? "text-goldlight" : done ? "text-bone" : "text-bone/45"}`}
                >
                  {verdict ? (status === "rejected" ? x.verdictRejected : x.verdictReserve) : v.t}
                </span>
                <span className="hidden sm:block mt-1 font-mono2 text-[9px] tracking-[0.2em] text-mist text-center">
                  {v.d}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function RackBlock({ rack, onView, onDrop, s, c, current }) {
  return (
    <motion.div
      data-testid="bottle-rack"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative border border-gold/25 bg-deck/80 frame-plate p-5 sm:p-7"
    >
      <p className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.3em] text-gold mb-5">
        <Database className="w-4 h-4" /> {s.rackTitle}
        <span className="ml-auto font-mono2 text-[9px] text-mist">{rack.length}/10</span>
      </p>
      <ul className="grid sm:grid-cols-2 gap-3">
        {rack.map((b) => (
          <li
            key={b.code}
            data-testid={`rack-item-${b.code}`}
            className={`group flex items-center gap-3 border px-3 py-3 transition-all ${
              current === b.code ? "border-gold bg-gold/[0.07]" : "border-gold/15 bg-ink/60 hover:border-gold/50"
            }`}
          >
            <span className="shrink-0 w-11 h-11 grid place-items-center">
              <BottleArt className="w-11 h-11" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg text-bone truncate leading-tight">{b.pseudo}</p>
              <p className="font-mono2 text-[9px] tracking-[0.2em] text-gold">{b.code}</p>
              <p className="font-mono2 text-[8px] tracking-[0.25em] text-mist flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status] || STATUS_DOT.pending}`} />
                {c.status[b.status]?.label || c.status.pending.label}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                data-testid={`rack-view-${b.code}`}
                onClick={() => onView(b.code)}
                className="font-mono2 text-[9px] tracking-[0.2em] text-gold border border-gold/40 px-3 py-2 hover:bg-gold/10 transition-all"
              >
                {s.rackView}
              </button>
              <button
                data-testid={`rack-drop-${b.code}`}
                onClick={() => onDrop(b.code)}
                aria-label={s.rackRemove}
                className="p-2 text-mist/60 hover:text-bloodglow transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        data-testid="rack-reapply"
        onClick={() => (window.location.href = "/#postuler")}
        className="mt-5 w-full font-display text-xl tracking-wider uppercase py-3 border border-gold/40 text-gold hover:bg-gold/10 transition-all"
      >
        {s.reapply}
      </button>
    </motion.div>
  );
}

const TAB_ICONS = { dossier: ShieldCheck, mer: MessageSquare, taniere: Users, etagere: Database };

export default function Suivi() {
  const { c, lang } = useLang();
  const s = c.suivi;
  const x = c.capitainerie;
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [notif, setNotif] = useState(null);
  const rack = useRack();
  const [tab, setTab] = useState("dossier");
  const [showRecover, setShowRecover] = useState(false);
  const [recRoute, setRecRoute] = useState("discord");
  const [rec, setRec] = useState({ pseudo: "", discord: "", power: "", contact: "" });
  const [recRes, setRecRes] = useState(null);
  const [recErr, setRecErr] = useState("");
  const [recBusy, setRecBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // notifications partagées via notifHub (fusion Nav+Suivi, pause tab inactif, 15s)
  const hubNotif = useRecruitNotif(result?.tracking_code);
  useEffect(() => {
    if (!result) setNotif(null);
    else setNotif(hubNotif);
  }, [result, hubNotif]);

  // dernière visite enregistrée (réengagement doux)
  const lastSeen = useLastSeen(!!result);
  const showReturnBanner = lastSeen && lastSeen.hours >= 72;

  // Cloche de navire — 1 seule fois par session et par recrue
  useBellRing(hubNotif?.unread_messages || 0, result?.tracking_code || "none");

  useEffect(() => {
    const base = "Suivre ma candidature — GOLDEN PIRATES";
    document.title = notif?.unread_messages ? `(${notif.unread_messages}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [notif?.unread_messages]);

  const saveToRack = (tcode, pseudo, status) => saveBottle(tcode, pseudo, status);
  const dropFromRack = (tcode) => removeBottle(tcode);

  const normalize = (raw) => {
    const clean = raw.trim().toUpperCase().replace(/\s+/g, "");
    // Compatibilité des anciens codes courts, tout en acceptant le nouveau suffixe sécurisé.
    if (/^[A-Z0-9]{4}$/.test(clean)) return `GP-1023-${clean}`;
    if (/^[A-Z0-9]{12}$/.test(clean)) return `GP-1023-${clean}`;
    if (/^GP1023(?:[A-Z0-9]{4}|[A-Z0-9]{12})$/.test(clean)) return `GP-1023-${clean.slice(6)}`;
    return clean;
  };

  const runCheck = async (raw) => {
    const clean = normalize(raw);
    if (!clean) {
      setError(s.empty);
      setNotFound(false);
      setResult(null);
      return;
    }
    setCode(clean);
    setChecking(true);
    setError("");
    setNotFound(false);
    try {
      const { data } = await api.get(`/applications/track/${encodeURIComponent(clean)}`);
      setResult(data);
      setTab("dossier");
      saveToRack(data.tracking_code, data.pseudo, data.status);
    } catch (err) {
      setResult(null);
      const is404 = err?.response?.status === 404;
      if (is404) removeBottle(clean); // bouteille fantôme : dossier supprimé par le Conseil
      setNotFound(is404);
      setError(is404 ? s.notFound : formatApiError(err));
    } finally {
      setChecking(false);
    }
  };

  const check = (e) => {
    e?.preventDefault();
    runCheck(code);
  };

  const reset = () => {
    setResult(null);
    setCode("");
    setError("");
    setNotFound(false);
    setTimeout(() => document.getElementById("track-code")?.focus({ preventScroll: true }), 50);
    smoothScrollTo("suivi-form");
  };

  const scrollToHub = () =>
    setTimeout(() => {
      const el = document.querySelector('[data-testid="suivi-tabs-hub"]') || document.getElementById("suivi-form");
      if (!el) return;
      smoothScrollTo(el);
    }, 250);

  const viewRackCode = (tcode) => {
    setCode(tcode);
    runCheck(tcode).then(scrollToHub);
  };

  const recover = async (e) => {
    e?.preventDefault();
    if (recBusy) return;
    const payload = recRoute === "discord"
      ? { pseudo: rec.pseudo, discord: rec.discord }
      : { pseudo: rec.pseudo, power: rec.power, contact: rec.contact };
    if (!payload.pseudo?.trim() || (!payload.discord?.trim() && (!payload.power?.trim() || !payload.contact?.trim()))) {
      setRecErr(s.recoverNeedOne);
      return;
    }
    setRecBusy(true);
    setRecErr("");
    try {
      const { data } = await api.post("/applications/recover", payload);
      setRecRes(data);
      saveToRack(data.tracking_code, data.pseudo, data.status);
    } catch (err) {
      const ecode = err?.response?.data?.detail?.code;
      if (ecode === "recover_limit") setRecErr(s.recoverLimit);
      else if (ecode === "recover_need_one") setRecErr(s.recoverNeedOne);
      else setRecErr(recRoute === "power" ? s.recoverFailPower : s.recoverFail);
    } finally {
      setRecBusy(false);
    }
  };

  const copyRecovered = () => {
    const tcode = recRes?.tracking_code;
    if (!tcode) return;
    copyText(tcode, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyCurrent = () => {
    if (!result?.tracking_code) return;
    copyText(result.tracking_code, () => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const closeRecover = () => {
    setShowRecover(false);
    setRecRes(null);
    setRecErr("");
    setRec({ pseudo: "", discord: "", power: "", contact: "" });
  };

  // Liens directs : /suivi#dossier | #mer | #taniere | #etagere → ouvre la dernière bouteille + l'onglet.
  // Sans ancre : une recrue qui revient retrouve AUTOMATIQUEMENT sa dernière bouteille.
  const routerLoc = useLocation();
  useEffect(() => {
    const h = routerLoc.hash.slice(1);
    const wanted = TAB_IDS.includes(h) ? h : null;
    if (result) {
      if (wanted) {
        setTab(wanted);
        scrollToHub();
      }
      return;
    }
    const latest = rack[0]?.code;
    if (!latest) return;
    setCode(latest);
    runCheck(latest).then(() => {
      if (wanted) {
        setTab(wanted);
        scrollToHub();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLoc.key, routerLoc.hash]);

  const locale = lang === "fr" ? "fr-FR" : "en-GB";

  const TABS = [
    { id: "dossier", label: s.tabs.dossier, badge: result?.new_status || result?.new_note ? "•" : null },
    { id: "mer", label: s.tabs.mer, badge: notif?.unread_messages > 0 ? notif.unread_messages : null },
    { id: "taniere", label: s.tabs.taniere, badge: null },
    { id: "etagere", label: s.tabs.etagere, badge: rack.length > 0 ? rack.length : null },
  ];

  const openFeature = (k) => {
    if (result) {
      setTab(k);
      scrollToHub();
    } else if (rack[0]) {
      runCheck(rack[0].code).then(() => {
        setTab(k);
        scrollToHub();
      });
    } else {
      document.getElementById("track-code")?.focus({ preventScroll: true });
      smoothScrollTo("suivi-form");
    }
  };

  const inputCls =
    "w-full bg-ink/70 border border-gold/25 px-4 py-3 font-fell text-base text-bone placeholder:text-mist/40 focus:border-gold transition-all";

  return (
    <div className="bg-ink min-h-screen flex flex-col">
      <Nav />
      <main id="main-content" className="flex-1 pt-[calc(6rem+env(safe-area-inset-top))] md:pt-[calc(7rem+env(safe-area-inset-top))] pb-24 map-grid relative overflow-hidden">
        {/* lueurs d'ambiance */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.14),transparent_65%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-80 w-[520px] h-[520px] bg-[radial-gradient(circle,rgba(11,25,44,0.9),transparent_70%)]" />

        <section data-testid="status-section" className="relative max-w-5xl mx-auto px-4 sm:px-8">
          {/* ======== EN-TÊTE : LA CAPITAINERIE ======== */}
          <div className="grid md:grid-cols-[1fr_auto] items-center gap-6 md:gap-10 pt-4 md:pt-8 mb-8 md:mb-10">
            <div className="text-center md:text-left order-2 md:order-1">
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="inline-flex items-center gap-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.3em] text-gold mb-4"
              >
                <SkullIcon className="w-3.5 h-3.5 text-blood" /> {x.eyebrow}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
                className="font-display text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-7xl text-bone uppercase mb-4"
              >
                {x.title1}
                <span className="text-gold text-glow-gold">{x.titleGold}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.16 }}
                className="font-fell italic text-base sm:text-lg text-bone/80 max-w-xl mx-auto md:mx-0"
              >
                {x.sub}
              </motion.p>
              <div className="mt-5 max-w-xl mx-auto md:mx-0" data-testid="suivi-countdown-wrap">
                <Countdown variant="line" testid="suivi-countdown" />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
              className="order-1 md:order-2 mx-auto"
            >
              <BottleArt className="w-32 h-32 sm:w-44 sm:h-44 md:w-56 md:h-56" />
            </motion.div>
          </div>

          {/* ======== LE COFFRE DU REGISTRE (formulaire du code) ======== */}
          <form
            id="suivi-form"
            data-testid="status-check-form"
            onSubmit={check}
            className="relative border border-gold/35 bg-parch/90 frame-plate p-5 sm:p-8"
          >
            <span aria-hidden="true" className="absolute -top-5 left-1/2 -translate-x-1/2 wax-seal grid place-items-center w-10 h-10">
              <KeyRound className="w-4 h-4 text-goldlight" />
            </span>
            {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((p) => (
              <span key={p} aria-hidden="true" className={`absolute ${p} w-1.5 h-1.5 rounded-full bg-gold/50`} />
            ))}
            <div className="flex items-center justify-between gap-3 mb-3 mt-2">
              <label className="font-mono2 text-[10px] tracking-[0.3em] text-gold" htmlFor="track-code">
                {x.plateTitle} — {s.codeLabel}
              </label>
              {(result || error) && (
                <button
                  type="button"
                  data-testid="reset-code-btn"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.2em] text-mist hover:text-gold transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{s.resetBtn}</span>
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/60 pointer-events-none" />
                <input
                  id="track-code"
                  data-testid="status-input-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={s.codePh}
                  maxLength={20}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  enterKeyHint="go"
                  className="w-full bg-ink/80 border border-gold/35 pl-12 pr-4 py-4 font-mono2 text-lg sm:text-xl tracking-[0.2em] text-goldlight placeholder:text-mist/40 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,175,55,0.15)] transition-all"
                />
              </div>
              <button
                type="submit"
                data-testid="status-check-btn"
                disabled={checking}
                className="plank-cut gold-ingot inline-flex items-center justify-center gap-2 font-display text-xl tracking-wider px-9 py-4 text-ink disabled:opacity-60 active:translate-y-px transition-transform"
              >
                {checking ? <Compass className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {checking ? s.checking : s.check}
              </button>
            </div>
            <p className="mt-3 font-fell italic text-sm text-mist">{x.plateHint}</p>
            {error && (
              <p data-testid="status-error" className="mt-4 font-fell text-base text-bloodhot flex items-center gap-2">
                <FileQuestion className="w-5 h-5 shrink-0" /> {error}
              </p>
            )}
            {error && notFound && <p className="mt-2 font-fell italic text-sm text-mist">{s.notFoundHint}</p>}

            {/* LA BOUTEILLE PERDUE */}
            <div className="mt-6 border-t border-gold/15 pt-5" data-testid="recover-block">
              {!showRecover ? (
                <button
                  type="button"
                  data-testid="recover-toggle-btn"
                  onClick={() => setShowRecover(true)}
                  className="group w-full flex items-center gap-3 text-left"
                >
                  <span className="grid place-items-center w-9 h-9 rounded-full border border-gold/30 text-gold shrink-0">
                    <LifeBuoy className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-mono2 text-[10px] tracking-[0.25em] text-gold">{x.lostTitle}</span>
                    <span className="block font-fell text-sm text-mist group-hover:text-bone transition-colors">{s.recoverBtn}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gold/60 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : !recRes ? (
                <div data-testid="recover-form" className="space-y-3">
                  <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4" /> {s.recoverTitle}
                  </p>
                  <p className="font-fell italic text-sm text-mist">{s.recoverHint}</p>
                  <div className="flex flex-wrap gap-2" data-testid="recover-routes">
                    {[
                      ["discord", "recover-route-discord", s.recoverRouteDiscord],
                      ["power", "recover-route-power", s.recoverRoutePower],
                    ].map(([k, tid, label]) => (
                      <button
                        key={k}
                        type="button"
                        data-testid={tid}
                        onClick={() => setRecRoute(k)}
                        className={`font-mono2 text-[9px] tracking-[0.25em] px-3.5 py-2.5 border transition-all ${
                          recRoute === k ? "border-gold text-gold bg-gold/10" : "border-gold/20 text-mist hover:border-gold/50 hover:text-gold"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      id="recover-pseudo"
                      data-testid="recover-input-pseudo"
                      value={rec.pseudo}
                      onChange={(e) => setRec({ ...rec, pseudo: e.target.value })}
                      placeholder={s.recoverPseudo}
                      aria-label={s.recoverPseudo}
                      className={inputCls}
                    />
                    {recRoute === "discord" ? (
                      <input
                        id="recover-discord"
                        data-testid="recover-input-discord"
                        value={rec.discord}
                        onChange={(e) => setRec({ ...rec, discord: e.target.value })}
                        placeholder={s.recoverDiscord}
                        aria-label={s.recoverDiscord}
                        className={inputCls}
                      />
                    ) : (
                      <>
                        <input
                          id="recover-power"
                          data-testid="recover-input-power"
                          value={rec.power}
                          onChange={(e) => setRec({ ...rec, power: e.target.value })}
                          placeholder={s.recoverPowerPh}
                          aria-label={s.recoverPowerPh}
                          className={inputCls}
                        />
                        <input
                          id="recover-contact"
                          data-testid="recover-input-contact"
                          value={rec.contact}
                          onChange={(e) => setRec({ ...rec, contact: e.target.value })}
                          placeholder={s.recoverContact}
                          aria-label={s.recoverContact}
                          className={inputCls}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={recover}
                      data-testid="recover-submit-btn"
                      disabled={recBusy}
                      className="inline-flex items-center justify-center gap-2 font-mono2 text-[11px] tracking-[0.25em] px-6 py-3 bg-gold text-ink disabled:opacity-60 transition-all duration-300"
                    >
                      <Search className="w-4 h-4" />
                      {recBusy ? s.recoverSearching : s.recoverSubmit}
                    </button>
                    <button
                      type="button"
                      data-testid="recover-close-btn"
                      onClick={closeRecover}
                      className="inline-flex items-center justify-center gap-2 font-mono2 text-[11px] tracking-[0.25em] px-6 py-3 border border-mist/40 text-mist hover:text-gold hover:border-gold/60 transition-all duration-300"
                    >
                      <X className="w-4 h-4" /> {s.resetBtn}
                    </button>
                  </div>
                  {recErr && (
                    <p data-testid="recover-error" className="font-fell text-sm text-bloodhot flex items-start gap-2">
                      <FileQuestion className="w-4 h-4 mt-0.5 shrink-0" /> {recErr}
                    </p>
                  )}
                </div>
              ) : (
                <div data-testid="recover-success" className="space-y-3">
                  <p className="font-fell text-base text-bone/90">{s.recoverSuccess(recRes.tracking_code)}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <code className="font-mono2 text-2xl tracking-[0.25em] text-gold">{recRes.tracking_code}</code>
                    <button
                      type="button"
                      data-testid="recover-copy-btn"
                      onClick={copyRecovered}
                      className="inline-flex items-center gap-1.5 font-mono2 text-[10px] tracking-[0.25em] text-mist hover:text-gold transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? "✓✓" : s.recoverCopy}
                    </button>
                    <button
                      type="button"
                      data-testid="recover-view-btn"
                      onClick={() => {
                        const tcode = recRes.tracking_code;
                        closeRecover();
                        viewRackCode(tcode);
                      }}
                      className="inline-flex items-center gap-1.5 font-mono2 text-[10px] tracking-[0.25em] text-gold border border-gold/40 px-4 py-2 hover:bg-gold/10 transition-all"
                    >
                      <ScrollText className="w-4 h-4" /> {s.recoverSee}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* ======== LA CORNE DU GUET (notifications) ======== */}
          {showReturnBanner && (
            <motion.div
              data-testid="return-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mt-8 border border-gold/35 bg-[#121a26]/85 p-5 sm:p-6 shadow-[0_0_40px_-14px_rgba(212,175,55,0.4)]"
            >
              <p className="flex items-center gap-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.35em] text-gold mb-3">
                <AnchorIcon className="w-4 h-4" />
                {c.notif.returnTitle}
              </p>
              <p
                data-testid="return-banner-body"
                className="font-fell italic text-base sm:text-lg text-bone/85 leading-relaxed"
              >
                {lastSeen.days >= 30 ? c.notif.returnBodyLong : c.notif.returnBody(Math.floor(lastSeen.days))}
              </p>
            </motion.div>
          )}

          {notif && (notif.unread_messages > 0 || notif.new_status || notif.new_note) && (
            <motion.div
              data-testid="notif-panel"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-8 border border-blood/50 bg-[#1a0606]/90 p-5 sm:p-6 shadow-[0_0_40px_-10px_rgba(185,28,28,0.5)]"
            >
              <p className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.35em] text-bloodglow mb-4">
                <Bell className="w-4 h-4 animate-pulse" />
                {c.notif.title}
                <span data-testid="notif-count" className="ml-auto bg-blood text-bone font-mono2 text-[9px] tracking-[0.2em] px-2 py-1">
                  {(notif.unread_messages > 0 ? 1 : 0) + (notif.new_status ? 1 : 0) + (notif.new_note ? 1 : 0)}
                </span>
              </p>
              <ul className="space-y-3">
                {notif.unread_messages > 0 && (
                  <li data-testid="notif-item-messages" className="font-fell text-base text-bone/90 flex flex-wrap items-center gap-2.5">
                    <ScrollText className="w-4 h-4 text-gold shrink-0" />
                    {c.notif.newMsgs(notif.unread_messages)}
                    <button
                      data-testid="notif-goto-mer"
                      onClick={() => {
                        setTab("mer");
                        scrollToHub();
                      }}
                      className="font-mono2 text-[9px] tracking-[0.25em] border border-gold/50 text-gold px-3 py-2 hover:bg-gold/10 transition-all"
                    >
                      {s.tabs.mer}
                    </button>
                  </li>
                )}
                {notif.new_status && (
                  <li data-testid="notif-item-status" className="font-fell text-base text-bone/90 flex flex-wrap items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-gold shrink-0" />
                    {c.notif.statusChanged}
                    <button
                      data-testid="notif-update-btn"
                      onClick={() => {
                        runCheck(result.tracking_code);
                        setTab("dossier");
                      }}
                      className="font-mono2 text-[9px] tracking-[0.25em] border border-gold/50 text-gold px-3 py-2 hover:bg-gold/10 transition-all"
                    >
                      {c.notif.updateBtn}
                    </button>
                  </li>
                )}
                {notif.new_note && (
                  <li data-testid="notif-item-note" className="font-fell text-base text-bone/90 flex items-center gap-2.5">
                    <AnchorIcon className="w-4 h-4 text-gold shrink-0" />
                    {c.notif.noteChanged}
                  </li>
                )}
              </ul>
            </motion.div>
          )}

          {/* ======== LE PONT DE LA RECRUE (dossier ouvert) ======== */}
          <AnimatePresence>
            {result && (
              <motion.div
                data-testid="suivi-tabs-hub"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mt-10"
              >
                {/* carte d'identité du marin */}
                <div data-testid="recruit-identity" className="relative border border-gold/30 bg-deck/90 frame-plate p-5 sm:p-7 mb-6 overflow-hidden">
                  <div aria-hidden="true" className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.14),transparent_70%)]" />
                  <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="brass-porthole grid place-items-center w-16 h-16 shrink-0 bg-ink">
                        <span className="font-display text-3xl text-gold">{(result.pseudo || "?").slice(0, 1).toUpperCase()}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono2 text-[9px] tracking-[0.3em] text-mist">{x.logbook}</p>
                        <p data-testid="recruit-pseudo" className="font-display text-3xl sm:text-4xl text-bone leading-tight truncate">{result.pseudo}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-mono2 text-xs tracking-[0.2em] text-gold">{result.tracking_code}</span>
                          <button
                            type="button"
                            data-testid="copy-code-btn"
                            onClick={copyCurrent}
                            className="inline-flex items-center gap-1 font-mono2 text-[9px] tracking-[0.2em] text-mist hover:text-gold border border-gold/20 px-2 py-1 transition-colors"
                          >
                            {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {codeCopied ? x.copied : x.copy}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center gap-2 sm:items-end">
                      <span
                        data-testid="status-stamp"
                        className={`inline-flex flex-col items-center justify-center px-4 py-2 border-2 border-double rotate-[-4deg] font-display text-xl sm:text-2xl uppercase tracking-wider ${
                          STAMP[result.status] || STAMP.pending
                        }`}
                      >
                        <span className="font-mono2 text-[8px] tracking-[0.3em] opacity-80">{x.stamp}</span>
                        {c.status[result.status]?.label || c.status.pending.label}
                      </span>
                      {result.new_status && (
                        <span data-testid="status-new-chip" className="bg-blood text-bone font-mono2 text-[9px] tracking-[0.25em] px-2 py-1">
                          {c.notif.newChip}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <VoyageTrack status={result.status} x={x} />

                {/* les pavillons (onglets) */}
                <div
                  role="tablist"
                  aria-label={s.tabs.aria}
                  data-testid="suivi-tablist"
                  className="sticky top-16 md:top-20 z-30 mt-6 grid grid-cols-4 gap-1.5 sm:gap-2 bg-ink/95 md:backdrop-blur py-2 border-b border-gold/20"
                >
                  {TABS.map((t) => {
                    const Icon = TAB_ICONS[t.id];
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={active}
                        data-testid={`tab-${t.id}`}
                        onClick={() => setTab(t.id)}
                        className={`relative flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 min-h-[56px] px-1 sm:px-3 py-2 border transition-all duration-300 ${
                          active
                            ? "border-gold bg-gold/[0.12] text-gold shadow-[0_0_20px_-6px_rgba(212,175,55,0.6)]"
                            : "border-gold/15 bg-deck/70 text-mist hover:text-gold hover:border-gold/45"
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="hidden lg:inline font-mono2 text-[10px] tracking-[0.2em] whitespace-nowrap">{t.label}</span>
                        <span className="lg:hidden font-mono2 text-[8px] min-[400px]:text-[9px] tracking-[0.12em] whitespace-nowrap">
                          {t.label.split(" ")[0]}
                        </span>
                        {t.badge && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center bg-blood text-bone font-mono2 text-[9px] rounded-full ring-1 ring-gold/60">
                            {t.badge}
                          </span>
                        )}
                        {active && <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-gold" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8" data-testid={`panel-${tab}`}>
                  {tab === "dossier" && (
                    <div className="space-y-6">
                      <motion.div
                        data-testid="status-result-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="border border-gold/25 bg-deck/80 frame-plate p-5 sm:p-8"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                          <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> {s.tabs.dossier}
                          </p>
                          <StatusBadge status={result.status} size="lg" />
                        </div>
                        <div className="border-t border-gold/15 pt-5 space-y-5">
                          <p className="font-fell text-lg text-bone/90 leading-relaxed">{c.status[result.status]?.long || c.status.pending.long}</p>
                          {result.status === "pending" && (
                            <p data-testid="status-wait-note" className="font-mono2 text-[9px] tracking-[0.25em] text-gold border border-gold/25 bg-gold/5 px-3 py-2 inline-block">
                              {s.waitNote}
                            </p>
                          )}
                          {result.status === "accepted" && (
                            <div data-testid="status-discord-cta" className="border border-emerald-500/40 bg-emerald-500/5 p-5">
                              <p className="font-mono2 text-[9px] tracking-[0.3em] text-emerald-400 mb-2">{s.discordCta.eyebrow}</p>
                              <p className="font-fell text-lg text-bone/90 mb-4">{s.discordCta.title}</p>
                              <a
                                href={DISCORD_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid="status-discord-link"
                                className="inline-flex items-center gap-3 font-display text-xl tracking-wider px-6 py-3 bg-gold text-ink transition-all"
                              >
                                <AnchorIcon className="w-5 h-5" /> {s.discordCta.btn}
                              </a>
                              <p data-testid="status-discord-no-access" className="mt-3 flex items-start gap-2 font-mono2 text-[9px] tracking-[0.2em] text-emerald-300/70 leading-relaxed">
                                <LifeBuoy className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{s.discordCta.noAccess}</span>
                              </p>
                            </div>
                          )}

                          {result.note ? (
                            <div className="relative border border-gold/30 bg-[#1b1608]/80 p-5 pl-16">
                              <span className="absolute left-4 top-5 wax-seal grid place-items-center w-9 h-9">
                                <Feather className="w-4 h-4 text-goldlight" />
                              </span>
                              <p className="font-mono2 text-[9px] tracking-[0.3em] text-gold mb-1">
                                {c.status.note}
                                {result.new_note && (
                                  <span data-testid="note-new-chip" className="ml-2 bg-blood text-bone font-mono2 text-[9px] tracking-[0.25em] px-2 py-0.5">
                                    {c.notif.newChip}
                                  </span>
                                )}
                              </p>
                              <p className="font-fell italic text-lg text-goldlight">{result.note}</p>
                            </div>
                          ) : null}

                          <div data-testid="status-dossier" className="border border-gold/20 bg-ink/50 p-5">
                            <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-4">{s.dossierTitle}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {[
                                [s.fields.pseudo, result.pseudo],
                                [s.fields.power, result.power],
                                [s.fields.troops, result.troops],
                                [s.fields.activity, result.activity],
                                [s.fields.discord, result.discord || result.contact],
                              ].map(([label, value]) => (
                                <div key={label} className="border-l border-gold/20 pl-3">
                                  <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{label}</p>
                                  <p className="font-fell text-base text-bone/90 break-words">{value || "—"}</p>
                                </div>
                              ))}
                            </div>
                            {result.experience ? (
                              <div className="mt-5">
                                <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{s.fields.experience}</p>
                                <p className="font-fell text-base text-bone/85 whitespace-pre-wrap break-words">{result.experience}</p>
                              </div>
                            ) : null}
                            <div className="mt-4">
                              <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist mb-1">{s.fields.message}</p>
                              <p className="font-fell text-base text-bone/85 whitespace-pre-wrap break-words">{result.message}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-8 gap-y-2 pt-1 font-mono2 text-[10px] tracking-[0.2em] text-mist">
                            <span>
                              {c.status.code}
                              <span className="text-gold">{result.tracking_code}</span>
                            </span>
                            {result.created_at ? (
                              <span>
                                {c.status.filedOn}
                                <span className="text-bone/80">
                                  {new Date(result.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>

                      {result.status === "rejected" &&
                        (() => {
                          const locked = !!result.reapply_at && new Date(result.reapply_at) > new Date();
                          return (
                            <motion.div
                              data-testid="reapply-block"
                              initial={{ opacity: 0, y: 24 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, ease: EASE }}
                              className="border border-amber-500/40 bg-amber-500/5 p-6 text-center"
                            >
                              <p className="font-fell italic text-base text-bone/80 mb-4">
                                {locked
                                  ? s.reapplyLocked(new Date(result.reapply_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }))
                                  : s.reapplyHint}
                              </p>
                              {locked ? (
                                <span data-testid="reapply-locked-chip" className="inline-block font-mono2 text-[10px] tracking-[0.25em] text-amber-400 border border-amber-500/50 bg-amber-500/10 px-4 py-2">
                                  {s.reapplyLockedLabel}
                                </span>
                              ) : (
                                <button
                                  data-testid="reapply-btn"
                                  onClick={() => navigate("/#postuler")}
                                  className="font-display text-xl tracking-wider uppercase px-8 py-3 bg-gold text-ink transition-all duration-300"
                                >
                                  {s.reapply}
                                </button>
                              )}
                            </motion.div>
                          );
                        })()}
                    </div>
                  )}

                  {tab === "mer" && (
                    <motion.div data-testid="chat-tab-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                      <ChatBox code={result.tracking_code} sender="recruit" testPrefix="chat" peerName={result.pseudo} />
                    </motion.div>
                  )}

                  {tab === "taniere" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                      <PeerDen code={result.tracking_code} myName={result.pseudo} initialNote={result.peer_note || ""} />
                    </motion.div>
                  )}

                  {tab === "etagere" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                      {rack.length > 0 ? (
                        <RackBlock rack={rack} onView={viewRackCode} onDrop={dropFromRack} s={s} c={c} current={result.tracking_code} />
                      ) : (
                        <div data-testid="rack-empty" className="border border-gold/20 bg-deck/60 p-8 text-center">
                          <AnchorIcon className="w-6 h-6 text-gold/60 mx-auto mb-3" />
                          <p className="font-fell italic text-base text-bone/75">{s.rackEmpty}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ======== SANS DOSSIER OUVERT : étagère + ce qui attend + pas de code ======== */}
          {!result && (
            <>
              {rack.length > 0 && (
                <div className="mt-8">
                  <RackBlock rack={rack} onView={viewRackCode} onDrop={dropFromRack} s={s} c={c} />
                </div>
              )}

              <div className="mt-12" data-testid="suivi-inside">
                <p className="text-center font-mono2 text-[10px] tracking-[0.35em] text-gold mb-6 flex items-center justify-center gap-3">
                  <span className="h-px w-10 bg-gold/40" /> {x.insideTitle} <span className="h-px w-10 bg-gold/40" />
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {x.inside.map((f, i) => {
                    const Icon = TAB_ICONS[f.k];
                    return (
                      <motion.button
                        key={f.k}
                        type="button"
                        data-testid={`suivi-inside-${f.k}`}
                        onClick={() => openFeature(f.k)}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
                        className="group relative text-left border border-gold/20 bg-deck/80 p-4 sm:p-5 card-glow hover:border-gold/60 hover:-translate-y-1 transition-all duration-300"
                      >
                        <span className="absolute top-3 right-4 font-decor text-xs text-gold/40">{["I", "II", "III", "IV"][i]}</span>
                        <span className="wax-seal grid place-items-center w-11 h-11 mb-4 group-hover:rotate-[-10deg] transition-transform duration-500">
                          <Icon className="w-5 h-5 text-goldlight" />
                        </span>
                        <span className="block font-display text-lg sm:text-xl text-bone leading-tight mb-1.5">{f.t}</span>
                        <span className="block font-fell text-sm text-bone/65 leading-snug">{f.d}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {rack.length === 0 && (
                <motion.div
                  data-testid="suivi-no-code"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="mt-8 relative overflow-hidden border border-blood/40 bg-[#160707]/90 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
                >
                  <span className="wax-seal grid place-items-center w-14 h-14 shrink-0">
                    <Swords className="w-6 h-6 text-goldlight" />
                  </span>
                  <div className="flex-1">
                    <p className="font-mono2 text-[10px] tracking-[0.3em] text-bloodglow mb-1">{x.noCodeTitle}</p>
                    <p className="font-fell text-lg text-bone/85">{x.noCodeText}</p>
                  </div>
                  <button
                    type="button"
                    data-testid="suivi-goto-apply"
                    onClick={() => navigate("/#postuler")}
                    className="plank-cut gold-ingot inline-flex items-center gap-2 font-display text-lg tracking-wider uppercase px-7 py-3 text-ink shrink-0"
                  >
                    <Feather className="w-4 h-4" /> {x.noCodeBtn}
                  </button>
                </motion.div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
