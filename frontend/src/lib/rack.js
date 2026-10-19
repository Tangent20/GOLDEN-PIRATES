// L'ÉTAGÈRE DES BOUTEILLES — carnet local des dossiers de la recrue.
// Chaque bouteille = { code, pseudo, status, at }. Synchronisée avec le registre du Conseil :
// statut/pseudo mis à jour, bouteilles fantômes (dossier supprimé) retirées automatiquement.
import { useEffect, useState } from "react";
import api from "@/lib/api";

const RACK_KEY = "gp_bottles";
const MAX_BOTTLES = 10;
let _storageOk = true;

export function storageAvailable() {
  return _storageOk;
}

export function readRack() {
  try {
    const raw = JSON.parse(localStorage.getItem(RACK_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw
      .filter((x) => x && typeof x.code === "string" && x.code.trim())
      .map((x) => ({ ...x, code: x.code.trim().toUpperCase() }))
      .filter((x) => (seen.has(x.code) ? false : (seen.add(x.code), true)))
      .sort((a, b) => (b.at || 0) - (a.at || 0));
  } catch {
    return [];
  }
}

function writeRack(list) {
  try {
    localStorage.setItem(RACK_KEY, JSON.stringify(list.slice(0, MAX_BOTTLES)));
    _storageOk = true;
  } catch {
    _storageOk = false; // navigation privée stricte : l'appelant affiche le code à noter
  }
  window.dispatchEvent(new Event("gp_bottles_change"));
}

export function saveBottle(code, pseudo, status = "pending") {
  if (!code) return false;
  const c = String(code).trim().toUpperCase();
  const prev = readRack().filter((x) => x.code !== c);
  writeRack([{ code: c, pseudo: pseudo || "", status: status || "pending", at: Date.now() }, ...prev]);
  return _storageOk;
}

// Met à jour statut/pseudo SANS changer l'ordre (date d'enregistrement conservée).
export function updateBottle(code, patch) {
  const c = String(code || "").trim().toUpperCase();
  const list = readRack();
  let changed = false;
  const next = list.map((x) => {
    if (x.code !== c) return x;
    const merged = { ...x, ...patch };
    if (merged.status !== x.status || merged.pseudo !== x.pseudo) changed = true;
    return merged;
  });
  if (changed) writeRack(next);
}

export function removeBottle(code) {
  const c = String(code || "").trim().toUpperCase();
  const list = readRack();
  const next = list.filter((x) => x.code !== c);
  if (next.length !== list.length) writeRack(next);
}

// Synchronisation avec le registre du Conseil (1 appel groupé, n'efface pas les notifications).
let _lastSync = 0;
export async function syncRack({ force = false } = {}) {
  const list = readRack();
  if (!list.length) return;
  if (Date.now() - _lastSync < (force ? 2000 : 20000)) return;
  _lastSync = Date.now();
  try {
    const { data } = await api.post("/applications/rack-check", { codes: list.map((x) => x.code) });
    const items = data?.items || {};
    const next = list
      .filter((x) => items[x.code]?.exists !== false) // fantômes retirés
      .map((x) => {
        const s = items[x.code];
        return s?.exists ? { ...x, pseudo: s.pseudo || x.pseudo, status: s.status || x.status } : x;
      });
    const before = JSON.stringify(list);
    if (JSON.stringify(next) !== before) writeRack(next);
  } catch {
    /* hors ligne : on garde le carnet tel quel */
  }
}

export function useRack() {
  const [rack, setRack] = useState(readRack);
  useEffect(() => {
    const read = () => setRack(readRack());
    window.addEventListener("storage", read);
    window.addEventListener("gp_bottles_change", read);
    // Sync initial + refresh périodique (60s) uniquement si l'onglet est visible.
    syncRack({ force: true });
    const interval = setInterval(() => {
      if (!document.hidden) syncRack();
    }, 60000);
    const onVis = () => { if (!document.hidden) syncRack(); };
    document.addEventListener("visibilitychange", onVis);
    // Sync au retour en ligne (ex: mobile qui sort du tunnel)
    const onOnline = () => syncRack({ force: true });
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("gp_bottles_change", read);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, []);
  return rack;
}
