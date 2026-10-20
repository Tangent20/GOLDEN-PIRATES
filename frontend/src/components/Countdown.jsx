import { motion, AnimatePresence } from "framer-motion";
import { Hourglass, Check, Flame, Anchor } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { scrollToId } from "@/App";
import { useNavigate } from "react-router-dom";
import useRole from "@/lib/role";
import useSeason, { formatSeasonDate } from "@/lib/season";

// Calendrier : SOURCE UNIQUE = réglage du Conseil (/api/season, onglet « Calendrier » de l'Espace Conseil).
// La mèche se consume sur les 30 derniers jours avant l'échéance affichée.
const FUSE_DAYS = 30;

function splitMs(ms) {
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

function OpenPlate({ k, plate }) {
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
          <Anchor className="w-4 h-4" /> {plate.eyebrow}
        </p>
        <p className="font-fell italic text-base sm:text-lg text-bone/90 leading-relaxed mb-5">{plate.title}</p>
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
  const { c, lang } = useLang();
  const k = c.countdown;
  const season = useSeason({ tick: true });
  const { phase, target, now } = season;
  const ms = target ? Math.max(0, target - now) : 0;
  const { d, h, m, s } = splitMs(ms);

  // TICKET DE RECRUTEMENT (formulaire + Espace Recrue) : il ne parle QUE de l'ouverture des portes
  // (fin de Saison 2) — jamais du début de la Saison 2, qui n'intéresse pas une candidature.
  if (variant === "line") {
    const r = k.recruit;
    const openAt = season.recruit_open ? new Date(season.recruit_open).getTime() : null;
    const box = "inline-flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 border px-4 py-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.22em] sm:tracking-[0.3em]";
    if (phase === "open" || (openAt && openAt <= now)) {
      return (
        <p data-testid={testid} data-phase="open" className={`${box} border-emerald-400/50 bg-emerald-500/10 text-emerald-200`}>
          <Anchor className="w-3.5 h-3.5 shrink-0" /> <span>{k.open.line}</span>
        </p>
      );
    }
    if (openAt) {
      const left = splitMs(openAt - now);
      return (
        <p data-testid={testid} data-phase={phase} data-mode="countdown" className={`${box} border-gold/30 bg-ink/50 text-gold`}>
          <Flame className="w-3.5 h-3.5 text-bloodglow shrink-0 animate-pulse" />
          <span>{r.gates}</span>
          <span data-testid={`${testid}-timer`} className="whitespace-nowrap text-goldlight">
            J-{left.d} · {String(left.h).padStart(2, "0")}H{String(left.m).padStart(2, "0")}
          </span>
          <span className="whitespace-nowrap text-mist">· {formatSeasonDate(season.recruit_open, lang)}</span>
          <span data-testid={`${testid}-status`} className="inline-flex items-center gap-1.5 whitespace-nowrap text-emerald-300">
            <Check className="w-3.5 h-3.5" /> {r.recruitOpen}
          </span>
        </p>
      );
    }
    return (
      <p data-testid={testid} data-phase={phase} data-mode="tbd" title={r.hint} className={`${box} border-gold/30 bg-ink/50 text-gold`}>
        <Hourglass className="w-3.5 h-3.5 text-gold shrink-0" />
        <span>{r.gates} : {r.unknown}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-emerald-300">
          <Check className="w-3.5 h-3.5" /> <span data-testid={`${testid}-status`}>{r.applyNow}</span>
        </span>
      </p>
    );
  }

  // Pas (ou plus) de compte à rebours : Saison 2 lancée sans date de fin annoncée, ou portes ouvertes
  if (!target || ms <= 0) {
    const plate = phase === "open" ? k.open : k.s2Unknown;
    if (variant === "hero") return <div data-testid={testid} data-phase={phase}><OpenPlate k={k} plate={plate} /></div>;
    return (
      <p data-testid={testid} data-phase={phase} className="inline-flex max-w-full flex-wrap items-center gap-2 border border-gold/30 bg-ink/50 px-4 py-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.22em] sm:tracking-[0.3em] text-gold">
        <Flame className="w-3.5 h-3.5 text-bloodglow shrink-0" /> <span>{plate.line}</span>
      </p>
    );
  }

  const step = phase === "pre" ? k.pre : k.s2;
  const dateTxt = formatSeasonDate(phase === "pre" ? season.s2_start : season.recruit_open, lang);

  if (variant === "line") {
    return (
      <p
        data-testid={testid}
        data-phase={phase}
        title={step.note(dateTxt)}
        className="inline-flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 border border-gold/30 bg-ink/50 px-4 py-2 font-mono2 text-[10px] sm:text-[11px] tracking-[0.22em] sm:tracking-[0.3em] text-gold"
      >
        <Flame className="w-3.5 h-3.5 text-bloodglow shrink-0 animate-pulse" />
        <span>{step.line}</span>
        <span className="whitespace-nowrap text-goldlight">
          J-{d} · {String(h).padStart(2, "0")}H{String(m).padStart(2, "0")}
        </span>
        <span className="whitespace-nowrap text-mist">· {dateTxt}</span>
      </p>
    );
  }

  const total = FUSE_DAYS * 86400000;
  const burned = Math.min(100, Math.max(0, 100 - (ms / total) * 100));
  const cells = [
    [d, k.days],
    [h, k.hours],
    [m, k.minutes],
    [s, k.seconds],
  ];
  return (
    <div data-testid={testid} data-phase={phase} className="relative overflow-hidden border border-gold/40 bg-deck/80 backdrop-blur p-5 sm:p-6">
      <Embers />
      <div className="relative z-10">
        <p className="flex items-center gap-2 font-mono2 text-[9px] sm:text-[10px] tracking-[0.3em] text-gold mb-3">
          <Flame className="w-4 h-4 text-bloodglow shrink-0 animate-pulse" /> {step.label}
        </p>
        <div className="inline-flex items-stretch border border-gold/25 bg-ink/70 divide-x divide-gold/20">
          {cells.map(([v, label]) => (
            <Digit key={label} value={v} label={label} />
          ))}
        </div>
        <p className="font-fell italic text-sm text-mist mt-3">{step.note(dateTxt)}</p>
        <div className="relative h-1.5 mt-4 bg-ink border border-gold/20">
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
