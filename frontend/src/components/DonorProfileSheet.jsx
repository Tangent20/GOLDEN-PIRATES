// GOLDEN PIRATES — Fiche publique d'un donateur
// Ouvre une feuille modale au clic sur un item du Hall des donateurs.
// Affiche : avatar sceau, pseudo, résumé (total + nombre + fenêtre temporelle),
// chronologie des dons, et — si le donateur est aussi un membre d'équipage accepté —
// quelques stats de jeu publiques (troupes, puissance, expérience) pour prouver
// qu'il s'agit d'un vrai joueur, pas d'un faux. Compatible desktop/mobile/iOS.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Coins,
  Flame,
  Hourglass,
  Trophy,
  Sword,
  Clock,
  Skull,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Anchor,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1];

const fmtAmt = (n) =>
  Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso, lang = "fr") => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
};

const EXP_LABEL = {
  fr: {
    rookie: "Nouveau marin",
    confirmed: "Marin confirmé",
    veteran: "Vieux loup de mer",
    captain: "Capitaine",
  },
  en: {
    rookie: "Rookie sailor",
    confirmed: "Confirmed sailor",
    veteran: "Old sea wolf",
    captain: "Captain",
  },
};

const TROOP_LABEL = {
  fr: { CAVALERIE: "Cavalerie", INFANTERIE: "Infanterie", ARCHER: "Archer", MARCHAND: "Marchand" },
  en: { CAVALERIE: "Cavalry", INFANTERIE: "Infantry", ARCHER: "Archer", MARCHAND: "Merchant" },
};

