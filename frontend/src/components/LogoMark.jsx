export const SkullIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <path
      d="M32 8c-10.5 0-18 7.6-18 17.6 0 6.2 3 11.3 7.6 14.4V49c0 2.2 1.8 4 4 4h12.8c2.2 0 4-1.8 4-4v-9c4.6-3.1 7.6-8.2 7.6-14.4C50 15.6 42.5 8 32 8Z"
      fill="currentColor"
    />
    <circle cx="24.5" cy="26" r="4.2" fill="#06090E" />
    <circle cx="39.5" cy="26" r="4.2" fill="#06090E" />
    <path d="M32 32.5l-2.4 5.4h4.8L32 32.5Z" fill="#06090E" />
    <path d="M27 53v4M32 53.5v4M37 53v4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

export default function LogoMark({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="29" stroke="#D4AF37" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="23.5" stroke="#D4AF37" strokeWidth="0.75" opacity="0.5" />
      <path d="M32 4 L35.2 28.8 L32 32 L28.8 28.8 Z" fill="#D4AF37" />
      <path d="M32 60 L28.8 35.2 L32 32 L35.2 35.2 Z" fill="#D4AF37" />
      <path d="M4 32 L28.8 28.8 L32 32 L28.8 35.2 Z" fill="#D4AF37" opacity="0.75" />
      <path d="M60 32 L35.2 35.2 L32 32 L35.2 28.8 Z" fill="#D4AF37" opacity="0.75" />
      <path d="M12.2 12.2 L28.4 26.6 L26.6 28.4 Z" fill="#D4AF37" opacity="0.4" />
      <path d="M51.8 12.2 L37.4 28.4 L35.6 26.6 Z" fill="#D4AF37" opacity="0.4" />
      <path d="M12.2 51.8 L26.6 35.6 L28.4 37.4 Z" fill="#D4AF37" opacity="0.4" />
      <path d="M51.8 51.8 L35.6 37.4 L37.4 35.6 Z" fill="#D4AF37" opacity="0.4" />
      <circle cx="32" cy="32" r="9" fill="#D4AF37" />
      <circle cx="32" cy="32" r="9" stroke="#06090E" strokeWidth="1" />
      <circle cx="28.6" cy="30.2" r="2" fill="#06090E" />
      <circle cx="35.4" cy="30.2" r="2" fill="#06090E" />
      <path d="M29.4 36.4h5.2" stroke="#06090E" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export const CompassRose = ({ className = "" }) => (
  <svg viewBox="0 0 200 200" fill="none" className={className} aria-hidden="true">
    <circle cx="100" cy="100" r="96" stroke="#D4AF37" strokeWidth="1" opacity="0.55" />
    <circle cx="100" cy="100" r="78" stroke="#D4AF37" strokeWidth="0.6" opacity="0.35" />
    <circle cx="100" cy="100" r="60" stroke="#D4AF37" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.5" />
    <path d="M100 8 L110 90 L100 100 L90 90 Z" fill="#D4AF37" />
    <path d="M100 192 L90 110 L100 100 L110 110 Z" fill="#9A7B1C" opacity="0.8" />
    <path d="M8 100 L90 90 L100 100 L90 110 Z" fill="#9A7B1C" opacity="0.8" />
    <path d="M192 100 L110 110 L100 100 L110 90 Z" fill="#D4AF37" />
    <circle cx="100" cy="100" r="14" fill="#06090E" stroke="#D4AF37" strokeWidth="1.5" />
    <circle cx="100" cy="100" r="4" fill="#B91C1C" />
  </svg>
);
