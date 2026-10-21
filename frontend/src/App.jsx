import { lazy, Suspense, useEffect, Component } from "react";
import { MotionConfig } from "framer-motion";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { createLenis, smoothScrollTo } from "@/lib/scroll";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider, useLang } from "@/lib/i18n";
import Seo from "@/lib/Seo";
import Grain from "@/components/Grain";

const Home = lazy(() => import("@/pages/Home"));
const Suivi = lazy(() => import("@/pages/Suivi"));
const Donations = lazy(() => import("@/pages/Donations"));
const Admin = lazy(() => import("@/pages/Admin"));
const Conditions = lazy(() => import("@/pages/Conditions"));

export function scrollToId(id) {
  smoothScrollTo(id);
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: false };
  }
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-screen bg-ink text-bone flex flex-col items-center justify-center gap-6 p-8 text-center">
          <p className="font-display text-4xl sm:text-5xl text-gold">La tempête a emporté la page…</p>
          <a href="/" className="font-mono2 text-xs tracking-[0.3em] text-gold underline underline-offset-8">
            REVENIR AU QUAI / BACK TO THE QUAY
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const tryScroll = () => {
        if (document.getElementById(id)) scrollToId(id);
      };
      const t1 = setTimeout(tryScroll, 450);
      const t2 = setTimeout(tryScroll, 1100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    // Nouvelle page : on repart du haut instantanément (Lenis compris, sans « retour élastique »)
    smoothScrollTo(0, { immediate: true });
  }, [pathname, hash]);
  return null;
}

function SkipLink() {
  const { lang } = useLang();
  return (
    <a
      href="#main-content"
      className="sr-only fixed left-4 top-4 z-[100] rounded border border-gold bg-ink px-4 py-3 font-mono2 text-xs tracking-[0.15em] text-gold focus:not-sr-only focus:outline-none"
    >
      {lang === "en" ? "SKIP TO CONTENT" : "ALLER AU CONTENU"}
    </a>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-ink text-gold grid place-items-center font-mono2 text-xs tracking-[0.3em]" role="status">
      CHARGEMENT…
    </div>
  );
}

function App() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    // Pré-décodage des grandes illustrations pendant les temps morts : quand le visiteur
    // descend, elles sont déjà prêtes → aucun « figement » au moment où elles entrent à l'écran.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    idle(() => {
      ["/img/feast-pirates.jpg", "/img/code-pieces.jpg", "/img/recit-mer.jpg", "/img/butin-tresor.jpg"].forEach((src) => {
        const im = new Image();
        im.decoding = "async";
        im.src = src;
        im.decode?.().catch(() => {});
      });
    });
    // Ordinateur : Lenis adouci ; tactile / « réduire les animations » : défilement natif (null)
    const lenis = createLenis();
    window.__lenis = lenis;
    return () => {
      lenis?.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <ErrorBoundary>
      <LangProvider>
        <MotionConfig reducedMotion="user">
          <SkipLink />
          <BrowserRouter>
            <ScrollManager />
            <Seo />
            <Grain />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/suivi" element={<Suivi />} />
                <Route path="/donations" element={<Donations />} />
                <Route path="/conditions" element={<Conditions />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Toaster
              position="top-center"
              offset={{ top: "calc(96px + env(safe-area-inset-top))" }}
              mobileOffset={{ top: "calc(76px + env(safe-area-inset-top))" }}
              theme="dark"
              toastOptions={{
                style: {
                  background: "#0F1722",
                  border: "1px solid rgba(212,175,55,0.35)",
                  color: "#E8D8C8",
                  fontFamily: "'IM Fell English', Georgia, serif",
                },
              }}
            />
          </BrowserRouter>
        </MotionConfig>
      </LangProvider>
    </ErrorBoundary>
  );
}

export default App;
