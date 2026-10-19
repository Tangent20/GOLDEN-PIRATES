// Iconographie de la barre de navigation — 100 % maison, 100 % pirate.

const SPOKES = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

export const ShipWheel = ({ className = "w-6 h-6", hub = "#B91C1C" }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    {SPOKES.map((a, i) => (
      <g key={i}>
        <line
          x1={32 + Math.cos(a) * 6}
          y1={32 + Math.sin(a) * 6}
          x2={32 + Math.cos(a) * 25}
          y2={32 + Math.sin(a) * 25}
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx={32 + Math.cos(a) * 27.6} cy={32 + Math.sin(a) * 27.6} r="2.7" fill="currentColor" />
      </g>
    ))}
    <circle cx="32" cy="32" r="18.5" stroke="currentColor" strokeWidth="3.4" />
    <circle cx="32" cy="32" r="14.6" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
    <circle cx="32" cy="32" r="6.6" fill="currentColor" />
    {hub && <circle cx="32" cy="32" r="2.5" fill={hub} />}
  </svg>
);

// Le fanion qui pend sous la corde : marque l'onglet actif.
export const HangingPennant = ({ className = "w-5 h-7" }) => (
  <svg viewBox="0 0 22 30" className={className} aria-hidden="true">
    <path d="M1 0.5H21V28.5L11 21.5L1 28.5Z" fill="#7A0E0E" stroke="#D4AF37" strokeWidth="1.2" />
    <circle cx="11" cy="9.6" r="4.1" fill="#D4AF37" />
    <circle cx="9.5" cy="9.4" r="1.05" fill="#7A0E0E" />
    <circle cx="12.5" cy="9.4" r="1.05" fill="#7A0E0E" />
    <path d="M8 16.2l6-3M8 13.2l6 3" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// Deux sabres croisés — bouton de fermeture de la carte.
export const CrossedSabres = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path d="M5 5l17 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M27 5L10 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M19.5 24.5l5-5M7.5 19.5l5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="25.6" cy="25.6" r="1.9" fill="currentColor" />
    <circle cx="6.4" cy="25.6" r="1.9" fill="currentColor" />
  </svg>
);
