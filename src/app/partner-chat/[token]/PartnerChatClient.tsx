"use client";
import { useEffect, useRef, useState } from "react";
import type { Attachment, PartnerChatState } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/time";

interface Props {
  token: string;
  partnerName: string;
  contactName: string;
  initialChat: PartnerChatState;
}

export function PartnerChatClient({
  token,
  partnerName,
  contactName,
  initialChat,
}: Props) {
  const [chat, setChat] = useState<PartnerChatState>(initialChat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.messages.length]);

  const closed = chat.step === "closed";

  async function send() {
    const content = text.trim();
    if (!content && pending.length === 0) return;
    if (closed) return;
    setBusy(true);
    setText("");
    setChat((c) => ({
      ...c,
      messages: [
        ...c.messages,
        {
          id: "tmp-" + Math.random(),
          role: "partner",
          ts: new Date().toISOString(),
          content,
          attachments: pending,
        },
        {
          id: "typing-" + Math.random(),
          role: "agent",
          ts: new Date().toISOString(),
          content: "__typing__",
        },
      ],
    }));
    const res = await fetch(`/api/partner-chat/${token}/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content, attachments: pending }),
    });
    if (res.ok) {
      const data = await res.json();
      setChat(data.chat);
      setPending([]);
    }
    setBusy(false);
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/partner-chat/${token}/upload`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const data = await res.json();
      setPending((p) => [...p, data.attachment as Attachment]);
    }
  }

  async function close() {
    setBusy(true);
    const res = await fetch(`/api/partner-chat/${token}/close`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setChat(data.partner.partnerChat ?? chat);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-white/40">
              ABC × {partnerName}
            </div>
            <div className="text-base font-semibold text-white">
              Partner Onboarding Chat
            </div>
            <div className="text-xs text-white/50">
              Hi {contactName.split(" ")[0]} — this is a private intake thread
              with the ABC Partner Launch Agent.
            </div>
          </div>
          <span className="pill-accent">
            {closed ? "Closed" : labelForStep(chat.step)}
          </span>
        </div>
        <div
          ref={scrollerRef}
          className="max-h-[58vh] min-h-[400px] space-y-4 overflow-y-auto bg-ink-950/40 p-5"
        >
          {chat.messages.map((m) => (
            <Message key={m.id} role={m.role} content={m.content} ts={m.ts}
              attachments={m.attachments}
            />
          ))}
        </div>
        {!closed ? (
          <div className="border-t border-white/5 p-4">
            {pending.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pending.map((a) => (
                  <span
                    key={a.id}
                    className="pill-muted"
                    title={a.mimeType}
                  >
                    📎 {a.name}
                    <button
                      className="ml-1 text-white/40 hover:text-white"
                      onClick={() =>
                        setPending((p) => p.filter((x) => x.id !== a.id))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <label className="btn-soft cursor-pointer">
                📎
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <textarea
                className="input min-h-[52px] resize-none"
                placeholder={
                  chat.step === "summary"
                    ? "Confirm or add corrections — then hit Confirm & Close."
                    : "Type your reply…"
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  if (e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  void send();
                }}
              />
              {chat.step === "summary" ? (
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={close}
                >
                  Confirm & Close
                </button>
              ) : (
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={send}
                >
                  {busy ? "Sending…" : "Send"}
                </button>
              )}
            </div>
            <div className="mt-1 text-[10px] text-white/30">
              Enter to send · Shift+Enter for a new line · attachments go to the
              ABC partner team
            </div>
          </div>
        ) : (
          <div className="border-t border-white/5 bg-emerald-500/5 p-4 text-sm text-emerald-200">
            ✓ Intake complete. Thanks {contactName.split(" ")[0]} — the ABC
            partner team has been notified.
          </div>
        )}
      </div>
    </div>
  );
}

function Message({
  role,
  content,
  ts,
  attachments,
}: {
  role: string;
  content: string;
  ts: string;
  attachments?: Attachment[];
}) {
  const typing = content === "__typing__";
  return (
    <div className={cn("flex gap-3", role === "partner" && "flex-row-reverse")}>
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold",
          role === "agent"
            ? "bg-gradient-to-br from-accent-400 to-accent-600 text-ink-950"
            : "bg-violet-500/30 text-violet-100",
        )}
      >
        {role === "agent" ? "AI" : "P"}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm",
          role === "agent"
            ? "border-white/5 bg-white/[0.03]"
            : "border-violet-400/20 bg-violet-500/10",
        )}
      >
        {typing ? (
          <TypingDots />
        ) : (
          <>
            <Markdown>{content}</Markdown>
            {attachments && attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs"
                  >
                    <span>📎</span>
                    <span className="font-medium text-white">{a.name}</span>
                    <span className="text-white/40">
                      {(a.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1 text-[10px] text-white/40">
              {relativeTime(ts)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:240ms]" />
    </span>
  );
}

function labelForStep(s: string): string {
  switch (s) {
    case "intake":
      return "Partner intake";
    case "summary":
      return "Final review";
    case "review-details":
      return "Step 1 of 3 · Review";
    case "integration-details":
      return "Step 2 of 3 · Integration";
    case "target-date":
      return "Step 3 of 3 · Target date";
    default:
      return s;
  }
}
