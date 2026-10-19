// NOTIF-HUB — un seul fil de guet pour toutes les cloches du Royaume 1023.
// Objectif : zéro doublon de polling, pause automatique si l'onglet dort,
// et une cloche de navire qui ne sonne qu'une fois par armée (session).
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import api from "@/lib/api";

// --------------- Garde-fou visibilité (iOS/Android friendly) ---------------
let _hidden = typeof document !== "undefined" ? document.hidden : false;
const _visListeners = new Set();
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    _hidden = document.hidden;
    _visListeners.forEach((fn) => fn(_hidden));
  });
}

// --------------- Hub de polling partagé ---------------
// clef = endpoint + params ; subs = composants vivants ; data = dernière vigie.
const _hubs = new Map();
const _MIN_REFETCH_MS = 3000; // garde-fou anti-rafale même si subscribe tourne

function _ensureHub(key, fetcher, interval) {
  let h = _hubs.get(key);
  if (h) return h;
  h = {
    key,
    fetcher,
    interval,
    data: null,
    subs: new Set(),
    timer: null,
    lastFetchAt: 0,
    inFlight: false,
    purgeTimer: null,
  };
  _hubs.set(key, h);
  return h;
}

function _emit(h) {
  h.subs.forEach((s) => s());
}

async function _run(h, { force = false } = {}) {
  if (h.inFlight) return;
  if (_hidden && !force) return; // pas de poll quand l'onglet dort
  const now = Date.now();
  if (!force && now - h.lastFetchAt < _MIN_REFETCH_MS) return; // anti-rafale
  h.inFlight = true;
  h.lastFetchAt = now;
  try {
    const data = await h.fetcher();
    h.data = data;
    _emit(h);
  } catch {
    // le mât casse en silence, pas d'alerte
  } finally {
    h.inFlight = false;
  }
}

function _startTimer(h) {
  if (h.timer) return;
  h.timer = setInterval(() => _run(h), h.interval);
}
function _stopTimer(h) {
  if (!h.timer) return;
  clearInterval(h.timer);
  h.timer = null;
}

function _subscribe(h, cb) {
  // annule une purge éventuelle si on se ré-abonne juste après un unsub
  if (h.purgeTimer) {
    clearTimeout(h.purgeTimer);
    h.purgeTimer = null;
  }
  const wasEmpty = h.subs.size === 0;
  h.subs.add(cb);
  if (wasEmpty) {
    // premier abonné : lance la vigie, mais _run respecte _MIN_REFETCH_MS
    _run(h);
    if (!_hidden) _startTimer(h);
  }
  return () => {
    h.subs.delete(cb);
    if (h.subs.size === 0) {
      _stopTimer(h);
      // garde la dernière data en cache 60s pour un remount rapide
      h.purgeTimer = setTimeout(() => {
        if (h.subs.size === 0) _hubs.delete(h.key);
        h.purgeTimer = null;
      }, 60000);
    }
  };
}

// réagit globalement aux changements de visibilité
if (typeof document !== "undefined") {
  _visListeners.add((hidden) => {
    _hubs.forEach((h) => {
      if (hidden) {
        _stopTimer(h);
      } else {
        // retour sur l'onglet → fetch immédiat + relance timer
        if (h.subs.size > 0) {
          _run(h, { force: true });
          _startTimer(h);
        }
      }
    });
  });
}

