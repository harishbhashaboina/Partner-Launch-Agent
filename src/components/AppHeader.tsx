"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader({ agentMode }: { agentMode: "openai" | "mock" }) {
  const pathname = usePathname() || "/";
  const isPartnerChat = pathname.startsWith("/partner-chat");
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href={isPartnerChat ? pathname : "/"}
          className="group flex items-center gap-3"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-ink-950 shadow-glow">
            <span className="font-bold">PL</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">
              {isPartnerChat ? "ABC Partner Onboarding" : "Partner Launch Agent"}
            </div>
            <div className="text-[11px] uppercase tracking-widest text-white/40">
              {isPartnerChat
                ? "Secure intake · ABC Partnerships"
                : "ABC Partnerships · Agentic Workflow"}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {!isPartnerChat && (
            <>
              <span className="hidden text-[11px] uppercase tracking-widest text-white/40 sm:inline">
                Agent
              </span>
              <span
                className={agentMode === "openai" ? "pill-ok" : "pill-muted"}
                title={
                  agentMode === "openai"
                    ? "Using OpenAI"
                    : "Using deterministic mock — set OPENAI_API_KEY to enable LLM"
                }
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                {agentMode === "openai" ? "OpenAI live" : "Mock mode"}
              </span>
              <Link href="/new" className="btn-primary">
                + New Partner
              </Link>
            </>
          )}
          {isPartnerChat && (
            <span className="pill-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
              End-to-end encrypted intake
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
