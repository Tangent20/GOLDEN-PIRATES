import { useNavigate } from "react-router-dom";
import { Compass, ShieldCheck, Lock, Anchor, Map, Scroll, Crown } from "lucide-react";
import LogoMark from "./LogoMark";
import { useLang } from "@/lib/i18n";
import useRole from "@/lib/role";
import { smoothScrollTo, scrollToTop } from "@/lib/scroll";

const colTitle = "font-mono2 text-[10px] tracking-[0.35em] text-gold mb-5";
const label = "font-mono2 text-[9px] tracking-[0.25em] text-mist mb-1.5";
const badge =
  "inline-flex items-center gap-2 border border-emerald-400/50 bg-emerald-500/10 text-emerald-300 font-mono2 text-[9px] tracking-[0.2em] px-3 py-1.5";

// Chevalière de rôle — pastille pirate affichée dans le pavois.
const roleCrest = {
  visitor: {
    cls: "border-mist/40 bg-ink/60 text-mist",
    Icon: Map,
    testid: "footer-crest-visitor",
  },
  recruit: {
    cls: "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
    Icon: Anchor,
    testid: "footer-crest-recruit",
  },
  council: {
    cls: "border-gold/50 bg-blood/20 text-goldlight",
    Icon: Crown,
    testid: "footer-crest-council",
  },
};

