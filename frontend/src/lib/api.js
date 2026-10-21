import axios from "axios";

const backendOrigin = (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/$/, "");

const api = axios.create({
  // Domaine unique (reverse proxy) par défaut ; URL absolue seulement si l’API est séparée.
  baseURL: backendOrigin ? `${backendOrigin}/api` : "/api",
  withCredentials: true,
  timeout: 15000,
});

export function formatApiError(e) {
  const detail = e?.response?.data?.detail;
  if (detail == null) return "Quelque chose a tourné à l'aiguière — réessaie.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((x) => (x && typeof x.msg === "string" ? x.msg : JSON.stringify(x)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

/**
 * Fuseau IANA du navigateur, à passer aux endpoints PDF/XLSX pour que
 * chaque reçu/export affiche l'heure dans le fuseau du téléchargeur.
 * Retombe sur "Europe/Paris" si l'API Intl est indisponible.
 */
export function getBrowserTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
  } catch {
    return "Europe/Paris";
  }
}

export default api;
