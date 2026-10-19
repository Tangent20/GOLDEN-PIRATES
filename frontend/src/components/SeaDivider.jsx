// LE CORDAGE — séparateur de sections : corde tressée + médaillon (crâne, boussole ou ancre).
import { SkullIcon } from "./LogoMark";
import { ShipWheel } from "./NavIcons";
import { Anchor } from "lucide-react";

export default function SeaDivider({ glyph = "skull", testid }) {
  return (
    <div data-testid={testid} aria-hidden="true" className="relative h-14 flex items-center justify-center overflow-hidden bg-ink">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rope-line opacity-40" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-ink via-transparent to-ink" />
      <span className="relative z-10 flex items-center gap-3 bg-ink px-4">
        <span className="w-1.5 h-1.5 rotate-45 bg-gold/60" />
        <span className="brass-porthole grid place-items-center w-10 h-10 bg-ink text-gold">
          {glyph === "wheel" ? (
            <ShipWheel className="w-6 h-6 wheel-idle" />
          ) : glyph === "anchor" ? (
            <Anchor className="w-5 h-5" strokeWidth={1.6} />
          ) : (
            <SkullIcon className="w-5 h-5 text-gold" />
          )}
        </span>
        <span className="w-1.5 h-1.5 rotate-45 bg-gold/60" />
      </span>
    </div>
  );
}
