import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Coins,
  Anchor,
  Telescope,
  ScrollText,
  MessagesSquare,
  Users,
  LogOut,
  Skull,
  ChevronRight,
  BookOpen,
  Map as MapIcon,
  Feather,
  Landmark,
  Globe,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import LogoMark, { SkullIcon } from "./LogoMark";
import { ShipWheel, HangingPennant, CrossedSabres } from "./NavIcons";
import useRole from "@/lib/role";
import api from "@/lib/api";
import { useRecruitNotif, useAdminNotif, readLastSeen } from "@/lib/notifHub";
import { scrollToId } from "@/App";
import { useLang } from "@/lib/i18n";
import { scrollToTop, lockScroll, unlockScroll } from "@/lib/scroll";

const EASE = [0.16, 1, 0.3, 1];

// LES ROUTES PUBLIQUES DU NAVIRE — sections de l'accueil.
const ROUTES = [
  { id: "alliance", key: "alliance", num: "I", tid: "manifesto", icon: Anchor },
  { id: "code", key: "code", num: "II", tid: "code", icon: BookOpen },
  { id: "recit", key: "recit", num: "III", tid: "timeline", icon: MapIcon },
  { id: "processus", key: "processus", num: "IV", tid: "process", icon: Feather },
];
const SPY_IDS = ["alliance", "code", "recit", "processus", "postuler"];

