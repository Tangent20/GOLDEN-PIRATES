import { useEffect, Component } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/lib/i18n";
import Seo from "@/lib/Seo";
import Grain from "@/components/Grain";
import Home from "@/pages/Home";
import Suivi from "@/pages/Suivi";
import Donations from "@/pages/Donations";
import Admin from "@/pages/Admin";
import Conditions from "@/pages/Conditions";

export function scrollToId(id) {
  const lenis = typeof window !== "undefined" ? window.__lenis : null;
  if (lenis) lenis.scrollTo(`#${id}`, { offset: -76, duration: 1.2 });
  else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__lenis = lenis;
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <ErrorBoundary>
      <LangProvider>
        <BrowserRouter>
          <ScrollManager />
          <Seo />
          <Grain />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/suivi" element={<Suivi />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/conditions" element={<Conditions />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
      </LangProvider>
    </ErrorBoundary>
  );
}

export default App;
