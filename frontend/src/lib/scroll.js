// GOLDEN PIRATES — stratégie de défilement unique pour tout le site (visiteurs, recrues, Conseil).
//
// • Souris / pavé tactile (ordinateur) : défilement adouci Lenis, réactif (lerp) — jamais « flottant ».
// • Écran tactile (iPhone, iPad, Android) : défilement NATIF du téléphone (inertie, rebond iOS),
//   aucune boucle d'animation en tâche de fond → zéro lag, batterie préservée.
// • « Réduire les animations » activé (iOS/Android/Windows/macOS) : défilement natif instantané.
// • Zones internes (Bouteille à la Mer, Tanière, listes, menus, fenêtres) : défilent seules,
//   sans entraîner la page (allowNestedScroll + overscroll-behavior: contain).


const mq = (q) => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : false);

export const prefersReducedMotion = () => mq("(prefers-reduced-motion: reduce)");

/** Appareil purement tactile (aucune souris / pavé) → défilement natif. */
export const isTouchOnly = () => mq("(pointer: coarse)") && !mq("(any-pointer: fine)");

// Défilement NATIF partout (ordinateur, tablette, iOS, Android) : le lissage JavaScript (Lenis)
// entrait en conflit avec le défilement doux intégré des navigateurs (Chrome/Edge/Windows) et
// provoquait de petits « figements » à chaque cran de molette. Le navigateur fait mieux, seul.
// La fonction reste en place pour garder la même API (null = natif).
export function createLenis() {
  return null;
}

/** Position de l'élément dans la page, SANS les transformations CSS (animations d'apparition). */
function docTop(el) {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop || 0;
  return y;
}

const getLenis = () => (typeof window !== "undefined" ? window.__lenis : null);

/** Hauteur réelle de la barre de navigation fixe (64 px mobile, 80 px ordinateur) + marge. */
export function navOffset(extra = 12) {
  if (typeof document === "undefined") return 76;
  const h = document.querySelector("header")?.getBoundingClientRect().height || 72;
  return Math.round(h + extra);
}

/**
 * Défilement unique du site. target : nombre (px), "#id", id ou élément.
 * offset négatif = s'arrêter sous la barre de navigation.
 */
export function smoothScrollTo(target, { offset, immediate = false } = {}) {
  if (typeof window === "undefined") return;
  let el = null;
  let top = null;
  if (typeof target === "number") top = target;
  else if (typeof target === "string") el = document.getElementById(target.replace(/^#/, ""));
  else el = target;
  if (top === null && !el) return;
  const off = offset ?? (top === null ? -navOffset() : 0);
  const instant = immediate || prefersReducedMotion();
  const lenis = getLenis();
  // Cible calculée sur la mise en page réelle (les animations d'apparition décalent temporairement
  // les sections) ; correction d'arrivée UNE fois si le contenu au-dessus a changé de hauteur.
  const targetY = () => (el ? Math.max(0, docTop(el) + off) : Math.max(0, top));
  const settle = () => {
    if (!el || !el.isConnected) return;
    const delta = targetY() - window.scrollY;
    if (Math.abs(delta) <= 4) return;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    if (delta > 0 && window.scrollY >= maxY - 2) return; // bas de page atteint : rien à recaler
    if (lenis) lenis.scrollTo(targetY(), { immediate: instant, force: true, lerp: 0.18 });
    else window.scrollTo({ top: targetY(), behavior: instant ? "auto" : "smooth" });
  };
  if (lenis) {
    lenis.scrollTo(targetY(), { immediate: instant, force: true, lerp: 0.1, onComplete: () => setTimeout(settle, 80) });
    if (instant) setTimeout(settle, 80);
    return;
  }
  window.scrollTo({ top: targetY(), behavior: instant ? "auto" : "smooth" });
  if (el) {
    // Défilement natif : on attend la fin (événement scrollend si dispo, sinon délai)
    let done = false;
    const finish = () => { if (done) return; done = true; window.removeEventListener("scrollend", finish); setTimeout(settle, 80); };
    if ("onscrollend" in window) window.addEventListener("scrollend", finish, { once: true });
    setTimeout(finish, instant ? 30 : 1100);
  }
}

export const scrollToTop = (opts) => smoothScrollTo(0, opts);

// ---- Verrou de défilement (fenêtres, menu mobile) — compteur : plusieurs fenêtres sans conflit ----
let locks = 0;
let savedY = 0;
export function lockScroll() {
  if (typeof document === "undefined") return;
  locks += 1;
  if (locks > 1) return;
  savedY = window.scrollY;
  getLenis()?.stop?.();
  document.documentElement.classList.add("gp-scroll-locked");
}
export function unlockScroll() {
  if (typeof document === "undefined" || locks === 0) return;
  locks -= 1;
  if (locks > 0) return;
  document.documentElement.classList.remove("gp-scroll-locked");
  getLenis()?.start?.();
  // iOS peut ramener la page en haut après un verrou : on restaure la position exacte
  if (Math.abs(window.scrollY - savedY) > 2) window.scrollTo(0, savedY);
}