function Badge({ n, tid, className = "" }) {
  if (!n) return null;
  return (
    <span
      data-testid={tid}
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-blood text-bone font-mono2 text-[9px] leading-none rounded-full ring-1 ring-gold/60 shadow-[0_0_10px_rgba(185,28,28,0.6)] ${className}`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

// ---------- BARRE DESKTOP : un onglet du pont ----------
function DeckLink({ active, onClick, num, label, icon: Icon, badge, tid, title }) {
  return (
    <button
      type="button"
      data-testid={tid}
      onClick={onClick}
      title={title}
      aria-current={active ? "page" : undefined}
      className="group relative h-20 flex items-center gap-1.5 px-2.5 2xl:px-3.5 focus-visible:outline-none"
    >
      {num ? (
        <span className={`font-decor text-[10px] transition-colors duration-300 ${active ? "text-gold" : "text-gold/40 group-hover:text-gold"}`}>
          {num}.
        </span>
      ) : Icon ? (
        <Icon className={`w-4 h-4 transition-colors duration-300 ${active ? "text-gold" : "text-gold/60 group-hover:text-gold"}`} />
      ) : null}
      <span
        className={`font-fell text-[15px] 2xl:text-[17px] whitespace-nowrap transition-colors duration-300 ${
          active ? "text-gold text-glow-gold" : "text-bone/85 group-hover:text-goldlight"
        }`}
      >
        {label}
      </span>
      <Badge n={badge} tid={`${tid}-badge`} />
      {/* trait de sabre au survol */}
      <span
        aria-hidden="true"
        className="absolute left-2 right-2 bottom-[22px] h-px origin-center scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 bg-gradient-to-r from-transparent via-gold to-transparent transition-transform duration-500"
      />
      {active && (
        <motion.span
          layoutId="deck-pennant"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute left-1/2 -translate-x-1/2 top-[76px] pointer-events-none"
          aria-hidden="true"
        >
          <HangingPennant className="w-[18px] h-[25px] drop-shadow-[0_6px_10px_rgba(0,0,0,0.7)] pennant-sway" />
        </motion.span>
      )}
    </button>
  );
}

// ---------- LE PAVILLON (rôle) ----------
const ROLE_STYLE = {
  visitor: { flag: "bg-[#0B192C] text-goldlight border-gold/40", icon: Anchor },
  recruit: { flag: "bg-[#0E3B2C] text-emerald-200 border-emerald-400/50", icon: Telescope },
  council: { flag: "bg-[#5C0A0A] text-goldlight border-gold/60", icon: Skull },
};

function RoleFlag({ role, label, tid = "nav-role-flag" }) {
  const st = ROLE_STYLE[role];
  const Icon = st.icon;
  return (
    <span
      data-testid={tid}
      data-role={role}
      className={`flag-cut inline-flex items-center gap-1.5 pl-2.5 pr-5 py-1.5 border-y border-l font-mono2 text-[9px] tracking-[0.28em] whitespace-nowrap ${st.flag}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

// ---------- LE BOUTON D'OR (CTA principal du rôle) ----------
function GoldPlank({ onClick, tid, children, badge, ariaLabel }) {
  return (
    <span className="relative inline-flex transition-[filter] duration-300 hover:drop-shadow-[0_0_16px_rgba(212,175,55,0.55)]">
      <button
        type="button"
        data-testid={tid}
        onClick={onClick}
        aria-label={ariaLabel}
        className="plank-cut gold-ingot inline-flex items-center gap-2 h-10 md:h-11 px-4 md:px-6 font-display text-[15px] md:text-lg tracking-wider uppercase text-ink whitespace-nowrap active:translate-y-px transition-transform"
      >
        {children}
      </button>
      {badge ? <Badge n={badge} tid={`${tid}-badge`} className="absolute -top-1.5 -right-1.5" /> : null}
    </span>
  );
}

// ---------- LA CARTE (tiroir) : une ligne d'action ----------
function MapAction({ icon: Icon, label, sub, onClick, tid, primary, danger, badge, here, hereLabel, delay = 0 }) {
  const base = primary
    ? "gold-ingot text-ink border-gold"
    : danger
      ? "bg-[#2A0808]/80 text-bone border-blood/60 hover:border-bloodglow hover:bg-[#3A0B0B]"
      : here
        ? "bg-gold/10 text-gold border-gold"
        : "bg-ink/60 text-bone border-gold/25 hover:border-gold/70 hover:bg-gold/[0.06]";
  return (
    <motion.button
      type="button"
      data-testid={tid}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
      onClick={onClick}
      aria-current={here ? "page" : undefined}
      className={`group w-full flex items-center gap-3.5 text-left border px-4 py-3.5 min-h-[60px] transition-colors duration-200 ${base}`}
    >
      <span
        className={`shrink-0 w-9 h-9 grid place-items-center rounded-full border ${
          primary ? "border-ink/30 bg-ink/10" : danger ? "border-blood/60 text-bloodglow" : "border-gold/40 text-gold"
        }`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-display text-lg leading-tight tracking-wide uppercase ${primary ? "text-ink" : ""}`}>
          {label}
        </span>
        {sub && (
          <span className={`block font-fell italic text-[13px] leading-snug mt-0.5 truncate ${primary ? "text-ink/75" : "text-mist"}`}>
            {here ? `— ${hereLabel}` : sub}
          </span>
        )}
      </span>
      <Badge n={badge} tid={`${tid}-badge`} />
      <ChevronRight
        className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${primary ? "text-ink/70" : "text-gold/60"}`}
      />
    </motion.button>
  );
}

function LangToggle({ big = false }) {
  const { lang, setLang } = useLang();
  return (
    <div
      data-testid={big ? "drawer-lang-switcher" : "lang-switcher"}
      role="group"
      aria-label="Language"
      className={`inline-flex items-center border border-gold/40 bg-ink/70 ${big ? "p-1" : "p-0.5"}`}
    >
      {["fr", "en"].map((l) => (
        <button
          key={l}
          type="button"
          data-testid={`${big ? "drawer-" : ""}lang-switch-${l}`}
          aria-pressed={lang === l}
          aria-label={l === "fr" ? "Passer en français" : "Switch to English"}
          onClick={() => setLang(l)}
          className={`font-mono2 tracking-[0.2em] transition-all duration-300 ${
            big ? "px-4 py-2.5 text-[11px]" : "px-2 py-1.5 text-[10px]"
          } ${lang === l ? "gold-ingot text-ink" : "text-bone/60 hover:text-gold"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [spy, setSpy] = useState(null);
  const [adminView, setAdminView] = useState(() => (typeof window !== "undefined" && window.__gpAdminView) || "registry");
  const [cBadges, setCBadges] = useState({ pending: 0, unread: 0 });
  const [rNotif, setRNotif] = useState(null);
  const fuseRef = useRef(null);
  const deckRef = useRef(null);
  const [deckFits, setDeckFits] = useState(true);
  const toggleRef = useRef(null);
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const wasOpen = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { c } = useLang();
  const n = c.nav;
  const { role, isAdmin, latest } = useRole();

  const pathname = location.pathname;
  const onHome = pathname === "/";
  const onSuivi = pathname === "/suivi";
  const onButin = pathname === "/donations";
  const onAdmin = pathname === "/admin";


  // ---- la mèche (progression) + état défilé ----
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = window.scrollY || 0;
      setScrolled(y > 24);
      if (y < 240) setSpy(null);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (fuseRef.current) {
        fuseRef.current.style.width = `${(p * 100).toFixed(2)}%`;
        fuseRef.current.style.opacity = p > 0.004 ? "1" : "0";
      }
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // ---- LE GARDE-FOU : si les onglets ne tiennent pas (police, langue, rôle, écran), la barre
  // bascule sur la carte du navire au lieu de laisser deux boutons se toucher ----
  useLayoutEffect(() => {
    const el = deckRef.current;
    if (!el) return undefined;
    const check = () => {
      if (!deckRef.current) return;
      const cs = window.getComputedStyle(deckRef.current);
      if (cs.display === "none") return; // < 1280 px : la carte gère déjà tout
      const fits = deckRef.current.scrollWidth <= deckRef.current.clientWidth + 1;
      setDeckFits(fits);
    };
    check();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(check);
      ro.observe(el);
      if (el.parentElement) ro.observe(el.parentElement);
    }
    window.addEventListener("resize", check);
    document.fonts?.ready?.then(check).catch(() => {});
    const t = setTimeout(check, 600);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", check);
      clearTimeout(t);
    };
  });

  // ---- la vigie (scroll-spy) sur l'accueil ----
  useEffect(() => {
    if (!onHome || typeof IntersectionObserver === "undefined") {
      setSpy(null);
      return;
    }
    let obs;
    const t = setTimeout(() => {
      obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) setSpy(e.target.id);
          });
        },
        { rootMargin: "-42% 0px -52% 0px" }
      );
      SPY_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) obs.observe(el);
      });
    }, 350);
    return () => {
      clearTimeout(t);
      if (obs) obs.disconnect();
    };
  }, [onHome]);

  // ---- onglet actif du Conseil (synchronisé avec /admin) ----
  useEffect(() => {
    const on = (e) => setAdminView(e.detail || "registry");
    window.addEventListener("gp-admin-view", on);
    return () => window.removeEventListener("gp-admin-view", on);
  }, []);

  // ---- cloches du Conseil (via notifHub partagé, pause tab inactif) ----
  const adminNotif = useAdminNotif(isAdmin);
  useEffect(() => {
    if (!isAdmin) {
      setCBadges({ pending: 0, unread: 0 });
      return;
    }
    if (adminNotif) {
      setCBadges({ pending: adminNotif.pending || 0, unread: adminNotif.unread || 0 });
    }
  }, [isAdmin, adminNotif]);

  // ---- cloches de la recrue (via notifHub partagé, pause tab inactif) ----
  const latestCode = latest?.code;
  const recruitNotif = useRecruitNotif(role === "recruit" ? latestCode : null);
  useEffect(() => {
    if (role !== "recruit" || !latestCode) {
      setRNotif(null);
      return;
    }
    setRNotif(recruitNotif);
  }, [role, latestCode, recruitNotif]);

  // ---- rappel "retour à quai" si recrue absente depuis > 3 jours ----
  const [returnHint, setReturnHint] = useState(false);
  useEffect(() => {
    if (role !== "recruit") {
      setReturnHint(false);
      return;
    }
    const ls = readLastSeen();
    if (!ls) {
      setReturnHint(false);
      return;
    }
    const days = (Date.now() - ls) / 86_400_000;
    setReturnHint(days > 3);
  }, [role, latestCode]);

  // ---- verrou du pont quand la carte est ouverte (iOS compris) ----
  useEffect(() => {
    if (open) {
      lockScroll();
      wasOpen.current = true;
      const t = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 60);
      return () => {
        clearTimeout(t);
        unlockScroll();
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus({ preventScroll: true });
    }
    return undefined;
  }, [open]);


  // Échap ferme, Tab reste prisonnier de la carte (accessibilité clavier)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll("button:not([disabled]), a[href]");
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // La carte se referme si l'écran passe en mode bureau (rotation tablette, redimensionnement)
  useEffect(() => {
    if (!open || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => mq.matches && deckFits && setOpen(false);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [open, deckFits]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ---- navigation ----
  const goAnchor = useCallback(
    (id) => {
      const wasDrawer = open;
      setOpen(false);
      if (pathname !== "/") navigate("/#" + id);
      else setTimeout(() => scrollToId(id), wasDrawer ? 90 : 0);
    },
    [open, pathname, navigate]
  );

  const goTo = useCallback(
    (path, hash) => {
      setOpen(false);
      if (pathname === path && !hash) {
        setTimeout(() => scrollToTop(), 90);
        return;
      }
      navigate(hash ? `${path}#${hash}` : path, { state: { navTs: Date.now() } });
    },
    [pathname, navigate]
  );

  const goHome = () => {
    setOpen(false);
    if (onHome) {
      setTimeout(() => scrollToTop(), 60);
    } else navigate("/");
  };

  const logout = async () => {
    setOpen(false);
    try {
      await api.post("/auth/logout");
    } catch {
      /* même hors-ligne, on quitte le pont côté client */
    }
    try {
      sessionStorage.removeItem("gp-auth-ok");
    } catch {
      /* rien */
    }
    window.dispatchEvent(new Event("gp-council-logout"));
    window.dispatchEvent(new Event("gp-auth-changed"));
    toast.success(n.quitDone);
    navigate("/admin");
  };

  const councilTotal = cBadges.pending + cBadges.unread;
  const recruitUnread = rNotif?.unread_messages || 0;
  const recruitNews = rNotif && (rNotif.new_status || rNotif.new_note) ? 1 : 0;
  const recruitTotal = recruitUnread + recruitNews;
  const wheelBadge = role === "council" ? councilTotal : role === "recruit" ? recruitTotal : 0;

  // ---- le bouton d'or selon le rôle (toutes tailles d'écran) ----
  let cta = null;
  if (role === "visitor") {
    cta = (
      <GoldPlank tid="nav-cta-apply" onClick={() => goAnchor("postuler")} ariaLabel={n.cta}>
        <Swords className="w-4 h-4 hidden sm:block" />
        {n.ctaShort}
      </GoldPlank>
    );
  } else if (role === "recruit") {
    cta = onSuivi ? (
      <GoldPlank tid="nav-cta-suivi" onClick={() => goTo("/suivi", "mer")} badge={recruitUnread} ariaLabel={n.mer}>
        <MessagesSquare className="w-4 h-4 hidden sm:block" />
        <span className="sm:hidden xl:inline 2xl:hidden">{n.merShort}</span>
        <span className="hidden sm:inline xl:hidden 2xl:inline">{n.mer}</span>
      </GoldPlank>
    ) : (
      <GoldPlank tid="nav-cta-suivi" onClick={() => goTo("/suivi", "dossier")} badge={recruitTotal} ariaLabel={n.dossier}>
        <Telescope className="w-4 h-4 hidden sm:block" />
        <span className="sm:hidden">{n.dossierShort}</span>
        <span className="hidden sm:inline">{n.dossier}</span>
      </GoldPlank>
    );
  } else if (!onAdmin) {
    cta = (
      <GoldPlank tid="nav-cta-council" onClick={() => goTo("/admin", "registry")} badge={councilTotal} ariaLabel={n.pont}>
        <Skull className="w-4 h-4 hidden sm:block" />
        <span className="sm:hidden xl:inline 2xl:hidden">{n.pontShort}</span>
        <span className="hidden sm:inline xl:hidden 2xl:inline">{n.pont}</span>
      </GoldPlank>
    );
  }

  const solid = scrolled || !onHome;

  // ---- liens du pont desktop selon le rôle et la page ----
  const publicLinks = (
    <>
      {ROUTES.map((r) => (
        <DeckLink
          key={r.id}
          tid={`nav-link-${r.tid}`}
          num={r.num}
          label={n[r.key]}
          title={n.desc[r.key]}
          active={onHome && spy === r.id}
          onClick={() => goAnchor(r.id)}
        />
      ))}
      <DeckLink
        tid="nav-link-butin"
        icon={Coins}
        label={n.butin}
        title={n.desc.butin}
        active={onButin}
        onClick={() => goTo("/donations")}
      />
    </>
  );

  const councilLinks = (
    <>
      <DeckLink
        tid="nav-link-admin-registry"
        icon={ScrollText}
        label={n.deck.registre}
        title={n.desc.registre}
        badge={cBadges.pending}
        active={adminView === "registry"}
        onClick={() => goTo("/admin", "registry")}
      />
      <DeckLink
        tid="nav-link-admin-messages"
        icon={MessagesSquare}
        label={n.deck.messagerie}
        title={n.desc.messagerie}
        badge={cBadges.unread}
        active={adminView === "messages"}
        onClick={() => goTo("/admin", "messagerie")}
      />
      <DeckLink
        tid="nav-link-admin-butin"
        icon={Coins}
        label={n.deck.hall}
        title={n.desc.hall}
        active={adminView === "butin"}
        onClick={() => goTo("/admin", "butin")}
      />
      <span aria-hidden="true" className="mx-2 h-6 w-px bg-gold/25" />
      <DeckLink
        tid="nav-link-public-site"
        icon={Globe}
        label={n.deck.publicSite}
        title={n.desc.publicSite}
        onClick={() => goTo("/")}
      />
    </>
  );

  const showCouncilDeck = role === "council" && onAdmin;
  const roleLabel = n.role[role];

  return (
    <>
      <header
        data-testid="nav-header"
        data-role={role}
        className={`fixed top-0 inset-x-0 z-[80] transition-[background,box-shadow] duration-500 ${
          solid
            ? "deck-planks shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)]"
            : "bg-gradient-to-b from-ink/95 via-ink/70 to-ink/0"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div
          className="relative max-w-[1440px] mx-auto h-16 md:h-20 flex items-center justify-between gap-2 sm:gap-3"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          {/* LE PAVILLON — retour au quai */}
          <button
            type="button"
            data-testid="nav-logo"
            onClick={goHome}
            aria-label={n.home}
            className="group flex items-center gap-2.5 md:gap-3 min-w-0 shrink-0 lg:px-2"
          >
            <span className="brass-porthole relative grid place-items-center w-9 h-9 md:w-11 md:h-11 shrink-0 bg-ink">
              <LogoMark className="w-7 h-7 md:w-9 md:h-9 transition-transform duration-700 group-hover:rotate-[135deg]" />
            </span>
            <span className="text-left leading-none min-w-0">
              <span className="block font-display text-[17px] min-[400px]:text-lg sm:text-xl md:text-2xl text-gold tracking-wide whitespace-nowrap text-glow-gold">
                GOLDEN PIRATES
              </span>
              <span className="flex items-center gap-1.5 font-mono2 text-[8px] sm:text-[9px] tracking-[0.35em] text-mist mt-1 whitespace-nowrap">
                <SkullIcon className="w-2.5 h-2.5 text-blood" />
                {n.kingdom}
                <span className="hidden 2xl:inline text-gold/50">· CALL OF DRAGONS</span>
              </span>
            </span>
          </button>

          {/* LE PONT — onglets visibles directement (≥ 1280 px) */}
          <nav
            ref={deckRef}
            aria-label="Navigation principale"
            data-testid="nav-deck"
            data-fits={deckFits ? "true" : "false"}
            aria-hidden={deckFits ? undefined : "true"}
            className={`hidden xl:flex items-center justify-center gap-1 flex-1 min-w-0 px-3 ${deckFits ? "" : "invisible pointer-events-none"}`}
          >
            {showCouncilDeck ? councilLinks : publicLinks}
          </nav>

          {/* LA PASSERELLE — pavillon, langue, accès, bouton d'or, barre */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {role !== "visitor" && (
              <span className="hidden lg:inline-flex">
                <RoleFlag role={role} label={roleLabel} />
              </span>
            )}
            <span className="hidden md:inline-flex">
              <LangToggle />
            </span>
            {role !== "council" && (
              <>
                {role === "visitor" && (
                  <button
                    type="button"
                    data-testid="nav-link-status"
                    onClick={() => goTo("/suivi")}
                    aria-current={onSuivi ? "page" : undefined}
                    title={n.desc.suivi}
                    aria-label={n.suivi}
                    className={`hidden xl:inline-flex items-center gap-1.5 h-10 px-3 border font-mono2 text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
                      onSuivi ? "border-gold text-gold bg-gold/10" : "border-gold/35 text-bone/85 hover:border-gold hover:text-gold"
                    }`}
                  >
                    <Telescope className="w-4 h-4" />
                    <span className="hidden 2xl:inline">{n.suiviShort}</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="nav-link-council"
                  onClick={() => goTo("/admin")}
                  aria-current={onAdmin ? "page" : undefined}
                  title={n.councilEntry}
                  aria-label={n.councilEntry}
                  className={`hidden xl:inline-flex items-center justify-center w-10 h-10 border transition-all duration-300 ${
                    onAdmin
                      ? "border-bloodglow bg-blood/30 text-bone"
                      : "border-blood/50 bg-blood/15 text-red-300 hover:bg-blood/35 hover:border-bloodglow"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                </button>
              </>
            )}
            {role === "council" && onAdmin && (
              <button
                type="button"
                data-testid="nav-logout"
                onClick={logout}
                title={n.quit}
                aria-label={n.quit}
                className="hidden xl:inline-flex items-center gap-2 h-10 px-3 border border-blood/60 bg-blood/15 text-bone font-mono2 text-[10px] tracking-[0.2em] hover:bg-blood/35 hover:border-bloodglow transition-all duration-300"
              >
                <LogOut className="w-4 h-4 text-red-300" />
                <span className="hidden 2xl:inline">{n.quit}</span>
              </button>
            )}
            {cta && <span className="hidden min-[350px]:inline-flex">{cta}</span>}

            {/* LA BARRE DU NAVIRE — ouvre la carte (mobile & tablette) */}
            <button
              ref={toggleRef}
              type="button"
              data-testid="nav-menu-toggle"
              onClick={() => setOpen(true)}
              aria-label={n.openMap}
              aria-expanded={open}
              aria-controls="nav-drawer"
              className={`${deckFits ? "xl:hidden" : ""} group relative flex items-center gap-2 h-10 md:h-11 pl-2 pr-2 sm:pr-3 border border-gold/45 bg-ink/80 text-gold hover:border-gold hover:shadow-[0_0_24px_rgba(212,175,55,0.3)] transition-all duration-300`}
            >
              <ShipWheel className="w-7 h-7 transition-transform duration-700 group-hover:rotate-[90deg] wheel-idle" />
              <span className="hidden sm:block font-display text-lg tracking-wider">{n.map}</span>
              {wheelBadge > 0 && (
                <span
                  data-testid="nav-menu-toggle-dot"
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-bloodglow ring-2 ring-ink animate-pulse"
                />
              )}
            </button>
          </div>
        </div>

        {/* LA CORDE + LA MÈCHE qui se consume au fil de la lecture */}
        <div className="absolute inset-x-0 bottom-0 h-[3px]" aria-hidden="true">
          <div className={`absolute inset-0 rope-line transition-opacity duration-500 ${solid ? "opacity-60" : "opacity-30"}`} />
          <div ref={fuseRef} className="absolute left-0 top-0 bottom-0 w-0 opacity-0 fuse-burn transition-opacity duration-300" data-testid="nav-fuse">
            <span className="fuse-spark" />
          </div>
        </div>
      </header>

      {/* LA CARTE DU NAVIRE — tiroir mobile & tablette */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            className={`fixed inset-0 z-[85] bg-[#03060A]/85 ${deckFits ? "xl:hidden" : ""}`}
            onClick={() => setOpen(false)}
            data-testid="nav-drawer-overlay"
          >
            <motion.aside
              ref={panelRef}
              id="nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={n.mapTitle}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
              data-testid="nav-drawer"
              data-role={role}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[440px] deck-planks border-l border-gold/35 shadow-[-30px_0_80px_rgba(0,0,0,0.85)] flex flex-col will-change-transform"
              style={{ height: "100dvh", transform: "translateZ(0)" }}
            >
              {/* corde verticale + filigrane de barre */}
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rope-line-v opacity-70" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(212,175,55,0.12),transparent_50%)]" />
                <ShipWheel hub={null} className="absolute -right-28 -bottom-28 w-[420px] h-[420px] text-gold/[0.05] animate-spin-slow" />
              </div>

              {/* en-tête de la carte */}
              <div
                className="relative z-10 shrink-0 flex items-center justify-between gap-3 h-16 md:h-20 border-b border-gold/20"
                style={{
                  marginTop: "env(safe-area-inset-top)",
                  paddingLeft: "1.25rem",
                  paddingRight: "max(1rem, env(safe-area-inset-right))",
                }}
              >
                <button type="button" onClick={goHome} data-testid="drawer-logo" className="flex items-center gap-2.5 min-w-0" aria-label={n.home}>
                  <span className="brass-porthole grid place-items-center w-9 h-9 shrink-0 bg-ink">
                    <LogoMark className="w-7 h-7" />
                  </span>
                  <span className="leading-none text-left min-w-0">
                    <span className="block font-mono2 text-[9px] tracking-[0.4em] text-gold/80">{n.mapTitle}</span>
                    <span className="block font-display text-xl text-gold tracking-wide mt-1 whitespace-nowrap">GOLDEN PIRATES</span>
                  </span>
                </button>
                <button
                  ref={closeRef}
                  type="button"
                  data-testid="nav-menu-close"
                  onClick={() => setOpen(false)}
                  aria-label={n.closeMap}
                  className="shrink-0 w-11 h-11 grid place-items-center border border-gold/40 text-gold hover:border-gold hover:rotate-90 transition-all duration-500"
                >
                  <CrossedSabres className="w-6 h-6" />
                </button>
              </div>

              <div
                data-lenis-prevent
                className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-6 space-y-7"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {/* TON PAVILLON */}
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
                  data-testid="drawer-role-card"
                  data-role={role}
                  className="relative border border-gold/30 bg-ink/70 p-4 frame-plate"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="font-mono2 text-[9px] tracking-[0.4em] text-gold/80">{n.pavillon}</span>
                    <RoleFlag role={role} label={roleLabel} tid="drawer-role-flag" />
                  </div>
                  <p className="font-display text-2xl text-bone leading-none">{n.roleTitle[role]}</p>
                  <p className="font-fell italic text-[15px] text-bone/70 mt-1.5 leading-snug">{n.roleLong[role]}</p>
                  {role === "recruit" && latest && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-mono2 text-[9px] tracking-[0.3em] text-mist">{n.lastCode}</span>
                      <span data-testid="drawer-recruit-code" className="font-mono2 text-xs tracking-[0.2em] text-gold border border-gold/40 px-2 py-1">
                        {latest.code}
                      </span>
                      {recruitNews > 0 && (
                        <span className="font-mono2 text-[9px] tracking-[0.25em] bg-blood text-bone px-2 py-1">{n.newsLbl}</span>
                      )}
                      {returnHint && (
                        <span
                          data-testid="drawer-return-badge"
                          className="font-mono2 text-[9px] tracking-[0.25em] border border-gold/60 bg-gold/10 text-goldlight px-2 py-1"
                        >
                          {c.notif.navReturnBadge}
                        </span>
                      )}
                    </div>
                  )}
                  {role === "council" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="border border-gold/25 px-3 py-2">
                        <p data-testid="drawer-council-pending" className="font-display text-2xl text-gold leading-none">{cBadges.pending}</p>
                        <p className="font-mono2 text-[8px] tracking-[0.3em] text-mist mt-1">{n.pendingLbl}</p>
                      </div>
                      <div className="border border-gold/25 px-3 py-2">
                        <p data-testid="drawer-council-unread" className="font-display text-2xl text-gold leading-none">{cBadges.unread}</p>
                        <p className="font-mono2 text-[8px] tracking-[0.3em] text-mist mt-1">{n.unreadLbl}</p>
                      </div>
                    </div>
                  )}
                </motion.section>

                {/* TON PONT — les actions de TON rôle */}
                <section>
                  <p className="font-mono2 text-[10px] tracking-[0.4em] text-gold mb-3 flex items-center gap-2">
                    <Anchor className="w-3 h-3" /> {n.yourDeck}
                  </p>
                  <div className="space-y-2.5">
                    {role === "visitor" && (
                      <>
                        <MapAction tid="drawer-cta-apply" primary icon={Swords} label={n.cta} sub={n.desc.postuler} onClick={() => goAnchor("postuler")} delay={0.07} />
                        <MapAction
                          tid="drawer-link-status"
                          icon={Telescope}
                          label={n.suivi}
                          sub={n.desc.suivi}
                          here={onSuivi}
                          hereLabel={n.here}
                          onClick={() => goTo("/suivi")}
                          delay={0.11}
                        />
                      </>
                    )}
                    {role === "recruit" && (
                      <>
                        <MapAction tid="drawer-link-dossier" primary icon={Telescope} label={n.dossier} sub={n.desc.dossier} badge={recruitNews} onClick={() => goTo("/suivi", "dossier")} delay={0.07} />
                        <MapAction tid="drawer-link-mer" icon={MessagesSquare} label={n.mer} sub={n.desc.mer} badge={recruitUnread} onClick={() => goTo("/suivi", "mer")} delay={0.11} />
                        <MapAction tid="drawer-link-taniere" icon={Users} label={n.taniere} sub={n.desc.taniere} onClick={() => goTo("/suivi", "taniere")} delay={0.15} />
                      </>
                    )}
                    {role === "council" && (
                      <>
                        <MapAction
                          tid="drawer-link-admin-registry"
                          primary
                          icon={ScrollText}
                          label={n.registre}
                          sub={n.desc.registre}
                          badge={cBadges.pending}
                          onClick={() => goTo("/admin", "registry")}
                          delay={0.07}
                        />
                        <MapAction
                          tid="drawer-link-admin-messages"
                          icon={MessagesSquare}
                          label={n.messagerie}
                          sub={n.desc.messagerie}
                          badge={cBadges.unread}
                          here={onAdmin && adminView === "messages"}
                          hereLabel={n.here}
                          onClick={() => goTo("/admin", "messagerie")}
                          delay={0.11}
                        />
                        <MapAction
                          tid="drawer-link-admin-butin"
                          icon={Landmark}
                          label={n.hall}
                          sub={n.desc.hall}
                          here={onAdmin && adminView === "butin"}
                          hereLabel={n.here}
                          onClick={() => goTo("/admin", "butin")}
                          delay={0.15}
                        />
                        <MapAction tid="drawer-logout" danger icon={LogOut} label={n.quit} onClick={logout} delay={0.19} />
                      </>
                    )}
                  </div>
                </section>

                {/* LES ROUTES DU NAVIRE — le site public */}
                <section>
                  <p className="font-mono2 text-[10px] tracking-[0.4em] text-gold mb-2 flex items-center gap-2">
                    <Globe className="w-3 h-3" /> {n.routes}
                  </p>
                  <ul className="divide-y divide-gold/10 border-y border-gold/10">
                    {ROUTES.map((r, i) => {
                      const here = onHome && spy === r.id;
                      const Icon = r.icon;
                      return (
                        <motion.li
                          key={r.id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.45, ease: EASE }}
                        >
                          <button
                            type="button"
                            data-testid={`drawer-link-${r.tid}`}
                            onClick={() => goAnchor(r.id)}
                            aria-current={here ? "location" : undefined}
                            className="group w-full flex items-center gap-3 py-3 min-h-[56px] text-left"
                          >
                            <span className="font-decor text-[11px] text-gold/50 w-7 shrink-0">{r.num}.</span>
                            <span className="flex-1 min-w-0">
                              <span className={`block font-fell text-xl leading-tight transition-colors ${here ? "text-gold" : "text-bone group-hover:text-gold"}`}>
                                {n[r.key]}
                              </span>
                              <span className="block font-mono2 text-[9px] tracking-[0.2em] text-mist mt-1 truncate uppercase">
                                {here ? `☠ ${n.here}` : n.desc[r.key]}
                              </span>
                            </span>
                            <Icon className="w-4 h-4 text-gold/40 group-hover:text-gold shrink-0 transition-colors" />
                          </button>
                        </motion.li>
                      );
                    })}
                    <motion.li initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.45, ease: EASE }}>
                      <button
                        type="button"
                        data-testid="drawer-link-butin"
                        onClick={() => goTo("/donations")}
                        aria-current={onButin ? "page" : undefined}
                        className="group w-full flex items-center gap-3 py-3 min-h-[56px] text-left"
                      >
                        <span className="w-7 shrink-0">
                          <Coins className="w-4 h-4 text-gold" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block font-fell text-xl leading-tight transition-colors ${onButin ? "text-gold" : "text-bone group-hover:text-gold"}`}>
                            {n.butin}
                          </span>
                          <span className="block font-mono2 text-[9px] tracking-[0.2em] text-mist mt-1 truncate uppercase">
                            {onButin ? `☠ ${n.here}` : n.desc.butin}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-gold/40 group-hover:text-gold shrink-0" />
                      </button>
                    </motion.li>
                  </ul>
                </section>
              </div>

              {/* pied de carte : langue + entrée du Conseil */}
              <div
                className="relative z-10 shrink-0 border-t border-gold/20 bg-ink/85 px-5 pt-3 flex items-center justify-between gap-3"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono2 text-[8px] tracking-[0.35em] text-mist">{n.langLbl}</span>
                  <LangToggle big />
                </div>
                {role !== "council" ? (
                  <button
                    type="button"
                    data-testid="drawer-link-council"
                    onClick={() => goTo("/admin")}
                    aria-current={onAdmin ? "page" : undefined}
                    className="inline-flex items-center gap-2 h-11 px-3.5 border border-blood/50 bg-blood/15 text-bone/90 font-mono2 text-[10px] tracking-[0.2em] uppercase hover:bg-blood/35 hover:border-bloodglow transition-all"
                  >
                    <Shield className="w-4 h-4 text-red-300" />
                    {n.councilEntry}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="drawer-link-public-site"
                    onClick={() => goTo("/")}
                    className="inline-flex items-center gap-2 h-11 px-3.5 border border-gold/40 text-gold font-mono2 text-[10px] tracking-[0.2em] uppercase hover:bg-gold/10 transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    {n.publicSite}
                  </button>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