export default function Footer() {
  const navigate = useNavigate();
  const { c } = useLang();
  const { role, isAdmin, latest } = useRole();
  const s = c.footer;
  const t = c.conditions.trust;
  // Rôle unique, zéro overlap. Le Conseil prime (isAdmin déjà intégré au hook).
  const variant = isAdmin ? "council" : role === "recruit" ? "recruit" : "visitor";
  const crest = roleCrest[variant];
  const CrestIcon = crest.Icon;
  const taglineByRole = {
    visitor: s.visitorTag || s.tagline,
    recruit: s.recruitTag || s.tagline,
    council: s.councilTag || s.tagline,
  };
  const badgeLabel = {
    visitor: s.visitorBadge,
    recruit: s.recruitBadge,
    council: s.councilBadge,
  }[variant];

  const backToTop = () => {
    scrollToTop();
  };
  const goTo = (id) => {
    if (window.location.pathname !== "/") navigate("/#" + id);
    else
      smoothScrollTo(id);
  };

  // Titre + icône de la 2e colonne selon rôle.
  const spaceCol = {
    visitor: { title: s.spacesTitle, Icon: Scroll },
    recruit: { title: s.recruitSpacesTitle || s.spacesTitle, Icon: Anchor },
    council: { title: s.councilTitle, Icon: Crown },
  }[variant];
  const SpaceColIcon = spaceCol.Icon;

  return (
    <footer
      data-testid="footer"
      data-role={variant}
      className="relative border-t border-gold/15 bg-[#04070B] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 md:pt-20 pb-10">
        {/* PAVOIS — marque, signature, chevalière de rôle, boussole retour-haut */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-12">
          <div className="min-w-0">
            <div data-testid="footer-logo" className="flex items-center gap-3 mb-4">
              <LogoMark className="w-11 h-11 shrink-0" />
              <div className="leading-none min-w-0">
                <p className="font-display text-2xl text-gold truncate">GOLDEN PIRATES</p>
                <p className="font-mono2 text-[9px] tracking-[0.4em] text-mist mt-1">{c.nav.kingdom}</p>
              </div>
            </div>
            <p className="font-fell italic text-base text-bone/70 max-w-md leading-relaxed">
              {taglineByRole[variant]}
            </p>
            {/* Chevalière du rôle à bord — tangible, pirate, non intrusive */}
            <span
              data-testid={crest.testid}
              className={`mt-5 inline-flex items-center gap-2 border ${crest.cls} font-mono2 text-[9px] tracking-[0.3em] px-3 py-1.5`}
            >
              <CrestIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />
              {badgeLabel}
            </span>
          </div>
          <button
            data-testid="footer-back-to-top"
            onClick={backToTop}
            className="shrink-0 self-start inline-flex items-center gap-3 font-mono2 text-[10px] tracking-[0.35em] text-gold border border-gold/40 px-5 py-3 min-h-[44px] hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 transition-colors group"
          >
            {s.backTop}
            <Compass className="w-4 h-4 transition-transform duration-700 group-hover:rotate-[360deg]" />
          </button>
        </div>

        {/* QUATRE QUARTIERS — chacun à sa place, jamais mélangés */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* 1 · EXPLORER LE NAVIRE — pour tous */}
          <div data-testid="footer-explore-col">
            <p className={colTitle}>{s.exploreTitle}</p>
            <ul className="space-y-3 font-fell text-base text-bone/75">
              {s.links.map((l) => (
                <li key={l.id}>
                  <button
                    data-testid={`footer-explore-${l.id}`}
                    onClick={() => goTo(l.id)}
                    className="min-h-[44px] py-2 text-left hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 2 · TON ESPACE — un seul visage selon le rôle (zero overlap) */}
          <div data-testid="footer-spaces-col" data-variant={variant}>
            <p className={`${colTitle} inline-flex items-center gap-2`}>
              <SpaceColIcon className="w-3.5 h-3.5 text-gold/80" strokeWidth={1.6} />
              {spaceCol.title}
            </p>

            {variant === "council" && (
              <ul className="space-y-3 font-fell text-base">
                <li>
                  <button
                    data-testid="footer-council-dash"
                    onClick={() => navigate("/admin")}
                    className="min-h-[44px] py-2 text-left text-gold hover:text-goldlight focus-visible:text-goldlight focus-visible:outline-none transition-colors"
                  >
                    {s.councilDashLink || s.councilTitle}
                  </button>
                </li>
                <li>
                  <button
                    data-testid="footer-council-register"
                    onClick={() => navigate("/admin")}
                    className="min-h-[44px] py-2 text-left text-bone/75 hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
                  >
                    {s.councilRegister}
                  </button>
                </li>
                <li>
                  <button
                    data-testid="footer-council-messages"
                    onClick={() => navigate("/admin#messagerie")}
                    className="min-h-[44px] py-2 text-left text-bone/75 hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
                  >
                    {s.councilMessages}
                  </button>
                </li>
              </ul>
            )}

            {variant === "recruit" && (
              <ul className="space-y-3 font-fell text-base">
                <li>
                  <button
                    data-testid="footer-track-link"
                    onClick={() => navigate("/suivi")}
                    className="min-h-[44px] py-2 text-left text-gold hover:text-goldlight focus-visible:text-goldlight focus-visible:outline-none transition-colors"
                  >
                    {s.recruitTrackLink || s.trackLink}
                  </button>
                </li>
                {latest?.code && (
                  <li data-testid="footer-recruit-code" className="pt-1">
                    <p className={label}>{s.recruitCodeLabel}</p>
                    <code className="inline-block font-mono2 text-[11px] tracking-[0.3em] text-goldlight bg-ink/70 border border-gold/30 px-2.5 py-1.5 break-all">
                      {latest.code}
                    </code>
                  </li>
                )}
                <li>
                  <button
                    data-testid="footer-recruit-new-apply"
                    onClick={() => navigate("/#postuler")}
                    className="min-h-[44px] py-2 text-left text-bone/75 hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
                  >
                    {s.recruitNewApply}
                  </button>
                </li>
              </ul>
            )}

            {variant === "visitor" && (
              <ul className="space-y-3 font-fell text-base">
                <li>
                  <button
                    data-testid="footer-apply-link"
                    onClick={() => navigate("/#postuler")}
                    className="min-h-[44px] py-2 text-left text-gold hover:text-goldlight focus-visible:text-goldlight focus-visible:outline-none transition-colors"
                  >
                    {s.applyLink}
                  </button>
                </li>
                <li>
                  <button
                    data-testid="footer-track-link"
                    onClick={() => navigate("/suivi")}
                    className="min-h-[44px] py-2 text-left text-bone/75 hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
                  >
                    {s.trackLink}
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* 3 · BUTIN & RÈGLEMENTS — commun à tous */}
          <div data-testid="footer-rules-col">
            <p className={colTitle}>{s.lootTitle}</p>
            <ul className="space-y-3 font-fell text-base">
              <li>
                <button
                  data-testid="footer-donation-link"
                  onClick={() => navigate("/donations")}
                  className="min-h-[44px] py-2 text-left text-bone/75 hover:text-gold focus-visible:text-gold focus-visible:outline-none transition-colors"
                >
                  {s.donationLink}
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-trust-cgu"
                  onClick={() => navigate("/conditions")}
                  className="min-h-[44px] py-2 text-left text-gold hover:text-goldlight focus-visible:text-goldlight focus-visible:outline-none underline underline-offset-4 transition-colors"
                >
                  {s.cguLink}
                </button>
              </li>
            </ul>
          </div>

          {/* 4 · LA CONFIANCE — éditeur, courriel, serments */}
          <div data-testid="footer-trust-band">
            <p className={colTitle}>{s.trustTitle}</p>
            <p className={label}>{t.editorLabel}</p>
            <p
              data-testid="footer-trust-editor"
              className="font-fell text-base text-bone/85 leading-relaxed mb-3 break-words"
            >
              {t.editor}
            </p>
            <p className={label}>{t.mailLabel}</p>
            <a
              data-testid="footer-trust-mail"
              href="mailto:golden.pirates@outlook.fr"
              className="font-fell text-base text-gold hover:text-goldlight focus-visible:text-goldlight focus-visible:outline-none underline underline-offset-4 break-all transition-colors"
            >
              golden.pirates@outlook.fr
            </a>
            <p className="font-fell text-sm text-mist mt-1.5 leading-relaxed">{t.mailNote}</p>
            <div data-testid="footer-trust-badges" className="flex flex-col items-start gap-2 mt-4">
              <span data-testid="footer-trust-free" className={badge}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> {t.badge1}
              </span>
              <span data-testid="footer-trust-nosale" className={badge}>
                <Lock className="w-3.5 h-3.5 shrink-0" /> {t.badge2}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-gold/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist text-center sm:text-left">
            {s.disclaimer}
          </p>
          <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist">{s.madeWith}</p>
        </div>
      </div>
    </footer>
  );
}
