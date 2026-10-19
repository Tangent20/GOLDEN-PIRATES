// QUI EST À BORD ? — visiteur, recrue ou Conseil. Partagé par la barre, le héros, le formulaire.
import useAdminSession, { adminSessionResolved } from "@/lib/useAdminSession";
import { useRack } from "@/lib/rack";

function readAuthHint() {
  try {
    return sessionStorage.getItem("gp-auth-ok") === "1";
  } catch {
    return false;
  }
}

export default function useRole() {
  const isAdmin = useAdminSession();
  const rack = useRack();
  // Le Conseil prime ; avant la toute première vérification, l'indice de session évite le vacillement.
  const council = isAdmin || (!adminSessionResolved() && readAuthHint());
  const latest = rack[0] || null;
  const role = council ? "council" : latest ? "recruit" : "visitor";
  return { role, isAdmin, latest, rack };
}
