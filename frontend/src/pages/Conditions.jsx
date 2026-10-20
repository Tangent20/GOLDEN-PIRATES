import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { CONDITIONS_COPY } from "@/lib/conditionsCopy";
import Seo from "@/lib/Seo";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ScrollText, ShieldCheck, Lock, Feather, Mail, Anchor, ArrowUp } from "lucide-react";
import { smoothScrollTo, scrollToTop } from "@/lib/scroll";

const EASE = [0.22, 1, 0.36, 1];
const BADGE_ICONS = { free: ShieldCheck, shield: Lock, hand: Feather };

const jump = (id) => smoothScrollTo(id);

const toTop = () => scrollToTop();

function Toc({ d, variant }) {
  return (
    <ul className="space-y-2.5">
      {d.sections.map((sec) => (
        <li key={sec.id}>
          <button
            data-testid={`conditions-toc-${sec.id}${variant === "mobile" ? "-mobile" : ""}`}
            onClick={() => jump(sec.id)}
            className={`font-fell text-left hover:text-gold transition-colors ${variant === "mobile" ? "text-base text-bone/85" : "text-sm text-bone/75"}`}
          >
            <span className="text-gold mr-2">✦</span>
            {sec.toc}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Conditions() {
  const { c, lang } = useLang();
  // Textes juridiques : source unique lib/conditionsCopy.js (+ bandeaux communs de l'i18n)
  const d = { ...c.conditions, ...(CONDITIONS_COPY[lang] || CONDITIONS_COPY.fr) };
  // Lien profond /conditions#dons, #donnees… : va directement à l'article demandé
  useEffect(() => {
    const id = (window.location.hash || "").replace("#", "");
    if (!id) return undefined;
    const tmr = setTimeout(() => jump(id), 450);
    return () => clearTimeout(tmr);
  }, []);
  return (
    <div className="min-h-screen bg-ink text-bone">
      <Seo route="/conditions" />
      <Nav />
      <main data-testid="conditions-main" className="pt-28 sm:pt-36 map-grid">
        {/* HERO — le parchemin de confiance */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.35em] text-gold border border-gold/40 bg-gold/5 px-4 py-2 mb-6"
            data-testid="conditions-eyebrow"
          >
            <ScrollText className="w-3.5 h-3.5 shrink-0" /> {d.eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.8, ease: EASE }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl text-bone leading-[1.05] mb-5"
            data-testid="conditions-title"
          >
            {d.title1}
            <span className="font-fell italic text-gold">{d.titleGold}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
            className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-5"
            data-testid="conditions-updated"
          >
            {d.updated}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.8, ease: EASE }}
            className="font-fell text-lg text-bone/85 leading-relaxed mb-8 max-w-3xl"
            data-testid="conditions-intro"
          >
            {d.intro}
          </motion.p>
          <div className="flex flex-wrap gap-3">
            {d.badges.map((b, i) => {
              const Icon = BADGE_ICONS[b.key] || ShieldCheck;
              return (
                <motion.span
                  key={b.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: EASE }}
                  data-testid={`conditions-badge-${b.key}`}
                  className="inline-flex items-center gap-2 border border-emerald-400/50 bg-emerald-500/10 text-emerald-300 font-mono2 text-[9px] tracking-[0.2em] px-3.5 py-2"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" /> {b.text}
                </motion.span>
              );
            })}
          </div>
        </section>

        {/* SOMMAIRE — mobile dépliable */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-10 lg:hidden">
          <details data-testid="conditions-summary-mobile" className="border border-gold/25 bg-deck/60 px-5 py-4">
            <summary className="font-mono2 text-[10px] tracking-[0.3em] text-gold cursor-pointer select-none">
              {d.summaryTitle} — {d.summaryHint}
            </summary>
            <div className="mt-4">
              <Toc d={d} variant="mobile" />
            </div>
          </details>
        </section>

        {/* CORPS DU PARCHEMIN */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-12 lg:mt-16 grid lg:grid-cols-[280px,1fr] gap-10 lg:gap-14">
          <aside data-testid="conditions-summary" className="hidden lg:block">
            <div className="sticky top-28 border border-gold/25 bg-deck/60 p-6">
              <p className="font-mono2 text-[10px] tracking-[0.3em] text-gold mb-4">{d.summaryTitle}</p>
              <Toc d={d} />
            </div>
          </aside>
          <div className="min-w-0">
            {d.sections.map((sec) => (
              <motion.article
                key={sec.id}
                id={sec.id}
                data-testid={`conditions-section-${sec.id}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="border-l-2 border-gold/40 pl-6 sm:pl-8 mb-12 last:mb-0 scroll-mt-28"
              >
                <h2 className="font-display text-2xl sm:text-3xl text-gold uppercase tracking-wide mb-5">{sec.title}</h2>
                {(sec.paras || []).map((p, j) => (
                  <p key={j} className="font-fell text-base text-bone/85 leading-relaxed mb-4">{p}</p>
                ))}
                {sec.card && (
                  <div className="border border-gold/40 bg-deck/60 p-5 sm:p-6 mb-4 space-y-2.5" data-testid={`conditions-card-${sec.id}`}>
                    {sec.card.map((line, j) => (
                      <p key={j} className="font-fell text-base text-bone leading-relaxed flex items-start gap-3">
                        <span aria-hidden="true" className="w-1.5 h-1.5 bg-gold rotate-45 shrink-0 mt-2.5" />
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {sec.bullets && (
                  <ul className="space-y-2.5 mb-4">
                    {sec.bullets.map((b, j) => (
                      <li key={j} className="font-fell text-base text-bone/85 leading-relaxed flex items-start gap-3">
                        <Anchor className="w-3.5 h-3.5 text-gold shrink-0 mt-1.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {(sec.paras2 || []).map((p, j) => (
                  <p key={j} className="font-fell text-base text-bone/85 leading-relaxed mb-4">{p}</p>
                ))}
              </motion.article>
            ))}
          </div>
        </section>

        {/* CONTACT — le Capitaine répond */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 mt-16 sm:mt-20 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: EASE }}
            data-testid="conditions-contact"
            className="border-2 border-gold/50 bg-deck/60 p-8 sm:p-10 text-center"
          >
            <Mail className="w-8 h-8 text-gold mx-auto mb-4" />
            <h2 className="font-display text-2xl sm:text-3xl text-bone uppercase tracking-wide mb-3">{d.contactTitle}</h2>
            <p className="font-fell text-lg text-bone/80 leading-relaxed mb-4">{d.contactText}</p>
            <a
              href="mailto:golden.pirates@outlook.fr"
              data-testid="conditions-contact-mail"
              className="font-mono2 text-[11px] tracking-[0.25em] text-gold underline underline-offset-4 break-all hover:text-goldlight transition-colors"
            >
              golden.pirates@outlook.fr
            </a>
            <div className="mt-7">
              <a
                href="mailto:golden.pirates@outlook.fr"
                data-testid="conditions-contact-btn"
                className="inline-flex items-center gap-2.5 font-display text-xl sm:text-2xl tracking-wider uppercase px-8 py-4 bg-gold text-ink hover:bg-goldlight hover:shadow-[0_0_45px_rgba(212,175,55,0.5)] transition-all duration-300"
              >
                <Mail className="w-5 h-5 shrink-0" /> {d.contactBtn}
              </a>
            </div>
            <button
              onClick={toTop}
              data-testid="conditions-back-top"
              className="mt-9 inline-flex items-center gap-3 font-mono2 text-[10px] tracking-[0.35em] text-gold border border-gold/40 px-5 py-3 hover:bg-gold/10 transition-all"
            >
              {d.backTop} <ArrowUp className="w-4 h-4" />
            </button>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
