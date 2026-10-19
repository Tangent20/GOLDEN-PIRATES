import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, KeyRound, MessagesSquare, Ship, X, Check, MapPin, Shield } from "lucide-react";
import { useLang } from "@/lib/i18n";
import useRole from "@/lib/role";
import api from "@/lib/api";

const EASE = [0.16, 1, 0.3, 1];
const ICONS = [ScrollText, KeyRound, MessagesSquare, Ship];
const TIDS = ["process-step-1", "process-step-2", "process-step-3", "process-step-4"];

export default function Process() {
  const { c } = useLang();
  const s = c.process;
  const { role, latest } = useRole();
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (role !== "council") return;
    let alive = true;
    api.get("/admin/stats").then(({ data }) => alive && setStats(data || {})).catch(() => alive && setStats(null));
    return () => { alive = false; };
  }, [role]);
  const isRecruit = role === "recruit" && !!latest;
  const st = latest?.status || "pending";
  const currentIdx = isRecruit ? (st === "accepted" ? 3 : 2) : -1;
  const countFor = (i) => {
    if (!stats) return null;
    if (i === 2) return (stats.pending || 0) + (stats.reserve || 0);
    if (i === 3) return stats.accepted || 0;
    return stats.total || 0;
  };
  return (
    <section id="processus" data-testid="process-section" className="relative py-24 md:py-32 bg-deep/40 border-y border-gold/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
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
          {s.title1}<span className="text-gold">{s.titleGold}</span>
        </motion.h2>
        {(isRecruit || role === "council") && (
          <p
            data-testid="process-role-hint"
            className={`-mt-8 md:-mt-12 mb-10 md:mb-14 inline-flex max-w-full items-center gap-2 border px-4 py-2 font-mono2 text-[9px] sm:text-[10px] tracking-[0.22em] ${
              role === "council" ? "border-gold/40 bg-blood/[0.12] text-goldlight" : "border-emerald-400/40 bg-emerald-500/[0.07] text-emerald-300"
            }`}
          >
            {role === "council" ? <Shield className="w-3.5 h-3.5 shrink-0" /> : <MapPin className="w-3.5 h-3.5 shrink-0" />}
            <span className="min-w-0 break-words">{role === "council" ? s.councilHint : s.recruitHint(latest.code)}</span>
          </p>
        )}

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* la route pointillée de la carte au trésor */}
          <svg aria-hidden="true" className="hidden lg:block absolute left-[6%] right-[6%] top-[46px] h-6 w-[88%] pointer-events-none z-0" viewBox="0 0 1000 24" preserveAspectRatio="none">
            <path d="M0 12 C 120 -4, 220 28, 333 12 S 560 -4, 666 12 S 880 28, 1000 12" fill="none" stroke="rgba(212,175,55,0.45)" strokeWidth="2" strokeDasharray="7 9" vectorEffect="non-scaling-stroke" />
          </svg>
          {s.steps.map((st, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div
                key={`process-${i}`}
                data-testid={TIDS[i]}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.1 }}
                data-state={isRecruit ? (i < currentIdx ? "done" : i === currentIdx ? "current" : "todo") : undefined}
                className={`group relative border ${i === currentIdx ? "border-gold shadow-[0_0_30px_rgba(212,175,55,0.18)]" : i === 3 ? "border-blood/40" : "border-gold/15"} ${isRecruit && i < currentIdx ? "opacity-70" : ""} bg-deck/70 p-6 md:p-7 ${i === 3 ? "pb-12" : ""} overflow-hidden card-glow transition-all duration-300 hover:border-gold/45 hover:-translate-y-1`}
              >
                <span className="absolute -top-4 -right-2 font-display text-8xl text-gold/[0.14] select-none group-hover:text-gold/[0.24] transition-colors duration-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`relative grid place-items-center w-14 h-14 mb-6 rounded-full border ${i === 3 ? "wax-seal border-transparent" : "border-gold/40 bg-ink"}`}>
                  <Icon className={`w-7 h-7 ${i === 3 ? "text-goldlight" : "text-gold"}`} strokeWidth={1.4} />
                </span>
                {i === 3 && (
                  <span data-testid="process-x-marks" className="absolute bottom-4 right-5 flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.25em] text-bloodglow">
                    <X className="w-5 h-5 text-bloodglow" strokeWidth={3} />
                    <span>{c.pirate.xMarks}</span>
                  </span>
                )}
                {isRecruit && i < currentIdx && (
                  <span data-testid={`process-done-${i + 1}`} className="relative mb-3 inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.22em] text-emerald-300">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} /> {s.doneMark}
                  </span>
                )}
                {i === currentIdx && (
                  <span data-testid="process-you-are-here" className="relative mb-3 inline-flex items-center gap-1.5 gold-ingot text-ink font-mono2 text-[9px] tracking-[0.22em] px-2.5 py-1">
                    <MapPin className="w-3.5 h-3.5" /> {s.youAreHere}
                  </span>
                )}
                {role === "council" && countFor(i) !== null && (
                  <span data-testid={`process-council-count-${i + 1}`} className="relative mb-3 inline-flex items-center gap-1.5 border border-gold/40 bg-ink/70 text-gold font-mono2 text-[9px] tracking-[0.2em] px-2.5 py-1">
                    {s.councilCount(countFor(i))}
                  </span>
                )}
                <h3 className="font-display text-2xl text-bone mb-3 relative">{st.title}</h3>
                <p className="font-fell text-base text-bone/70 leading-relaxed relative">{st.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
