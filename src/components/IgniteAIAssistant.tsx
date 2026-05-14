"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, BotMessageSquare, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";

interface ChatMsg {
  id: string;
  role: Role;
  content: string;
}

const GREETING: ChatMsg = {
  id: "greeting",
  role: "assistant",
  content:
    "Hello 👋 I'm AI BOT. Tell me what kind of partner you need — e.g. *payment processor*, *website creator*, *gym trainer*, *access control* — and I'll recommend the best fit from our catalog.",
};

export function IgniteAIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function closeChat() {
    setOpen(false);
    setMessages([GREETING]);
    setDraft("");
  }

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;

    const userMsg: ChatMsg = {
      id: "u-" + Date.now(),
      role: "user",
      content,
    };
    const typingMsg: ChatMsg = {
      id: "typing",
      role: "assistant",
      content: "__typing__",
    };

    const history = [...messages, userMsg];
    setMessages([...history, typingMsg]);
    setDraft("");
    setSending(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((m) => m.content !== "__typing__")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply: string =
        (res.ok && typeof data?.reply === "string" && data.reply) ||
        "Sorry — I hit a snag answering that. Please try again in a moment.";
      setMessages([
        ...history,
        { id: "a-" + Date.now(), role: "assistant", content: reply },
      ]);
    } catch {
      setMessages([
        ...history,
        {
          id: "a-err-" + Date.now(),
          role: "assistant",
          content:
            "Sorry — I couldn't reach the server. Check your connection and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <div
        className={cn(
          "group fixed bottom-6 right-6 z-40 flex items-center gap-3 transition",
          open && "pointer-events-none opacity-0",
        )}
      >
        <span
          className="pointer-events-none hidden translate-x-2 rounded-md bg-ink-950/90 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-soft ring-1 ring-white/10 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 sm:inline"
        >
          AI BOT
        </span>
        <button
          type="button"
          aria-label="Open AI BOT"
          onClick={() => setOpen(true)}
          className="grid h-14 w-14 place-items-center rounded-full bg-accent-500 text-white shadow-glow ring-1 ring-white/20 transition hover:scale-105 hover:bg-accent-400 hover:shadow-xl"
        >
          <BotMessageSquare className="h-7 w-7" strokeWidth={1.75} />
        </button>
      </div>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white text-ink-900 shadow-[0_30px_80px_-20px_rgba(6,182,212,0.35),0_10px_30px_-10px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition-all duration-200",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
        style={{ height: "min(580px, calc(100vh - 3rem))" }}
        role="dialog"
        aria-label="AI BOT chat"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 px-4 py-3.5 text-white">
          <span
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(120% 80% at 0% 0%, rgba(34,211,238,0.18), transparent 55%)",
            }}
            aria-hidden
          />
          <div className="relative flex items-center gap-2.5">
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-ink-950 shadow-glow ring-1 ring-white/20">
              <Bot className="h-[18px] w-[18px]" strokeWidth={2.2} />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-800 bg-emerald-400" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">AI BOT</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
                Partner Recommender
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close chat"
            onClick={closeChat}
            className="relative rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-400/70 to-transparent"
            aria-hidden
          />
        </div>

        {/* Body */}
        <div
          ref={scrollerRef}
          className="flex-1 space-y-3 overflow-y-auto bg-[#f4f5f7] px-3 py-4"
        >
          {messages.map((m) => (
            <MessageRow key={m.id} role={m.role} content={m.content} />
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-black/5 bg-white p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message..."
              className="block max-h-32 min-h-[40px] flex-1 resize-none rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-ink-900 placeholder:text-ink-900/40 focus:border-accent-500/60 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-500 text-white ring-1 ring-black/5 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send
                className={cn("h-4 w-4", sending && "animate-pulse")}
                strokeWidth={2}
              />
            </button>
          </div>
          <div className="mt-1.5 px-2 text-[10px] text-ink-900/40">
            Press Enter to send · Shift + Enter for newline
          </div>
        </div>
      </div>
    </>
  );
}

function MessageRow({ role, content }: { role: Role; content: string }) {
  const isUser = role === "user";
  const typing = content === "__typing__";
  return (
    <div
      className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
          isUser
            ? "bg-accent-500 text-white"
            : "bg-indigo-100 text-indigo-600",
        )}
        aria-hidden
      >
        {isUser ? "You" : <Bot className="h-4 w-4" strokeWidth={2} />}
      </div>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm",
          isUser
            ? "rounded-tr-sm bg-accent-500 text-white"
            : "rounded-tl-sm bg-white text-ink-900 ring-1 ring-black/5",
        )}
      >
        {typing ? (
          <TypingDots />
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div className="space-y-2 break-words [&_a]:text-accent-600 [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_em]:italic [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-900/40" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-900/40 [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-900/40 [animation-delay:240ms]" />
    </span>
  );
}
