import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ChevronDown, Swords, Telescope, MessagesSquare, Skull, ScrollText } from "lucide-react";
import { scrollToId } from "@/App";
import { useLang } from "@/lib/i18n";
import useRole from "@/lib/role";

const EASE = [0.16, 1, 0.3, 1];
const HERO_BG =
  "https://images.pexels.com/photos/38427508/pexels-photo-38427508.jpeg?auto=compress&cs=tinysrgb&w=1800";

// Poussière d'or qui monte des cales — positions fixes (aucun saut entre deux rendus)
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: (i * 1.37) % 9,
  dur: 9 + ((i * 7) % 8),
  size: 2 + (i % 3),
  drift: ((i % 5) - 2) * 18,
}));

function CompassRose({ className = "" }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={className} aria-hidden="true">
      <circle cx="100" cy="100" r="96" stroke="#D4AF37" strokeWidth="1" opacity="0.55" />
      <circle cx="100" cy="100" r="78" stroke="#D4AF37" strokeWidth="0.6" opacity="0.35" />
      <circle cx="100" cy="100" r="60" stroke="#D4AF37" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.5" />
      <path d="M100 8 L110 90 L100 100 L90 90 Z" fill="#D4AF37" />
      <path d="M100 192 L90 110 L100 100 L110 110 Z" fill="#9A7B1C" opacity="0.8" />
      <path d="M8 100 L90 90 L100 100 L90 110 Z" fill="#9A7B1C" opacity="0.8" />
      <path d="M192 100 L110 110 L100 100 L110 90 Z" fill="#D4AF37" />
      {[
        [38, 38, 82, 86], [162, 38, 118, 86], [38, 162, 82, 114], [162, 162, 118, 114],
      ].map(([x1, y1, x2, y2], i) => (
        <path key={i} d={`M${x1} ${y1} L${x2} ${y2} L${x2} ${y1} Z`} fill="#D4AF37" opacity="0.35" />
      ))}
      <text x="100" y="30" textAnchor="middle" fill="#D4AF37" fontSize="12" fontFamily="Cinzel Decorative, serif" opacity="0.8">N</text>
      <circle cx="100" cy="100" r="14" fill="#06090E" stroke="#D4AF37" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="4" fill="#B91C1C" />
    </svg>
  );
}

// Houle animée au pied du héros
const WAVE = "M0 30 Q 45 10 90 30 T 180 30 T 270 30 T 360 30 T 450 30 T 540 30 T 630 30 T 720 30 V60 H0 Z";
function Waves() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 sm:h-28 overflow-hidden z-[1]">
      <svg className="absolute bottom-3 sm:bottom-6 left-0 w-[200%] h-10 sm:h-12 wave-drift-slow opacity-70" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d={WAVE} transform="scale(1,1)" fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.25)" strokeWidth="1" />
        <path d={WAVE} transform="translate(720,0)" fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.25)" strokeWidth="1" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-[200%] h-12 sm:h-16 wave-drift" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d={WAVE} fill="#06090E" opacity="0.92" />
        <path d={WAVE} transform="translate(720,0)" fill="#06090E" opacity="0.92" />
      </svg>
    </div>
  );
}