// --------------- Hook recrue ---------------
// Un seul fetch /notifications/{code} partagé par Nav + Suivi.
// Intervalle 15s, pause auto hors onglet actif.
export function useRecruitNotif(code) {
  const key = code ? `recruit:${code}` : null;

  // subscribe DOIT être stable entre les renders (sinon React re-abonne en boucle
  // et déclenche une rafale de fetch à chaque render).
  const subscribe = useCallback(
    (onChange) => {
      if (!key) return () => {};
      const h = _ensureHub(
        key,
        () => api.get(`/notifications/${encodeURIComponent(code)}`).then((r) => r.data),
        15000
      );
      return _subscribe(h, onChange);
    },
    [key, code]
  );
  const getSnapshot = useCallback(
    () => (key ? _hubs.get(key)?.data ?? null : null),
    [key]
  );
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// --------------- Hook Conseil ---------------
// Un seul fetch pour /admin/stats + /admin/conversations.
export function useAdminNotif(active) {
  const key = active ? "admin:stats+conv" : null;
  const subscribe = useCallback(
    (onChange) => {
      if (!key) return () => {};
      const h = _ensureHub(
        key,
        async () => {
          const [s, cv] = await Promise.all([
            api.get("/admin/stats"),
            api.get("/admin/conversations"),
          ]);
          const unread = Array.isArray(cv.data)
            ? cv.data.reduce((acc, x) => acc + (x.unread || 0), 0)
            : 0;
          return { pending: s.data?.pending || 0, unread, stats: s.data, conversations: cv.data };
        },
        15000
      );
      return _subscribe(h, onChange);
    },
    [key]
  );
  const getSnapshot = useCallback(
    () => (key ? _hubs.get(key)?.data ?? null : null),
    [key]
  );
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// --------------- Last-seen (réengagement doux) ---------------
const LAST_SEEN_KEY = "gp_last_seen";

export function markSeen() {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  } catch {
    /* stockage indisponible */
  }
}

export function readLastSeen() {
  try {
    const v = parseInt(localStorage.getItem(LAST_SEEN_KEY) || "0", 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

// Retourne { hours, days } depuis le dernier passage, ou null si premier.
// `touch` = true met à jour le compteur à la fin (fin de session).
export function useLastSeen(active, { touch = true } = {}) {
  const [snap, setSnap] = useState(() => {
    const ls = readLastSeen();
    if (!ls) return null;
    const diff = Date.now() - ls;
    return { hours: diff / 3_600_000, days: diff / 86_400_000, lastAt: ls };
  });

  useEffect(() => {
    if (!active) return;
    // on prend un instantané du dernier passage AVANT de l'écraser,
    // puis on marque le passage courant pour la prochaine visite.
    const ls = readLastSeen();
    if (ls) {
      const diff = Date.now() - ls;
      setSnap({ hours: diff / 3_600_000, days: diff / 86_400_000, lastAt: ls });
    } else {
      setSnap(null);
    }
    if (touch) markSeen();
  }, [active, touch]);

  return snap;
}

// --------------- Cloche de navire (WebAudio synthétisée, 1x/session) ---------------
// On synthétise une cloche courte sans asset externe (compatible tous navigateurs).
let _audioCtx = null;
let _gestureArmed = false;

function _ensureCtx() {
  if (_audioCtx) return _audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _audioCtx = new AC();
  } catch {
    _audioCtx = null;
  }
  return _audioCtx;
}

// iOS/Safari verrouille l'audio tant que l'utilisateur n'a pas touché le navire.
if (typeof window !== "undefined") {
  const armOnGesture = () => {
    if (_gestureArmed) return;
    _gestureArmed = true;
    const ctx = _ensureCtx();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };
  ["pointerdown", "touchstart", "keydown"].forEach((evt) =>
    window.addEventListener(evt, armOnGesture, { once: true, passive: true })
  );
}

function _playBell(volume = 0.22) {
  const ctx = _ensureCtx();
  if (!ctx || ctx.state === "suspended") return false;
  const now = ctx.currentTime;
  // Cloche de navire : fondamentale + harmonique, decay rapide.
  const freqs = [740, 1480]; // sol#5 + sol#6
  const gains = [1.0, 0.35];
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gains[i], now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 1.15);
  });
  return true;
}

// Sonne la cloche une seule fois par session dès que `unread` passe > 0.
// Clé de session distincte par code pour que chaque recrue ait sa cloche propre.
export function useBellRing(unread, bellKey = "default") {
  useEffect(() => {
    if (!unread || unread <= 0) return;
    const sessKey = `gp_bell_rung_${bellKey}`;
    try {
      if (sessionStorage.getItem(sessKey)) return;
    } catch {
      /* sessionStorage indisponible */
    }
    const ok = _playBell();
    if (ok) {
      try {
        sessionStorage.setItem(sessKey, "1");
      } catch {
        /* nothing */
      }
    }
  }, [unread, bellKey]);
}
