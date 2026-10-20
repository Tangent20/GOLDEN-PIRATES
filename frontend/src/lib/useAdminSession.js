import { useEffect, useState } from "react";
import api from "@/lib/api";

// Session du Conseil partagée par TOUT le site (Nav, Footer, …) :
// vérifiée UNE SEULE FOIS puis mise en cache — plus jamais de requête à chaque
// changement de page, donc plus aucun bouton qui vacille en plein clic.
let isAdminCached = false;
let checkedOnce = false;
let inFlight = null;
const listeners = new Set();

export function refreshAdminSession() {
  // Dédoublonnage strict : le drapeau est posé AVANT l'attente pour que les
  // doubles montages (StrictMode Nav + Footer) partagent UNE SEULE requête.
  if (inFlight) return inFlight;
  checkedOnce = true;
  // Le backend retourne TOUJOURS 200 avec { authed: bool } — jamais de 401 bruyant.
  inFlight = api
    .get("/auth/me")
    .then((r) => { isAdminCached = !!r?.data?.authed; })
    .catch(() => { isAdminCached = false; })
    .finally(() => {
      inFlight = null;
      listeners.forEach((l) => l());
    });
  return inFlight;
}

// Vrai une fois la toute première vérification terminée (évite le vacillement du rôle).
export function adminSessionResolved() {
  return checkedOnce && !inFlight;
}

export default function useAdminSession() {
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    if (!checkedOnce) refreshAdminSession();
    // Connexion / déconnexion ailleurs dans le site → tout le monde se met à jour
    const onAuth = () => refreshAdminSession();
    window.addEventListener("gp-auth-changed", onAuth);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("gp-auth-changed", onAuth);
    };
  }, []);

  return isAdminCached;
}
