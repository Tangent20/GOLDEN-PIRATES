import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, MessageSquare, ArrowLeft, Send, Users, Anchor as AnchorIcon, Lock, Gauge, Feather } from "lucide-react";
import { useLang } from "@/lib/i18n";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const EASE = [0.22, 1, 0.36, 1];
const POWER_RANGES = [
  { min: null, max: 6 },
  { min: 6, max: 10 },
  { min: 10, max: 15 },
  { min: 15, max: 20 },
  { min: 20, max: null },
];

export default function PeerDen({ code, myName = "", initialNote = "" }) {
  const { c, lang } = useLang();
  const s = c.suivi;
  const p = s.peer;
  const al = c.apply.labels;
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [threads, setThreads] = useState(null);
  const [active, setActive] = useState(null);
  const [profile, setProfile] = useState(null);
  const [note, setNote] = useState(initialNote);
  const [noteSaved, setNoteSaved] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const searchGen = useRef(0);
  const [range, setRange] = useState(0); // 0 = toutes les puissances
  const listRef = useRef(null);

  // Auto-scroll au bas du fil quand les messages changent (envoi, réception, ouverture).
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // double rAF pour laisser le DOM poser la hauteur avant de scroller (iOS Safari).
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    }));
  }, [msgs, active]);

  // Tranches de puissance en millions (bornes : min inclus, max exclu)
  const search = useCallback(async (value) => {
    const q = (typeof value === "string" ? value : query).trim();
    const hasRange = range > 0;
    if (q.length < 2 && !hasRange) { setResults(null); return; }
    const gen = ++searchGen.current;
    setBusy(true);
    setError("");
    try {
      const r = POWER_RANGES[range - 1];
      const { data } = await api.get("/peers/search", { params: {
        q, code,
        ...(range > 0 ? { min_power: r.min ?? undefined, max_power: r.max ?? undefined } : {}),
      } });
      if (gen !== searchGen.current) return;
      const ql = q.toLowerCase();
      setResults([...data].sort((a, b) => {
        const pa = q.length >= 2 && a.pseudo.toLowerCase().startsWith(ql) ? 0 : 1;
        const pb = q.length >= 2 && b.pseudo.toLowerCase().startsWith(ql) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return a.pseudo.localeCompare(b.pseudo, undefined, { sensitivity: "base" });
      }));
    } catch (err) {
      if (gen !== searchGen.current) return;
      setError(err?.response?.data?.detail || p.error);
      setResults(null);
    } finally {
      if (gen === searchGen.current) setBusy(false);
    }
  }, [code, p.error, query, range]);

  // Recherche en direct : résultats dès 2 lettres (ou une tranche choisie), 300 ms après la dernière frappe.
  useEffect(() => {
    const t = setTimeout(() => search(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const saveNote = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/peers/note", { code, note: note.trim() });
      setNote(data.note);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    } catch (err) {
      setError(err?.response?.data?.detail || p.error);
    } finally {
      setBusy(false);
    }
  };

  const loadThreads = async () => {
    try {
      const { data } = await api.get("/peers/threads", { params: { code } });
      setThreads(data);
    } catch (err) {}
  };

  const openThread = async (r) => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.get("/peers/thread", { params: { code, peer: r.app_id } });
      setActive({ app_id: r.app_id, pseudo: data.peer.pseudo });
      setMsgs(data.messages);
      loadThreads();
    } catch (err) {
      setError(err?.response?.data?.detail || p.error);
    } finally {
      setBusy(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (busy || !text.trim() || !active) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/peers/messages", {
        from_code: code,
        to_app_id: active.app_id,
        text,
      });
      setMsgs((m) => [...m, data]);
      setText("");
    } catch (err) {
      setError(err?.response?.data?.detail || p.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      data-testid="peer-panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mt-8 border border-gold/20 bg-deck/60 p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 font-mono2 text-[10px] tracking-[0.3em] text-gold mb-2">
        <Users className="w-4 h-4" /> {p.title}
      </p>
      <p className="font-fell italic text-base text-bone/80 mb-4">{p.sub}</p>

      {error && (
        <p data-testid="peer-error" className="mb-4 border border-bloodglow/45 bg-bloodglow/10 px-4 py-3 font-mono2 text-[10px] tracking-[0.12em] text-bloodglow flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{error}</span>
        </p>
      )}

      {!active && !profile && (
        <div data-testid="peer-my-note" className="border border-gold/20 bg-ink/50 p-4 mb-4">
          <p className="font-mono2 text-[9px] tracking-[0.25em] text-gold mb-2 flex items-center gap-2">
            <Feather className="w-3.5 h-3.5 shrink-0" /> {p.myNote.title}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              data-testid="peer-my-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={p.myNote.ph}
              maxLength={120}
              autoComplete="off"
              inputMode="text"
              className="flex-1 min-w-0 bg-ink/70 border border-gold/25 px-4 py-2.5 min-h-[48px] font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
            />
            <button
              type="button"
              data-testid="peer-my-note-save"
              onClick={saveNote}
              disabled={busy}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.2em] px-5 py-2.5 min-h-[44px] border transition-colors duration-300 ${
                noteSaved
                  ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                  : "border-gold/40 text-gold hover:bg-gold hover:text-ink"
              } disabled:opacity-60`}
            >
              {noteSaved ? p.myNote.saved : p.myNote.save}
            </button>
          </div>
          <p className="mt-2 font-mono2 text-[8px] tracking-[0.15em] text-mist/70">{p.myNote.hint}</p>
        </div>
      )}

      {!active && !profile && (
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex flex-col sm:flex-row gap-3 mb-2">
          <input
            data-testid="peer-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={p.searchPh}
            autoComplete="off"
            className="flex-1 bg-ink/70 border border-gold/25 px-4 py-3 font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold transition-all"
          />
          <button
            type="submit"
            data-testid="peer-search-btn"
            disabled={busy}
            className="font-display text-lg tracking-wider uppercase px-6 py-3 bg-gold text-ink hover:bg-goldlight disabled:opacity-60 transition-all duration-300"
          >
            {busy ? "…" : p.searchBtn}
          </button>
        </form>
      )}

      <div data-testid="peer-power-filter" className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-mono2 text-[9px] tracking-[0.25em] text-mist flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-gold shrink-0" /> {p.powerFilter}
        </span>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            data-testid={`peer-power-${i}`}
            onClick={() => setRange(i)}
            aria-pressed={range === i}
            className={`font-mono2 text-[9px] tracking-[0.15em] px-3 py-1.5 border transition-all duration-300 ${
              range === i
                ? "bg-gold text-ink border-gold"
                : "border-gold/30 text-mist hover:border-gold/60 hover:text-gold"
            }`}
          >
            {i === 0 ? p.powerAll : p.powerRanges[i - 1]}
          </button>
        ))}
      </div>

      {results !== null && results.length === 0 && !active && !profile && (
        <p data-testid="peer-empty" className="font-fell italic text-base text-bone/70 mb-4">{p.resultsEmpty}</p>
      )}

      {results && results.length > 0 && !active && !profile && (
        <div className="mb-6">
          <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist mb-2">{p.resultsTitle}</p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li
                key={r.app_id}
                data-testid={`peer-row-${r.app_id}`}
                className="flex flex-wrap items-center justify-between gap-3 border border-gold/15 bg-ink/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg text-bone truncate">{r.pseudo}</p>
                  <p className="font-mono2 text-[9px] tracking-[0.2em] text-mist">
                    {r.power} · {r.troops} · {c.status[r.status]?.label || r.status}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid={`peer-open-${r.app_id}`}
                  onClick={() => setProfile(r)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.25em] text-gold border border-gold/40 px-4 py-2 hover:bg-gold hover:text-ink transition-all duration-300"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> {p.openBtn}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile && !active && (
        <motion.div
          data-testid="peer-profile"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative border border-gold/40 bg-parch/90 frame-plate p-6 sm:p-8 text-center mb-2"
        >
          <button
            type="button"
            data-testid="peer-profile-back"
            onClick={() => setProfile(null)}
            className="absolute top-4 left-4 inline-flex items-center gap-1.5 font-mono2 text-[9px] tracking-[0.25em] text-mist hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {p.profile.back}
          </button>
          <div
            aria-hidden
            data-testid="peer-profile-seal"
            className="w-20 h-20 mx-auto rounded-full bg-[#101826] border-2 border-[#2b3b57] shadow-[0_4px_16px_rgba(0,0,0,0.65)] flex items-center justify-center -rotate-6 mt-6 mb-4"
          >
            <span className="font-display text-3xl text-goldlight">{profile.pseudo.trim().charAt(0).toUpperCase()}</span>
          </div>
          <p className="font-mono2 text-[9px] tracking-[0.3em] text-gold mb-2">{p.profile.title}</p>
          <h4 data-testid="peer-profile-name" className="font-display text-3xl text-bone mb-3 break-words">{profile.pseudo}</h4>
          {(() => {
            const noteTxt = (profile.note || "").trim();
            return noteTxt ? (
              <p data-testid="peer-profile-note" className="font-fell italic text-base text-bone/80 mb-4 px-4 leading-snug">« {noteTxt} »</p>
            ) : null;
          })()}
          {(() => {
            const lvl = (profile.troops || "").split(" ")[0].replace(/[^T\d/]/g, "");
            if (!lvl) return null;
            const flagCls = lvl.includes("T5") && !lvl.includes("T4")
              ? "bg-gold text-ink"
              : lvl.includes("T4")
                ? "bg-gold/25 text-goldlight"
                : "bg-[#101826] text-mist";
            return (
              <div
                aria-hidden
                data-testid="peer-profile-flag"
                className={`absolute top-0 right-6 sm:right-10 px-2.5 pt-3 pb-4 font-display text-lg tracking-wider shadow-[0_3px_10px_rgba(0,0,0,0.5)] ${flagCls}`}
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}
              >
                {lvl}
              </div>
            );
          })()}
          <div className="grid sm:grid-cols-2 gap-3 text-left mb-3">
            <div className="border border-gold/20 bg-ink/50 px-4 py-3">
              <p className="font-mono2 text-[8px] tracking-[0.25em] text-gold/80 mb-1">{al.power}</p>
              <p className="font-fell text-lg text-bone break-words">{profile.power || "—"}</p>
            </div>
            <div className="border border-gold/20 bg-ink/50 px-4 py-3">
              <p className="font-mono2 text-[8px] tracking-[0.25em] text-gold/80 mb-1">{al.troops}</p>
              <p className="font-fell text-lg text-bone break-words">{profile.troops || "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <StatusBadge status={profile.status} />
            {profile.joined && (
              <span className="font-mono2 text-[9px] tracking-[0.2em] text-mist">
                {p.profile.since} {new Date(profile.joined).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="peer-profile-write"
            onClick={() => { const r = profile; setProfile(null); openThread(r); }}
            className="w-full inline-flex items-center justify-center gap-2 font-display text-xl tracking-wider uppercase py-3.5 bg-gold text-ink hover:bg-goldlight hover:shadow-[0_0_40px_rgba(212,175,55,0.45)] transition-all duration-300"
          >
            <MessageSquare className="w-5 h-5" /> {p.profile.write}
          </button>
        </motion.div>
      )}

      {active && (
        <div>
          <button
            type="button"
            data-testid="peer-back-btn"
            onClick={() => { setActive(null); setMsgs([]); loadThreads(); }}
            className="inline-flex items-center gap-2 font-mono2 text-[10px] tracking-[0.25em] text-mist hover:text-gold transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {p.back}
          </button>
          <p className="font-display text-xl text-gold mb-4 flex items-center gap-2">
            <AnchorIcon className="w-4 h-4" /> {active.pseudo}
          </p>
          <div ref={listRef} data-testid="peer-msg-list" className="space-y-3 mb-4 max-h-[60vh] sm:max-h-80 overflow-y-auto overflow-x-hidden p-3 pr-3 overscroll-contain">
            {msgs.map((m) => (
              <div
                key={m.id}
                data-testid={`peer-msg-${m.id}`}
                className={`relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 font-fell text-base break-words ${
                  m.from_me
                    ? "ml-auto bg-gold/15 border border-gold/35 text-bone"
                    : "bg-ink/70 border border-gold/15 text-bone/90"
                }`}
              >
                <div
                  aria-hidden
                  data-testid={`peer-seal-${m.from_me ? "mine" : "them"}`}
                  className={`absolute -top-2.5 w-8 h-8 rounded-full bg-[#101826] border-2 border-[#2b3b57] shadow-[0_2px_8px_rgba(0,0,0,0.65)] flex items-center justify-center ${
                    m.from_me ? "-right-2.5 rotate-6" : "-left-2.5 -rotate-6"
                  }`}
                >
                  <span className="font-display text-[10px] text-goldlight">
                    {(m.from_me ? myName : active.pseudo).trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                {m.text}
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex flex-col sm:flex-row gap-3">
            <input
              data-testid="peer-msg-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={p.msgPh}
              maxLength={1000}
              autoComplete="off"
              inputMode="text"
              className="flex-1 min-w-0 bg-ink/70 border border-gold/25 px-4 py-3 min-h-[48px] font-fell text-base text-bone placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors"
            />
            <button
              type="submit"
              data-testid="peer-msg-send"
              disabled={busy || !text.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-mono2 text-[10px] tracking-[0.25em] bg-gold text-ink px-5 py-3 min-h-[48px] hover:bg-goldlight disabled:opacity-50 transition-colors duration-300"
            >
              <Send className="w-4 h-4" /> {p.sendBtn}
            </button>
          </form>
        </div>
      )}

      {!active && threads !== null && (
        <div>
          <p className="font-mono2 text-[9px] tracking-[0.25em] text-mist mb-2">{p.threadsTitle}</p>
          {threads.length === 0 ? (
            <p className="font-fell italic text-base text-bone/60">{p.threadsEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li key={t.app_id}>
                  <button
                    type="button"
                    data-testid={`peer-thread-item-${t.app_id}`}
                    onClick={() => openThread(t)}
                    className="w-full text-left flex items-center justify-between gap-3 border border-gold/15 bg-ink/50 px-4 py-3 hover:border-gold/40 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-lg text-bone truncate">
                        {t.pseudo} {t.unread > 0 && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-bloodglow align-middle" />}
                      </p>
                      <p className="font-fell text-sm text-bone/60 truncate">{t.last}</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-gold shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!active && (
        <p className="mt-4 font-mono2 text-[8px] tracking-[0.2em] text-mist/70 flex items-center gap-2">
          <Lock className="w-3 h-3 shrink-0" /> {p.hint}
        </p>
      )}
    </motion.div>
  );
}
