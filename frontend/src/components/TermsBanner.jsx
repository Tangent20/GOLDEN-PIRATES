import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, X, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { CONDITIONS_VERSION } from "@/lib/conditionsCopy";

/*
 * BANDEAU « CONDITIONS MISES À JOUR » — promesse de l'article « Modification des conditions ».
 * Affiché une seule fois par version (clé gp_terms_seen = version), jamais sur /conditions
 * (la lecture vaut prise de connaissance), fermeture par la croix ou par le lien « Lire ».
 */
const SEEN_KEY = "gp_terms_seen";
const EASE = [0.16, 1, 0.3, 1];

const readSeen = () => {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
};
const markSeen = () => {
  try { localStorage.setItem(SEEN_KEY, CONDITIONS_VERSION); } catch {}
};

export const TermsBanner = () => {
  const { c } = useLang();
  const t = c.termsBanner;
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/conditions")) {
      // Lire la page vaut prise de connaissance : plus de rappel ensuite.
      markSeen();
      setOpen(false);
      return;
    }
    if (readSeen() === CONDITIONS_VERSION) return;
    const id = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(id);
  }, [pathname]);

  const dismiss = () => { markSeen(); setOpen(false); };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="status"
          aria-live="polite"
          data-testid="terms-update-banner"
          data-version={CONDITIONS_VERSION}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="fixed inset-x-0 bottom-0 z-[90] px-3 sm:px-5 pb-safe pointer-events-none"
        >
          <div className="mx-auto mb-3 max-w-3xl pointer-events-auto border border-gold/40 bg-ink/92 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(212,175,55,0.12)]">
            <div className="flex items-center gap-3 px-3.5 sm:px-5 py-2.5 sm:py-3">
              <span className="shrink-0 w-9 h-9 brass-porthole bg-ink flex items-center justify-center" aria-hidden="true">
                <ScrollText className="w-4 h-4 text-gold" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono2 text-[9px] sm:text-[10px] tracking-[0.22em] text-goldlight leading-snug">
                  {t.title(CONDITIONS_VERSION)}
                </p>
                <p className="font-fell text-[13px] sm:text-sm text-bone/80 leading-snug truncate sm:whitespace-normal">{t.text}</p>
              </div>
              <Link
                to="/conditions"
                onClick={dismiss}
                data-testid="terms-update-banner-link"
                className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3 sm:px-4 border border-gold/50 text-gold hover:bg-gold/10 font-mono2 text-[9px] sm:text-[10px] tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                {t.read} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={dismiss}
                data-testid="terms-update-banner-close"
                aria-label={t.close}
                className="shrink-0 w-10 h-10 -mr-1 flex items-center justify-center text-mist hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default TermsBanner;