const RevealLine = ({ children, delay, className = "" }) => (
  <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
    <motion.span
      className={`block ${className}`}
      initial={{ y: "115%" }}
      animate={{ y: "0%" }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      {children}
    </motion.span>
  </span>
);

const MAIN_BTN =
  "plank-cut gold-ingot inline-flex items-center justify-center gap-3 font-display text-xl sm:text-2xl tracking-wider uppercase px-10 sm:px-12 py-4 text-ink active:translate-y-px transition-transform";
const ALT_BTN =
  "group relative inline-flex items-center justify-center gap-3 font-display text-xl sm:text-2xl tracking-wider uppercase px-10 py-4 border border-gold/50 bg-ink/55 backdrop-blur text-gold hover:border-gold hover:bg-gold/10 transition-all duration-300";

const Corner = () => (
  <>
    <span aria-hidden="true" className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-ink border border-gold/70" />
    <span aria-hidden="true" className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-ink border border-gold/70" />
  </>
);

export default function Hero() {
  const { c } = useLang();
  const s = c.hero;
  const p = c.pirate;
  const navigate = useNavigate();
  const { role, latest } = useRole();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);
  const contentFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), { stiffness: 50, damping: 16 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-16, 16]), { stiffness: 50, damping: 16 });

  const onMouseMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const go = (path) => navigate(path, { state: { navTs: Date.now() } });
  const welcome =
    role === "recruit"
      ? p.welcome.recruit((latest?.pseudo || "MATELOT").toUpperCase())
      : p.welcome[role];

  let ctas;
  if (role === "recruit") {
    ctas = (
      <>
        <button data-testid="hero-cta-recruit-dossier" onClick={() => go("/suivi#dossier")} className={MAIN_BTN}>
          <Telescope className="w-5 h-5" /> {p.heroCta.recruitMain}
        </button>
        <button data-testid="hero-cta-recruit-mer" onClick={() => go("/suivi#mer")} className={ALT_BTN}>
          <Corner /> <MessagesSquare className="w-5 h-5" /> {p.heroCta.recruitAlt}
        </button>
      </>
    );
  } else if (role === "council") {
    ctas = (
      <>
        <button data-testid="hero-cta-council-deck" onClick={() => go("/admin#registry")} className={MAIN_BTN}>
          <ScrollText className="w-5 h-5" /> {p.heroCta.councilMain}
        </button>
        <button data-testid="hero-cta-council-messages" onClick={() => go("/admin#messagerie")} className={ALT_BTN}>
          <Corner /> <MessagesSquare className="w-5 h-5" /> {p.heroCta.councilAlt}
        </button>
      </>
    );
  } else {
    ctas = (
      <>
        <button data-testid="hero-cta-apply" onClick={() => scrollToId("postuler")} className={MAIN_BTN}>
          <Swords className="w-5 h-5" /> {s.ctaApply}
        </button>
        <button data-testid="hero-cta-track" onClick={() => go("/suivi")} className={ALT_BTN}>
          <Corner /> {s.ctaTrack}
        </button>
      </>
    );
  }

  return (
    <section
      ref={ref}
      data-testid="hero-section"
      data-role={role}
      onMouseMove={onMouseMove}
      className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden pb-10 sm:pb-0"
    >
      <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale }}>
        <img src={HERO_BG} alt={s.imgAlt} className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/55 to-ink hero-veil" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,9,14,0.85)_85%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/3 h-1/2 bg-[radial-gradient(ellipse_at_30%_40%,rgba(120,150,170,0.14),transparent_60%)] animate-fog"
      />
      {/* éclair d'orage lointain */}
      <div aria-hidden="true" className="absolute inset-0 storm-flash pointer-events-none" />
      {/* lueur de lanterne */}
      <div
        aria-hidden="true"
        className="absolute -left-32 bottom-0 w-[60vw] max-w-[700px] h-[60vh] bg-[radial-gradient(ellipse_at_center,rgba(212,140,40,0.16),transparent_65%)] lantern-flicker pointer-events-none"
      />
      {/* poussière d'or */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="hero-embers">
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="ember"
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              animationDelay: `${e.delay}s`,
              animationDuration: `${e.dur}s`,
              "--drift": `${e.drift}px`,
            }}
          />
        ))}
      </div>

      <motion.div
        aria-hidden="true"
        className="absolute right-[-8%] top-1/2 -translate-y-1/2 hidden lg:block w-[46vw] max-w-[640px] opacity-[0.5]"
        style={{ rotateX, rotateY, transformPerspective: 1000 }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 2, ease: EASE, delay: 0.6 }}
      >
        <div className="animate-spin-slow">
          <CompassRose className="w-full h-auto drop-shadow-[0_0_35px_rgba(212,175,55,0.25)]" />
        </div>
      </motion.div>

      <Waves />

      <motion.div
        style={{ opacity: contentFade, y: contentY }}
        className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-8 pt-24 md:pt-16"
      >
        <RevealLine delay={0.15}>
          <div className="flex flex-wrap items-center gap-2.5 mb-6 md:mb-8" data-testid="hero-badge-kvk">
            <span className="inline-flex items-center gap-2 border border-gold/40 bg-ink/60 backdrop-blur px-4 py-1.5 font-mono2 text-[10px] sm:text-xs tracking-[0.3em] text-gold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bloodglow opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blood" />
              </span>
              {s.ribbon}
            </span>
          </div>
        </RevealLine>

        <h1 data-testid="hero-title" className="leading-[0.88]">
          <RevealLine delay={0.3} className="font-display text-[clamp(4.2rem,15vw,12rem)] text-gold text-glow-gold">
            GOLDEN
          </RevealLine>
          <RevealLine delay={0.44} className="font-display text-[clamp(4.2rem,15vw,12rem)] text-stroke-gold">
            PIRATES
          </RevealLine>
        </h1>

        <RevealLine delay={0.55}>
          <p
            data-testid="hero-welcome"
            data-role={role}
            className="mt-5 md:mt-6 inline-flex items-start sm:items-center gap-2.5 font-mono2 text-[10px] sm:text-xs tracking-[0.25em] sm:tracking-[0.3em] text-goldlight max-w-full"
          >
            <Skull className="w-3.5 h-3.5 text-bloodglow shrink-0 mt-px sm:mt-0" />
            <span className="break-words min-w-0">{welcome}</span>
            <span className="hidden sm:block h-px w-16 bg-gradient-to-r from-gold/70 to-transparent" />
          </p>
        </RevealLine>

        <RevealLine delay={0.62}>
          <p data-testid="hero-subtitle" className="font-fell italic text-base sm:text-xl md:text-2xl text-bone/90 mt-4 md:mt-5 max-w-2xl">
            {s.sub}
          </p>
        </RevealLine>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 sm:gap-5 mt-9 md:mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
        >
          <span className="inline-flex flex-col sm:flex-row gap-4 sm:gap-5">
            {ctas}
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 mt-12 sm:mt-0 sm:absolute sm:bottom-0 sm:inset-x-0 border-t border-gold/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 1 }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-6 font-mono2 text-[10px] tracking-[0.35em] text-bone/50">
            <span>{s.chips[0]}</span>
            <span className="text-gold/50">✦</span>
            <span>{s.chips[1]}</span>
            <span className="text-gold/50">✦</span>
            <span>{s.chips[2]}</span>
          </div>
          <button
            data-testid="hero-scroll-cue"
            onClick={() => scrollToId("alliance")}
            className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.35em] uppercase text-gold/80 hover:text-gold transition-colors mx-auto sm:mx-0"
          >
            {s.scroll}
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
