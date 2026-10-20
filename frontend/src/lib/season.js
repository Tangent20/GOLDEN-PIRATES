// GOLDEN PIRATES — calendrier des saisons (source : /api/season, réglé par le Conseil).
// Phases :
//   "pre"  → avant le début de la Saison 2 (compte à rebours vers le DÉBUT DE LA SAISON 2)
//   "s2"   → Saison 2 en cours, portes de migration fermées (compte à rebours vers la FIN DE
//            SAISON 2 si la date est annoncée, sinon « date annoncée prochainement »)
//   "open" → fin de Saison 2 : les portes sont ouvertes, le Conseil embarque les recrues
import { useEffect, useState } from "react";
import api from "@/lib/api";

const FALLBACK = { s2_start: "2026-10-31T22:59:00+00:00", recruit_open: null }; // 31/10 23:59 heure de Paris
let cache = null;
let inflight = null;
const listeners = new Set();

function load(force = false) {
  if (!force && cache) return Promise.resolve(cache);
  if (!force && inflight) return inflight;
  inflight = api
    .get("/season")
    .then(({ data }) => {
      cache = { s2_start: data.s2_start || FALLBACK.s2_start, recruit_open: data.recruit_open || null };
      return cache;
    })
    .catch(() => cache || FALLBACK)
    .finally(() => {
      inflight = null;
      listeners.forEach((fn) => fn(cache || FALLBACK));
    });
  return inflight;
}

/** À appeler après un réglage du Conseil : tout le site se met à jour sans recharger. */
export const refreshSeason = () => load(true);

export function seasonPhase(cfg, now = Date.now()) {
  const s2 = new Date(cfg.s2_start).getTime();
  const open = cfg.recruit_open ? new Date(cfg.recruit_open).getTime() : null;
  if (now < s2) return { phase: "pre", target: s2 };
  if (open && now < open) return { phase: "s2", target: open };
  if (open && now >= open) return { phase: "open", target: null };
  return { phase: "s2", target: null }; // fin de saison pas encore annoncée
}

/** Hook : configuration + phase, recalculée chaque seconde si `tick`, sinon toutes les 30 s. */
export default function useSeason({ tick = false } = {}) {
  const [cfg, setCfg] = useState(cache || FALLBACK);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const on = (c) => setCfg({ ...c });
    listeners.add(on);
    load().then(on);
    return () => listeners.delete(on);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), tick ? 1000 : 30000);
    return () => clearInterval(t);
  }, [tick]);
  return { ...cfg, ...seasonPhase(cfg, now), now };
}

/** Date lisible (fuseau du visiteur) : « 31 octobre 2026 » / « 31 October 2026 ». */
export function formatSeasonDate(iso, lang = "fr") {
  if (!iso) return "";
  try {
    // Toujours en heure de Paris : même date affichée pour tous les marins, où qu'ils soient
    return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  } catch {
    return "";
  }
}
