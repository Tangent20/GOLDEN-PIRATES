import { motion } from "framer-motion";
import { Anchor, Compass, Swords } from "lucide-react";
import { useLang } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1];
const FEAST_IMG = "/feast-pirates.png";

const rise = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.9, ease: EASE },
};

const VALUE_ICONS = [Anchor, Compass, Swords];
const VALUE_TIDS = ["manifesto-card-fraternity", "manifesto-card-rigor", "manifesto-card-supremacy"];

export default function Manifesto() {
  const { c } = useLang();
  const s = c.manifesto;
  return (
    <section id="alliance" data-testid="manifesto-section" className="relative py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7">
            <motion.p {...rise} className="font-mono2 text-[11px] tracking-[0.35em] text-gold mb-5 uppercase">
              {s.eyebrow}
            </motion.p>
            <motion.h2
              {...rise}
              data-testid="manifesto-title"
              className="font-display text-4xl sm:text-5xl lg:text-6xl text-bone leading-[1.02] mb-8 uppercase"
            >
              {s.title1}<span className="text-gold">{s.titleGold}</span>
            </motion.h2>
            <motion.p {...rise} className="font-fell text-lg sm:text-xl leading-relaxed text-bone/85 mb-6">
              {s.p1}
            </motion.p>
            <motion.p {...rise} className="font-fell text-lg sm:text-xl leading-relaxed text-bone/85 mb-10">
              {s.p2}
            </motion.p>

            <motion.blockquote
              {...rise}
              data-testid="manifesto-quote"
              className="relative border-l-2 border-gold pl-6 md:pl-8 py-2"
            >
              <span className="absolute -top-4 left-3 font-display text-7xl text-gold/30 select-none">“</span>
              <p className="font-fell italic text-xl sm:text-2xl text-goldlight leading-snug">{s.quote}</p>
              <footer className="mt-4 font-mono2 text-[10px] tracking-[0.3em] text-mist">{s.quoteBy}</footer>
            </motion.blockquote>
          </div>

          <motion.div
            {...rise}
            className="lg:col-span-5 relative"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          >
            <div className="relative frame-plate border border-gold/25 p-2 sm:p-3 bg-deep">
              <div className="overflow-hidden">
                <motion.img
                  src={FEAST_IMG}
                  alt={s.imgAlt}
                  loading="lazy"
                  className="w-full h-[320px] sm:h-[420px] lg:h-[520px] object-cover"
                  initial={{ scale: 1.15 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 1.6, ease: EASE }}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.12),transparent_55%)]" />
              <div className="flex items-center justify-between px-2 py-3">
                <span className="font-mono2 text-[10px] tracking-[0.3em] text-mist uppercase">{s.imgCaption}</span>
                <span className="font-mono2 text-[10px] tracking-[0.3em] text-gold">{s.imgTag}</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mt-16 md:mt-24">
          {s.values.map((v, i) => {
            const Icon = VALUE_ICONS[i];
            return (
              <motion.div
                key={v.title}
                data-testid={VALUE_TIDS[i]}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.12 }}
                className="card-glow group relative border border-gold/15 bg-deck/70 map-grid p-6 md:p-8 transition-all duration-300 hover:border-gold/45 hover:-translate-y-1"
              >
                <span className="wax-seal grid place-items-center w-14 h-14 mb-6 transition-transform duration-500 group-hover:rotate-[-12deg] group-hover:scale-105">
                  <Icon className="w-6 h-6 text-goldlight" strokeWidth={1.6} />
                </span>
                <span aria-hidden="true" className="absolute top-4 right-5 font-decor text-xs text-gold/35">{["I", "II", "III"][i]}</span>
                <h3 className="font-display text-2xl text-bone mb-3">{v.title}</h3>
                <p className="font-fell text-base text-bone/70 leading-relaxed">{v.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
