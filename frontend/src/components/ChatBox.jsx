import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Send, Trash2, ScrollText, Check, CheckCheck, ShieldCheck } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1];

export default function ChatBox({ code, sender, testPrefix = "chat", peerName = "" }) {
  const { c, lang } = useLang();
  const s = c.chat;
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const countRef = useRef(0);
  const newSeenRef = useRef(new Set());
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const base = sender === "council" ? "/admin/conversations" : "/messages";

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`${base}/${encodeURIComponent(code)}`);
      setMessages(data);
    } catch {
      setMessages((m) => (m === null ? [] : m));
    }
  }, [base, code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (sender !== "council") return;
    api.post(`${base}/${encodeURIComponent(code)}/read`).catch(() => {});
  }, [base, code, sender, messages?.length]);

  useEffect(() => {
    if (!messages) return;
    messages.forEach((m) => {
      if (m.was_new) newSeenRef.current.add(m.id);
    });
  }, [messages]);

  useEffect(() => {
    if (!messages) return;
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const fmt = (iso) =>
    new Date(iso).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isReadTick = (m) => (sender === "recruit" ? !!m.read_by_council : !!m.read_by_recruit);

  const dayKey = (iso) => new Date(iso).toDateString();
  const dayLabel = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return s.dayToday;
    if (d.toDateString() === yest.toDateString()) return s.dayYesterday;
    return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  };

  const send = async (e) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`${base}/${encodeURIComponent(code)}`, { text: t });
      setMessages((m) => [...(m || []), data]);
      setText("");
      toast.success(s.sentToast);
    } catch (err) {
      if (err?.response?.status === 429) toast.error(s.flood);
      else toast.error(formatApiError(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async (msg) => {
    if (!window.confirm(s.deleteConfirm)) return;
    try {
      await api.delete(`${base}/${encodeURIComponent(code)}/${msg.id}`);
      await load();
      toast.success(s.deletedToast);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div data-testid={`${testPrefix}-section`} className="border border-gold/25 bg-parch/80 frame-plate p-5 sm:p-7">
      <div className="flex items-center gap-3 mb-1">
        <ScrollText className="w-5 h-5 text-gold shrink-0" />
        <h3 className="font-display text-2xl text-bone">{s.title}</h3>
      </div>
      <p className="font-fell italic text-sm text-bone/70 mb-5">{s.subtitle}</p>

      <div
        ref={listRef}
        data-testid={`${testPrefix}-list`}
        className="h-72 sm:h-80 max-h-[55vh] overflow-y-auto overflow-x-hidden overscroll-contain border border-gold/15 bg-ink/50 p-4 space-y-3 mb-4"
      >
        {messages === null ? (
          <p className="text-center font-mono2 text-[10px] tracking-[0.3em] text-mist pt-24">{s.loading}</p>
        ) : messages.length === 0 ? (
          <p className="text-center font-fell italic text-base text-mist pt-20 px-6">{s.empty}</p>
        ) : (
          (() => {
            const firstNewIdx = messages.findIndex(
              (m) => m.was_new || newSeenRef.current.has(m.id)
            );
            return messages.map((m, i) => {
              const mine = m.sender === sender;
              const isCouncil = m.sender === "council";
              const removed = m.deleted;
              const isNew = !removed && (m.was_new || newSeenRef.current.has(m.id));
              const newDay = i === 0 || dayKey(m.created_at) !== dayKey(messages[i - 1].created_at);
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <div className="flex items-center justify-center py-1" data-testid={`${testPrefix}-day-divider`}>
                      <span className="font-mono2 text-[8px] tracking-[0.3em] text-mist/80 bg-ink/60 border border-gold/15 px-3 py-1">
                        {dayLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                  {i === firstNewIdx && (
                    <div className="flex items-center gap-3 py-1" data-testid={`${testPrefix}-new-divider`}>
                      <span className="h-px flex-1 bg-gold/40" />
                      <span className="font-mono2 text-[8px] tracking-[0.3em] text-gold">{s.newDivider}</span>
                      <span className="h-px flex-1 bg-gold/40" />
                    </div>
                  )}
                  <motion.div
                    data-testid={`${testPrefix}-message-${m.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] border px-4 py-2.5 ${
                        removed
                          ? "border-mist/25 bg-ink/40"
                          : isCouncil
                            ? "border-gold/60 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent shadow-[0_0_24px_rgba(212,175,55,0.15)]"
                            : mine
                              ? "border-gold/40 bg-gold/10"
                              : isNew
                                ? "border-gold/60 bg-deck/90"
                                : "border-gold/20 bg-deck/80"
                      }`}
                    >
                      {isCouncil && !removed && (
                        <div
                          aria-hidden
                          data-testid={`${testPrefix}-wax-seal`}
                          className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-blood border-2 border-[#7a1f1f] shadow-[0_2px_8px_rgba(0,0,0,0.65)] flex items-center justify-center -rotate-6"
                        >
                          <span className="font-display text-[9px] tracking-wider text-goldlight">GP</span>
                        </div>
                      )}
                      {!isCouncil && !removed && (
                        <div
                          aria-hidden
                          data-testid={`${testPrefix}-ink-seal`}
                          className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-[#101826] border-2 border-[#2b3b57] shadow-[0_2px_8px_rgba(0,0,0,0.65)] flex items-center justify-center rotate-6"
                        >
                          <span className="font-display text-[10px] text-goldlight">{(peerName || "?").trim().charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        {isCouncil && !removed && <ShieldCheck className="w-3 h-3 text-gold shrink-0" />}
                        <span className={`font-mono2 text-[8px] tracking-[0.25em] ${isCouncil && !removed ? "text-gold" : mine ? "text-gold" : "text-mist"}`}>
                          {mine ? (sender === "council" ? s.councilYou : s.you) : sender === "council" ? s.recruitLabel : s.council}
                        </span>
                        {mine && !removed && (
                          <button
                            data-testid={`${testPrefix}-delete-${m.id}`}
                            onClick={() => remove(m)}
                            aria-label={s.deleteConfirm}
                            className="text-mist/60 hover:text-bloodglow transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p
                        className={`font-fell text-base leading-snug break-words ${
                          removed ? "italic text-mist/70" : "text-bone/90"
                        }`}
                      >
                        {removed ? s.deleted : m.text}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="font-mono2 text-[8px] tracking-[0.2em] text-mist/60">{fmt(m.created_at)}</span>
                        {mine && !removed && (
                          <span title={s.tickRead} data-testid={`${testPrefix}-tick-${m.id}`}>
                            {isReadTick(m) ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-mist/50" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Fragment>
              );
            });
          })()
        )}
      </div>

      <form onSubmit={send} className="flex flex-col sm:flex-row gap-3">
        <input
          data-testid={`${testPrefix}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={s.placeholder}
          maxLength={2000}
          autoComplete="off"
          inputMode="text"
          className="flex-1 min-w-0 bg-ink/70 border border-gold/25 px-4 py-3 min-h-[48px] font-fell text-base text-bone placeholder:text-mist/50 focus:border-gold focus:outline-none transition-colors"
        />
        <button
          type="submit"
          data-testid={`${testPrefix}-send-btn`}
          disabled={sending || !text.trim()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-display text-xl tracking-wider uppercase px-7 py-3 min-h-[48px] bg-gold text-ink hover:bg-goldlight hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
        >
          <Send className="w-4 h-4" />
          {sending ? s.sending : s.send}
        </button>
      </form>
      {sender === "recruit" && (
        <p className="mt-3 font-mono2 text-[9px] tracking-[0.25em] text-mist">{s.councilNote}</p>
      )}
    </div>
  );
}