export default function DonorProfileSheet({ open, pseudo, onClose, lang = "fr", t }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Bloque le scroll de la page quand la feuille est ouverte
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !pseudo) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    api
      .get(`/donators/profile/${encodeURIComponent(pseudo)}`)
      .then(({ data }) => {
        if (!cancelled) setData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setError(t?.anonLocked || "Profil masqué par le donateur.");
        } else {
          setError(t?.profile?.loadErr || formatApiError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, pseudo, t]);

  // Fermeture via ESC
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const p = t?.profile || {};

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="donor-sheet-root"
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          data-testid="donor-profile-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={pseudo || "Profil donateur"}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet / Dialog */}
          <motion.div
            className="relative w-full sm:max-w-xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto bg-deck border-t sm:border border-gold/40 shadow-2xl shadow-black/60 sm:rounded-sm"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gold/25 bg-deck/95 backdrop-blur px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="wax-seal w-10 h-10 shrink-0 grid place-items-center font-display text-base text-goldlight">
                  {(data?.pseudo || pseudo || "?").trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg sm:text-xl text-bone truncate" data-testid="donor-profile-pseudo">
                    {data?.pseudo || pseudo}
                  </p>
                  <p className="font-mono2 text-[9px] tracking-[0.22em] text-gold/80 truncate">
                    {data?.recruit ? p.crewBadge : p.guestBadge}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={p.close}
                data-testid="donor-profile-close"
                className="shrink-0 inline-flex w-11 h-11 items-center justify-center text-mist hover:text-gold hover:bg-ink/40 transition-colors rounded-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 sm:py-6 space-y-6">
              {loading && (
                <div className="flex items-center justify-center py-10 text-mist" data-testid="donor-profile-loading">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}

              {!loading && error && (
                <div
                  className="flex items-start gap-3 border border-gold/25 bg-ink/40 p-4"
                  data-testid="donor-profile-error"
                >
                  <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                  <p className="font-fell italic text-base text-bone/90">{error}</p>
                </div>
              )}

              {!loading && !error && data && (
                <>
                  {/* Résumé — totaux */}
                  <section>
                    <h3 className="font-mono2 text-[10px] tracking-[0.3em] text-gold/80 mb-3">{p.summary}</h3>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <StatCard
                        icon={Coins}
                        label={p.total}
                        value={`${fmtAmt(data.total)} €`}
                        testid="donor-profile-total"
                      />
                      <StatCard
                        icon={Trophy}
                        label={p.count}
                        value={String(data.count)}
                        testid="donor-profile-count"
                      />
                      <StatCard
                        icon={Hourglass}
                        label={p.firstSeen}
                        value={fmtDate(data.first_at, lang)}
                        testid="donor-profile-first"
                      />
                      <StatCard
                        icon={Clock}
                        label={p.lastSeen}
                        value={fmtDate(data.last_at, lang)}
                        testid="donor-profile-last"
                      />
                    </div>
                  </section>

                  {/* Bloc Recrue — stats de jeu publiques */}
                  {data.recruit && (
                    <section
                      className="border border-gold/35 bg-ink/40 p-4 sm:p-5"
                      data-testid="donor-profile-crew"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-gold" />
                        <h3 className="font-mono2 text-[10px] tracking-[0.3em] text-gold">{p.recruitTitle}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.recruit.troops && (
                          <KeyVal
                            icon={Sword}
                            label={p.troops}
                            value={TROOP_LABEL[lang]?.[data.recruit.troops] || data.recruit.troops}
                          />
                        )}
                        {data.recruit.troop_level != null && (
                          <KeyVal icon={Trophy} label={p.level} value={`T${data.recruit.troop_level}`} />
                        )}
                        {data.recruit.power && (
                          <KeyVal icon={Flame} label={p.power} value={data.recruit.power} />
                        )}
                        {data.recruit.experience && (
                          <KeyVal
                            icon={Anchor}
                            label={p.experience}
                            value={EXP_LABEL[lang]?.[data.recruit.experience] || data.recruit.experience}
                          />
                        )}
                        {data.recruit.activity != null && (
                          <KeyVal
                            icon={Hourglass}
                            label={p.activity}
                            value={`${data.recruit.activity} h/${lang === "en" ? "day" : "jour"}`}
                          />
                        )}
                        {data.recruit.joined_at && (
                          <KeyVal
                            icon={Clock}
                            label={p.joined}
                            value={fmtDate(data.recruit.joined_at, lang)}
                          />
                        )}
                      </div>
                    </section>
                  )}

                  {/* Bloc Visiteur — pas de candidature → on explique quand même */}
                  {!data.recruit && (
                    <section
                      className="border border-gold/25 bg-ink/30 p-4 sm:p-5"
                      data-testid="donor-profile-guest"
                    >
                      <div className="flex items-start gap-3">
                        <Skull className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                        <p className="font-fell italic text-base text-bone/85 leading-relaxed">{p.guestNote}</p>
                      </div>
                    </section>
                  )}

                  {/* Chronologie des bordereaux */}
                  <section>
                    <h3 className="font-mono2 text-[10px] tracking-[0.3em] text-gold/80 mb-3">{p.gifts}</h3>
                    {data.gifts && data.gifts.length > 0 ? (
                      <ul className="space-y-2.5" data-testid="donor-profile-gifts">
                        {data.gifts.map((g, i) => (
                          <li
                            key={i}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border border-gold/25 bg-deck/80 px-4 py-3"
                            data-testid="donor-profile-gift"
                          >
                            <div className="flex items-center gap-3 sm:min-w-[180px]">
                              <Coins className="w-4 h-4 text-gold shrink-0" />
                              <span className="font-display text-lg text-gold">{fmtAmt(g.amount)} €</span>
                              <span className="font-mono2 text-[9px] tracking-[0.18em] text-mist">
                                {fmtDate(g.created_at, lang)}
                              </span>
                            </div>
                            {g.message && (
                              <p className="font-fell italic text-sm text-bone/80 flex-1 break-words">
                                « {g.message} »
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="font-fell italic text-sm text-mist">{p.noGifts}</p>
                    )}
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCard({ icon: Icon, label, value, testid }) {
  return (
    <div className="border border-gold/25 bg-ink/40 px-3 py-3 min-h-[72px] flex flex-col gap-1.5" data-testid={testid}>
      <div className="flex items-center gap-1.5 text-gold/80">
        <Icon className="w-3.5 h-3.5" />
        <span className="font-mono2 text-[9px] tracking-[0.22em]">{label}</span>
      </div>
      <span className="font-display text-base sm:text-lg text-bone break-words">{value}</span>
    </div>
  );
}

function KeyVal({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-gold shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-mono2 text-[9px] tracking-[0.22em] text-gold/80">{label}</p>
        <p className="font-fell text-base text-bone break-words">{value}</p>
      </div>
    </div>
  );
}
