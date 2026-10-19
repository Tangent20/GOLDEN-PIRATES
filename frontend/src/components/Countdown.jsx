import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Anchor } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { scrollToId } from "@/App";
import { useNavigate } from "react-router-dom";
import useRole from "@/lib/role";

// Date d'ouverture de la saison — SOURCE UNIQUE, ajustable ici uniquement.
export const OPENING_AT = new Date("2026-10-31T23:59:59Z");
// La mèche se consume sur 30 jours avant l'ouverture.
const FUSE_START = OPENING_AT.getTime() - 30 * 86400000;

function useRemaining() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, OPENING_AT.getTime() - now);
  return {
    ms,
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  };
}

function Digit({ value, label }) {
  const txt = String(value).padStart(2, "0");
  return (
    <div className="relative px-3 sm:px-5 py-3 text-center min-w-[64px] sm:min-w-[80px]">
      <div className="relative h-[42px] sm:h-[50px] overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.p
            key={txt}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute inset-0 font-display text-3xl sm:text-4xl text-gold tabular-nums"
          >
            {txt}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="font-mono2 text-[8px] sm:text-[9px] tracking-[0.3em] text-mist mt-1">{label}</p>
    </div>
  );
}

function Embers() {
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.span
          key={i}
          className="absolute w-1 h-1 rounded-full bg-gold/70 pointer-events-none"
          style={{ left: `${10 + i * 15}%`, bottom: "6px" }}
          animate={{ y: [0, -(60 + i * 8)], opacity: [0, 0.9, 0] }}
          transition={{ duration: 2.6 + i * 0.35, repeat: Infinity, delay: i * 0.55, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

function OpenPlate({ k }) {
  const navigate = useNavigate();
  const { role, latest } = useRole();
  const isRecruit = role === "recruit" && !!latest;
  const onCta = () => {
    if (role === "council") navigate("/admin#registry", { state: { navTs: Date.now() } });
    else if (isRecruit) navigate("/suivi#dossier", { state: { navTs: Date.now() } });
    else scrollToId("postuler");
  };
  return (
    <div className="relative overflow-hidden border border-gold bg-deck/90 p-6 sm:p-7" data-testid="countdown-open-plate">
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gold/10 blur-xl"
        animate={{ x: ["-120%", "340%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
      />
      <Embers />
      <div className="relative z-10">
        <p className="flex items-center gap-2 font-mono2 text-[9px] sm:text-[10px] tracking-[0.3em] text-gold mb-3">
          <Anchor className="w-4 h-4" /> {k.openEyebrow}
        </p>
        <p className="font-fell italic text-base sm:text-lg text-bone/90 leading-relaxed mb-5">{k.openTitle}</p>
        <button
          data-testid="countdown-open-cta"
          data-role={role}
          onClick={onCta}
          className="font-display text-xl sm:text-2xl tracking-wider uppercase px-8 py-3.5 bg-gold text-ink hover:bg-goldlight hover:shadow-[0_0_45px_rgba(212,175,55,0.5)] transition-all duration-300"
        >
          {role === "council" ? k.openCtaCouncil : isRecruit ? k.openCtaRecruit : k.openCta}
        </button>
      </div>
    </div>
  );
}

export default function Countdown({ variant = "hero", testid = "countdown" }) {
  const { c } = useLang();
  const k = c.countdown;
  const { ms, d, h, m, s } = useRemaining();

  if (ms <= 0) {
    if (variant === "hero") return <div data-testid={testid}><OpenPlate k={k} /></div>;
    return (
      <p data-testid={testid} className="inline-flex items-center gap-2 border border-gold/30 bg-ink/50 px-4 py-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.3em] text-gold">
        <Flame className="w-3.5 h-3.5 text-bloodglow shrink-0" /> {k.open}
      </p>
    );
  }

  if (variant === "line") {
    return (
      <p
        data-testid={testid}
        className="inline-flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 border border-gold/30 bg-ink/50 px-4 py-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.22em] sm:tracking-[0.3em] text-gold"
      >
        <Flame className="w-3.5 h-3.5 text-bloodglow shrink-0 animate-pulse" />
        <span>{k.lineLabel}</span>
        <span className="whitespace-nowrap text-goldlight">
          J-{d} · {String(h).padStart(2, "0")}H{String(m).padStart(2, "0")}
        </span>
      </p>
    );
  }

  const burned = Math.min(100, Math.max(0, 100 - (ms / (OPENING_AT.getTime() - FUSE_START)) * 100));
  const cells = [
    [d, k.days],
    [h, k.hours],
    [m, k.minutes],
    [s, k.seconds],
  ];
  return (
    <div data-testid={testid} className="relative overflow-hidden border border-gold/40 bg-deck/80 backdrop-blur p-5 sm:p-6">
      <Embers />
      <div className="relative z-10">
        <p className="flex items-center gap-2 font-mono2 text-[9px] sm:text-[10px] tracking-[0.3em] text-gold mb-3">
          <Flame className="w-4 h-4 text-bloodglow shrink-0 animate-pulse" /> {k.label}
        </p>
        <div className="inline-flex items-stretch border border-gold/25 bg-ink/70 divide-x divide-gold/20">
          {cells.map(([v, label]) => (
            <Digit key={label} value={v} label={label} />
          ))}
        </div>
        <div className="relative h-1.5 mt-5 bg-ink border border-gold/20">
          <div className="absolute inset-y-0 left-0 bg-bloodglow/30" style={{ width: `${burned}%` }} />
          <div className="absolute inset-y-0 right-0 bg-gold" style={{ width: `${100 - burned}%` }} />
          <Flame
            className="absolute -top-[7px] w-3.5 h-3.5 text-bloodglow drop-shadow-[0_0_6px_rgba(200,60,60,0.8)]"
            style={{ left: `calc(${burned}% - 7px)` }}
          />
        </div>
      </div>
    </div>
  );
}
