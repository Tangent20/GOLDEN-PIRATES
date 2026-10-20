import { motion } from "framer-motion";
import { Ship } from "lucide-react";
import { useLang } from "@/lib/i18n";
import useSeason, { formatSeasonDate } from "@/lib/season";

const EASE = [0.16, 1, 0.3, 1];
const COMPASS_IMG =
  "/img/recit-mer.jpg";

const STEP_TIDS = ["timeline-step-s1", "timeline-step-prekvk", "timeline-step-s2", "timeline-step-s2end"];

export default function Timeline() {
  const { c, lang } = useLang();
  const s = c.timeline;
  const season = useSeason();
  // Étape où se trouve le navire : 1 = Pré-KvK, 2 = Saison 2, 3 = fin de Saison 2 (portes ouvertes)
  const cur = { pre: 1, s2: 2, open: 3 }[season.phase] ?? 1;
  const L = s.statusLabels;
  const statusOf = (i) => (i < cur ? L.done : i === cur ? (i === 3 ? L.openNow : L.current) : i === 3 ? L.wait : L.next);
  const dateOf = (i) =>
    i === 2
      ? s.dateFrom(formatSeasonDate(season.s2_start, lang).toUpperCase()) +
        (season.phase === "pre" ? ` · J-${Math.max(0, Math.floor((new Date(season.s2_start).getTime() - Date.now()) / 86400000))}` : "")
      : i === 3 ? (season.recruit_open ? s.dateFrom(formatSeasonDate(season.recruit_open, lang).toUpperCase()) : s.dateTbd)
        : null;
  return (
    <section id="recit" data-testid="timeline-section" className="relative py-24 md:py-32 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute right-[-10%] top-[10%] w-[40vw] max-w-[560px] opacity-[0.07] hidden md:block"
      >
        <img src={COMPASS_IMG} alt="" className="w-full h-auto rounded-full object-cover aspect-square" />
      </div>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="font-mono2 text-[11px] tracking-[0.35em] text-gold mb-5 uppercase"
        >
          {s.eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl lg:text-6xl text-bone leading-[1.02] uppercase mb-14 md:mb-20"
        >
          {s.title1}<span className="text-gold">{s.titleGoldByPhase?.[season.phase] || s.titleGold}</span>
        </motion.h2>

        <div className="relative border-l border-gold/30 ml-2 md:ml-6 space-y-12 md:space-y-16">
          {s.steps.map((st, i) => (
            <motion.div
              key={st.tid || st.season}
              data-testid={STEP_TIDS[i]}
              data-current={i === cur ? "true" : "false"}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
              className="relative pl-8 md:pl-12"
            >
              <span
                className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 ${
                  i === cur
                    ? "bg-gold border-gold shadow-[0_0_18px_rgba(212,175,55,0.8)]"
                    : i === 3
                      ? "bg-blood border-bloodglow shadow-[0_0_18px_rgba(220,38,38,0.6)]"
                      : i < cur
                        ? "bg-gold/40 border-gold/60"
                        : "bg-ink border-gold/50"
                }`}
              />
              {i === cur && (
                <>
                  <span className="absolute -left-[13px] top-[-2px] w-6 h-6 rounded-full border border-gold/50 animate-ping" />
                  <span
                    data-testid="timeline-ship-here"
                    className="absolute -left-[22px] -top-10 flex flex-col items-center pointer-events-none"
                    aria-hidden="true"
                  >
                    <Ship className="w-6 h-6 text-gold ship-bob drop-shadow-[0_0_10px_rgba(212,175,55,0.7)]" strokeWidth={1.6} />
                  </span>
                </>
              )}
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="font-mono2 text-[10px] sm:text-xs tracking-[0.3em] text-gold">{st.season}</span>
                <span
                  data-testid={`${STEP_TIDS[i]}-status`}
                  className={`border px-2.5 py-0.5 font-mono2 text-[9px] sm:text-[10px] tracking-[0.25em] ${
                    i === cur
                      ? "border-gold text-gold"
                      : i === 3
                        ? "border-blood text-bloodglow"
                        : "border-mist/40 text-mist"
                  }`}
                >
                  {statusOf(i)}
                </span>
                {dateOf(i) && (
                  <span data-testid={`${STEP_TIDS[i]}-date`} className="font-mono2 text-[9px] sm:text-[10px] tracking-[0.2em] text-goldlight/80">
                    {dateOf(i)}
                  </span>
                )}
              </div>
              <h3 className="font-display text-2xl sm:text-4xl text-bone mb-3">{st.title}</h3>
              <p className="font-fell text-base sm:text-lg text-bone/75 leading-relaxed max-w-2xl">{st.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
