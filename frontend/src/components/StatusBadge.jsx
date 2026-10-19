import { useLang } from "@/lib/i18n";

const STYLE = {
  pending: "border-gold/60 text-gold bg-gold/10",
  accepted: "border-emerald-500/60 text-emerald-400 bg-emerald-500/10",
  rejected: "border-blood/70 text-bloodglow bg-blood/10",
  reserve: "border-amber-500/60 text-amber-400 bg-amber-500/10",
};

const DOT = { pending: "bg-gold", accepted: "bg-emerald-400", rejected: "bg-bloodglow", reserve: "bg-amber-400" };

export default function StatusBadge({ status, testid = "status-badge", size = "sm" }) {
  const { c } = useLang();
  const meta = c.status[status] || c.status.pending;
  return (
    <span
      data-testid={testid}
      className={`inline-flex items-center gap-2 whitespace-nowrap border font-mono2 tracking-[0.25em] ${STYLE[status] || STYLE.pending} ${
        size === "lg" ? "px-5 py-2 text-xs" : "px-2.5 py-1 text-[9px]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[status] || DOT.pending}`} />
      {meta.label}
    </span>
  );
}
