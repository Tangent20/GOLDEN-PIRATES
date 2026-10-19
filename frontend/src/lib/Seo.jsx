import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLang } from "@/lib/i18n";

const BASE_TITLE = "GOLDEN PIRATES — Royaume 1023 | Call of Dragons";
const BASE_DESC =
  "GOLDEN PIRATES — L'alliance souveraine du Royaume 1023 (Call of Dragons). Recrutement pour la fin de la Saison 2 : rejoignez l'équipage.";
const BASE_TITLE_EN = "GOLDEN PIRATES — Kingdom 1023 | Call of Dragons";
const BASE_DESC_EN =
  "GOLDEN PIRATES — The sovereign alliance of Kingdom 1023 (Call of Dragons). End-of-Season 2 recruitment: join the crew.";
const CANONICAL_BASE = "https://golden-pirates.org";
const OG_IMAGE = "https://golden-pirates.org/og-image.png";

const ROUTES = {
  "/suivi": {
    title: "Suivre ma candidature — GOLDEN PIRATES",
    desc: "Consultez l'état de votre dossier avec votre code de suivi GP-1023-XXXX. Code perdu ? Retrouvez-le avec votre pseudo et votre Discord, ou votre puissance exacte.",
  },
  "/admin": {
    title: "Espace Conseil — GOLDEN PIRATES",
    desc: "Espace privé du Conseil des Capitaines : registre des candidatures, messagerie et exports. Accès réservé.",
    noindex: true,
  },
  "/donations": {
    title: "Le butin volontaire — GOLDEN PIRATES · Royaume 1023",
    desc: "Soutenez le navire des Golden Pirates (Royaume 1023, Call of Dragons). L'entrée du site est libre et 100 % gratuite — chaque don est un cadeau volontaire.",
  },
  "/conditions": {
    title: "Conditions générales & mentions légales — GOLDEN PIRATES",
    desc: "Mentions légales, conditions générales d'utilisation, protection des données (RGPD) et règles du bord du site des GOLDEN PIRATES (Royaume 1023, Call of Dragons). Éditeur : Charly Soudan — contact : golden.pirates@outlook.fr.",
  },
};

const setMeta = (name, content) => {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const setProp = (prop, content) => {
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", prop);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const setCanonical = (path) => {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", `${CANONICAL_BASE}${path === "/" ? "/" : path}`);
};

// Alternates hreflang pour Google / Bing / Yandex / navigateurs multilingues (Opera, Mi, Firefox...).
const setHreflangs = (path) => {
  const url = `${CANONICAL_BASE}${path === "/" ? "/" : path}`;
  const map = { fr: "fr", en: "en", "x-default": "x-default" };
  Object.entries(map).forEach(([tag]) => {
    let el = document.querySelector(`link[rel="alternate"][hreflang="${tag}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "alternate");
      el.setAttribute("hreflang", tag);
      document.head.appendChild(el);
    }
    el.setAttribute("href", url);
  });
};

// Twitter card dynamique (robuste cross-browser Chrome/Firefox/Opera/Mi/iOS Safari).
const setTwitter = (title, desc) => {
  const items = [
    ["twitter:card", "summary_large_image"],
    ["twitter:title", title],
    ["twitter:description", desc],
    ["twitter:image", OG_IMAGE],
    ["twitter:site", "@GoldenPirates1023"],
  ];
  items.forEach(([name, content]) => setMeta(name, content));
};

export default function Seo() {
  const { pathname } = useLocation();
  const { lang } = useLang();
  useEffect(() => {
    const m = ROUTES[pathname] || {};
    const isEn = lang === "en";
    const title = m.title || (isEn ? BASE_TITLE_EN : BASE_TITLE);
    const desc = m.desc || (isEn ? BASE_DESC_EN : BASE_DESC);
    const url = `${CANONICAL_BASE}${pathname === "/" ? "/" : pathname}`;
    document.title = title;
    document.documentElement.setAttribute("lang", isEn ? "en" : "fr");
    setMeta("description", desc);
    setMeta(
      "robots",
      m.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1"
    );
    setMeta("theme-color", "#06090E");
    setCanonical(pathname);
    setHreflangs(pathname);
    setProp("og:url", url);
    setProp("og:title", title);
    setProp("og:description", desc);
    setProp("og:image", OG_IMAGE);
    setProp("og:site_name", "GOLDEN PIRATES");
    setProp("og:type", "website");
    setProp("og:locale", isEn ? "en_US" : "fr_FR");
    setProp("og:locale:alternate", isEn ? "fr_FR" : "en_US");
    setTwitter(title, desc);
  }, [pathname, lang]);
  return null;
}
