"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Partner } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { archetypeAccent, cn, stageLabel, stagePillClass } from "@/lib/utils";
import { humanDate, humanDateTime, relativeTime } from "@/lib/time";

type Tab =
  | "research"
  | "internal"
  | "chat"
  | "summary"
  | "timeline"
  | "metrics";

export function PartnerDetailClient({
  initialPartner,
}: {
  initialPartner: Partner;
}) {
  const [partner, setPartner] = useState<Partner>(initialPartner);
  const [tab, setTab] = useState<Tab>(initialTab(initialPartner));
  const unack = (partner.followUps ?? []).filter((f) => !f.acknowledged);

  async function refresh() {
    const res = await fetch(`/api/partners/${partner.id}`);
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
  }

  return (
    <div className="space-y-6">
      <Header partner={partner} />

      {unack.length > 0 && (
        <FollowUpBanner partner={partner} onChanged={refresh} />
      )}

      <div className="card flex flex-wrap gap-1 p-1">
        <TabButton active={tab === "research"} onClick={() => setTab("research")}>
          Research
        </TabButton>
        <TabButton active={tab === "internal"} onClick={() => setTab("internal")}>
          Internal Awareness
        </TabButton>
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
          Partner Chat
        </TabButton>
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Summary
        </TabButton>
        <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>
          Launch Timeline
        </TabButton>
        <TabButton active={tab === "metrics"} onClick={() => setTab("metrics")}>
          30-day Retro
        </TabButton>
      </div>

      {tab === "research" && <ResearchTab partner={partner} setPartner={setPartner} />}
      {tab === "internal" && <InternalTab partner={partner} setPartner={setPartner} />}
      {tab === "chat" && <ChatTab partner={partner} setPartner={setPartner} />}
      {tab === "summary" && <SummaryTab partner={partner} />}
      {tab === "timeline" && <TimelineTab partner={partner} setPartner={setPartner} />}
      {tab === "metrics" && <MetricsTab partner={partner} setPartner={setPartner} />}
    </div>
  );
}

function initialTab(p: Partner): Tab {
  if (p.stage === "research" || p.stage === "internal-review") return "internal";
  if (p.stage === "partner-chat") return "chat";
  if (p.stage === "summarized" || p.stage === "launching") return "timeline";
  if (p.stage === "live") return "timeline";
  if (p.stage === "retro") return "metrics";
  return "research";
}

function Header({ partner }: { partner: Partner }) {
  const r = partner.research;
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">
              {partner.name}
            </h1>
            <span className={stagePillClass(partner.stage)}>
              {stageLabel(partner.stage)}
            </span>
            {r?.archetype && (
              <span
                className={cn(
                  "rounded-xl bg-gradient-to-br px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
                  archetypeAccent(r.archetype),
                )}
              >
                {r.archetype}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
            <a
              className="hover:text-white"
              href={
                partner.website.startsWith("http")
                  ? partner.website
                  : `https://${partner.website}`
              }
              target="_blank"
              rel="noreferrer"
            >
              {partner.website}
            </a>
            <span>·</span>
            <span>
              {partner.contact.name} (
              <a
                className="hover:text-white"
                href={`mailto:${partner.contact.email}`}
              >
                {partner.contact.email}
              </a>
              )
            </span>
            <span>·</span>
            <span>Updated {relativeTime(partner.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-accent-500/20 text-accent-100 shadow-glow"
          : "text-white/60 hover:bg-white/[0.04] hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

// ---------- Research tab ----------

function ResearchTab({
  partner,
}: {
  partner: Partner;
  setPartner: (p: Partner) => void;
}) {
  const r = partner.research;
  if (!r)
    return (
      <div className="card p-6 text-sm text-white/60">
        Research is still running…
      </div>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Value Prop">{r.valueProp}</Section>
      <Section title="Ideal Customer Profile">{r.idealCustomerProfile}</Section>
      <Section title={`Archetype · ${r.archetype}`}>
        {r.archetypeRationale}
      </Section>
      <Section title="Scope">{r.scope}</Section>
      <Section title="Competitive Landscape">{r.competitiveLandscape}</Section>
      <div className="card p-5">
        <div className="section-title mb-2">Risk Flags</div>
        {r.riskFlags.length === 0 ? (
          <div className="text-sm text-white/60">None flagged.</div>
        ) : (
          <ul className="space-y-1.5">
            {r.riskFlags.map((f) => (
              <li
                key={f}
                className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"
              >
                ⚠ {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="section-title mb-2">{title}</div>
      <div className="text-sm leading-relaxed text-white/85">{children}</div>
    </div>
  );
}

// ---------- Internal awareness tab ----------

function InternalTab({
  partner,
  setPartner,
}: {
  partner: Partner;
  setPartner: (p: Partner) => void;
}) {
  const ia = partner.internalAwareness;
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(ia?.subject ?? "");
  const [body, setBody] = useState(ia?.body ?? "");
  const [busy, setBusy] = useState<"approve" | "regen" | "save" | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    setSubject(partner.internalAwareness?.subject ?? "");
    setBody(partner.internalAwareness?.body ?? "");
  }, [partner.internalAwareness?.subject, partner.internalAwareness?.body]);

  if (!ia)
    return (
      <div className="card p-6 text-sm text-white/60">
        Drafting the internal awareness comm…
      </div>
    );

  async function regen() {
    setBusy("regen");
    const res = await fetch(`/api/partners/${partner.id}/internal-awareness`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "regenerate" }),
    });
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
    setBusy(null);
  }
  async function save() {
    setBusy("save");
    const res = await fetch(`/api/partners/${partner.id}/internal-awareness`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "edit", subject, body }),
    });
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
      setEditing(false);
    }
    setBusy(null);
  }
  async function approve() {
    setBusy("approve");
    const res = await fetch(`/api/partners/${partner.id}/internal-awareness`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
    setBusy(null);
  }
  async function launchChat() {
    setLaunching(true);
    const res = await fetch(`/api/partners/${partner.id}/launch-chat`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
    setLaunching(false);
  }

  const chatUrl = partner.partnerChat?.token
    ? `/partner-chat/${partner.partnerChat.token}`
    : null;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-title">Step 1 · Internal awareness comm</div>
            <div className="mt-1 text-sm text-white/70">
              Draft for the Partner Team to review before any external move.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-soft"
              onClick={regen}
              disabled={busy !== null || Boolean(ia.approvedAt)}
            >
              {busy === "regen" ? "Regenerating…" : "Regenerate"}
            </button>
            {!editing ? (
              <button
                className="btn-soft"
                onClick={() => setEditing(true)}
                disabled={Boolean(ia.approvedAt)}
              >
                Edit
              </button>
            ) : (
              <button
                className="btn-soft"
                onClick={save}
                disabled={busy !== null}
              >
                {busy === "save" ? "Saving…" : "Save"}
              </button>
            )}
            {!ia.approvedAt ? (
              <button
                className="btn-primary"
                onClick={approve}
                disabled={busy !== null || editing}
              >
                {busy === "approve" ? "Approving…" : "Approve"}
              </button>
            ) : (
              <span className="pill-ok">
                ✓ Approved {relativeTime(ia.approvedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="divider my-4" />
        {editing ? (
          <div className="space-y-3">
            <label className="block">
              <div className="label mb-1.5">Subject</div>
              <input
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="label mb-1.5">Body (markdown)</div>
              <textarea
                className="input min-h-[260px] font-mono text-xs"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="label mb-1.5">Subject</div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white">
                {ia.subject}
              </div>
            </div>
            <div>
              <div className="label mb-1.5">Body</div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <Markdown>{ia.body}</Markdown>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-title">Step 2 · Launch agent to partner</div>
            <div className="mt-1 text-sm text-white/70">
              Opens a partner-facing chat with a unique link. Partner reviews
              the brief, describes the integration, and commits to a target
              launch date.
            </div>
          </div>
          {!partner.partnerChat ? (
            <button
              className="btn-primary"
              onClick={launchChat}
              disabled={!ia.approvedAt || launching}
              title={
                !ia.approvedAt
                  ? "Approve the internal comm first"
                  : "Open partner chat"
              }
            >
              {launching ? "Launching…" : "Approve & Launch to Partner"}
            </button>
          ) : (
            <Link href={chatUrl!} className="btn-soft" target="_blank">
              Open partner chat ↗
            </Link>
          )}
        </div>
        {chatUrl && (
          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
            Partner link:{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-accent-200">
              {typeof window !== "undefined"
                ? window.location.origin + chatUrl
                : chatUrl}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Chat tab ----------

function ChatTab({
  partner,
  setPartner,
}: {
  partner: Partner;
  setPartner: (p: Partner) => void;
}) {
  const chat = partner.partnerChat;
  if (!chat)
    return (
      <div className="card p-6 text-sm text-white/60">
        Partner chat hasn't been launched yet. Head to the{" "}
        <button
          className="text-accent-300 hover:underline"
          onClick={() => {
            const ev = new CustomEvent("noop");
            window.dispatchEvent(ev);
          }}
        >
          Internal Awareness
        </button>{" "}
        tab and click "Approve & Launch to Partner".
      </div>
    );

  const link = `/partner-chat/${chat.token}`;
  const url =
    typeof window !== "undefined" ? window.location.origin + link : link;

  async function refresh() {
    const res = await fetch(`/api/partners/${partner.id}`);
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card p-0">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500/15 text-accent-200">
              ◆
            </span>
            <div>
              <div className="text-sm font-medium text-white">
                Partner chat · {partner.name}
              </div>
              <div className="text-xs text-white/50">
                Step:{" "}
                <span className="text-accent-200">{stepLabel(chat.step)}</span>
                {chat.lastPartnerResponseAt && (
                  <>
                    {" "}
                    · last reply{" "}
                    <span title={humanDateTime(chat.lastPartnerResponseAt)}>
                      {relativeTime(chat.lastPartnerResponseAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-soft" onClick={refresh}>
              ↻ Refresh
            </button>
            <Link href={link} target="_blank" className="btn-soft">
              Open as partner ↗
            </Link>
          </div>
        </div>
        <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
          {chat.messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3",
                m.role === "partner" && "flex-row-reverse",
              )}
            >
              <div
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs",
                  m.role === "agent"
                    ? "bg-accent-500/15 text-accent-200"
                    : "bg-violet-500/15 text-violet-200",
                )}
              >
                {m.role === "agent" ? "AI" : "P"}
              </div>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl border px-4 py-3 text-sm",
                  m.role === "agent"
                    ? "border-white/5 bg-white/[0.03]"
                    : "border-violet-400/20 bg-violet-500/10",
                )}
              >
                <Markdown>{m.content}</Markdown>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.attachments.map((a) => (
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
                  {relativeTime(m.ts)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="space-y-3">
        <div className="card p-4">
          <div className="section-title">Share with partner</div>
          <div className="mt-2 break-all rounded-lg border border-white/5 bg-white/[0.03] p-2 text-xs text-accent-200">
            {url}
          </div>
          <button
            className="btn-soft mt-3 w-full"
            onClick={() => navigator.clipboard.writeText(url)}
          >
            Copy link
          </button>
        </div>
        <div className="card p-4">
          <div className="section-title">Captured so far</div>
          <CapturedRow label="Review notes" value={chat.partnerInputs.reviewNotes} />
          <CapturedRow
            label="Integration"
            value={chat.partnerInputs.integrationDescription}
          />
          <CapturedRow
            label="Target date"
            value={
              chat.partnerInputs.targetDate
                ? humanDate(chat.partnerInputs.targetDate)
                : undefined
            }
          />
          <div className="mt-3 text-xs text-white/40">
            {chat.attachments.length} attachment
            {chat.attachments.length === 1 ? "" : "s"}
          </div>
        </div>
      </aside>
    </div>
  );
}

function CapturedRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mt-2 text-xs">
      <div className="label">{label}</div>
      <div className="mt-0.5 line-clamp-3 text-white/80">
        {value?.trim() ? value : <span className="text-white/30">—</span>}
      </div>
    </div>
  );
}

function stepLabel(s: string): string {
  switch (s) {
    case "review-details":
      return "Awaiting review";
    case "integration-details":
      return "Awaiting integration details";
    case "target-date":
      return "Awaiting target date";
    case "summary":
      return "Reviewing summary";
    case "closed":
      return "Closed";
    default:
      return s;
  }
}

// ---------- Summary tab ----------

function SummaryTab({ partner }: { partner: Partner }) {
  const s = partner.summary;
  if (!s)
    return (
      <div className="card p-6 text-sm text-white/60">
        Summary appears once the partner closes the intake chat.
      </div>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Value Prop">{s.valueProp}</Section>
      <Section title="Ideal Customer Profile">{s.idealCustomerProfile}</Section>
      <Section title="Scope">{s.scope}</Section>
      <Section title="Integration Overview">
        {s.integrationOverview || "—"}
      </Section>
      <Section title="Target Launch Date">
        {s.targetDate ? humanDate(s.targetDate) : "—"}
      </Section>
      <Section title="Partner Notes / Edits">{s.partnerNotes || "—"}</Section>
      <div className="lg:col-span-2 card p-5">
        <div className="section-title mb-2">Attachments from partner</div>
        {(partner.partnerChat?.attachments ?? []).length === 0 ? (
          <div className="text-sm text-white/60">None.</div>
        ) : (
          <ul className="space-y-2">
            {partner.partnerChat!.attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span>📎</span>
                  <span className="font-medium text-white">{a.name}</span>
                </div>
                <span className="text-xs text-white/40">
                  {(a.size / 1024).toFixed(1)} KB ·{" "}
                  {relativeTime(a.uploadedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- Timeline tab ----------

function TimelineTab({
  partner,
  setPartner,
}: {
  partner: Partner;
  setPartner: (p: Partner) => void;
}) {
  const t = partner.timeline;
  const [busy, setBusy] = useState(false);

  async function gen() {
    setBusy(true);
    const res = await fetch(`/api/partners/${partner.id}/timeline`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
    setBusy(false);
  }

  async function patchComm(
    commId: "coming-soon" | "prepare-for-launch" | "new-partner-live",
    patch: { status?: "scheduled" | "drafted" | "sent" },
  ) {
    const res = await fetch(`/api/partners/${partner.id}/timeline`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commId, ...patch }),
    });
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
  }

  if (!t)
    return (
      <div className="card p-6 text-sm text-white/60">
        <div>No launch timeline yet.</div>
        <button className="btn-primary mt-3" onClick={gen} disabled={busy}>
          {busy ? "Generating…" : "Generate launch timeline"}
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-title">Launch milestones</div>
            <div className="mt-1 text-sm text-white/70">
              Working back from target launch · {humanDate(t.targetDate)}
            </div>
          </div>
          <button className="btn-soft" onClick={gen} disabled={busy}>
            {busy ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
        <div className="divider my-4" />
        <ol className="relative space-y-4 border-l border-white/10 pl-6">
          {t.milestones.map((m, idx) => (
            <li key={idx} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-accent-400 shadow-glow" />
              <div className="flex flex-wrap items-baseline gap-3">
                <div className="text-sm font-semibold text-white">
                  {m.name}
                </div>
                <div className="text-xs text-accent-200">
                  {humanDate(m.date)}
                </div>
              </div>
              <div className="text-sm text-white/70">{m.description}</div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {t.communications.map((c) => (
          <div key={c.id} className="card flex flex-col p-5">
            <div className="flex items-center justify-between">
              <div className="section-title">{c.title}</div>
              <span
                className={
                  c.status === "sent"
                    ? "pill-ok"
                    : c.status === "drafted"
                      ? "pill-accent"
                      : "pill-muted"
                }
              >
                {c.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-white/50">
              Send {humanDate(c.sendDate)}
            </div>
            <div className="mt-3 text-sm font-medium text-white">
              {c.subject}
            </div>
            <div className="mt-2 max-h-44 overflow-hidden text-sm">
              <Markdown>{c.body}</Markdown>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {c.attachments.map((a) => (
                <span key={a} className="pill-muted">
                  📎 {a}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <details className="text-xs text-white/60">
                <summary className="cursor-pointer hover:text-white/90">
                  Read full
                </summary>
                <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <Markdown>{c.body}</Markdown>
                </div>
              </details>
              {c.status !== "sent" ? (
                <button
                  className="btn-primary text-xs"
                  onClick={() => patchComm(c.id, { status: "sent" })}
                >
                  Mark sent
                </button>
              ) : (
                <span className="pill-ok text-xs">Sent ✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Metrics tab ----------

function MetricsTab({
  partner,
  setPartner,
}: {
  partner: Partner;
  setPartner: (p: Partner) => void;
}) {
  const m = partner.metrics;
  const [kpis, setKpis] = useState<Record<string, string>>(
    m?.kpis ?? {
      "Partner-influenced ARR": "",
      "Joint customer adoption": "",
      "Open opps in pipeline": "",
      "Win rate uplift": "",
    },
  );
  const [stories, setStories] = useState<string>(m?.successStories ?? "");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const res = await fetch(`/api/partners/${partner.id}/metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kpis, successStories: stories }),
    });
    if (res.ok) {
      const data = await res.json();
      setPartner(data.partner);
    }
    setBusy(false);
  }

  const canRun = partner.stage === "live" || partner.stage === "retro";

  return (
    <div className="space-y-4">
      {!canRun && (
        <div className="card p-4 text-sm text-amber-200">
          The 30-day retro becomes meaningful once the partner is live. You can
          still preview the inputs below.
        </div>
      )}
      <div className="card p-5">
        <div className="section-title">30-day metrics & stories</div>
        <div className="mt-1 text-sm text-white/70">
          Drop in KPIs and a couple of success stories. The agent will generate
          the comms email and the partner archetype recap slide.
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.keys(kpis).map((k) => (
            <label key={k} className="block">
              <div className="label mb-1.5">{k}</div>
              <input
                className="input"
                value={kpis[k]}
                onChange={(e) => setKpis({ ...kpis, [k]: e.target.value })}
                placeholder="e.g. $120K"
              />
            </label>
          ))}
        </div>
        <label className="mt-4 block">
          <div className="label mb-1.5">Success stories (free text)</div>
          <textarea
            className="input min-h-[120px]"
            value={stories}
            onChange={(e) => setStories(e.target.value)}
            placeholder="2-3 quick wins, customer names if shareable, what tipped it…"
          />
        </label>
        <div className="mt-4 flex items-center justify-end">
          <button className="btn-primary" disabled={busy} onClick={generate}>
            {busy ? "Generating…" : "Generate 30-day comms"}
          </button>
        </div>
      </div>

      {m && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="section-title">Generated 30-day comm</div>
            <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <Markdown>{m.generatedNarrative}</Markdown>
            </div>
          </div>
          <div className="card p-5">
            <div className="section-title">
              Partner archetype recap (slide-ready)
            </div>
            <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <Markdown>{m.archetypeSlide}</Markdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Follow-up banner ----------

function FollowUpBanner({
  partner,
  onChanged,
}: {
  partner: Partner;
  onChanged: () => void;
}) {
  const items = (partner.followUps ?? []).filter((f) => !f.acknowledged);
  const max = items.reduce((acc, f) => Math.max(acc, f.level), 0);

  async function ack(level: 10 | 20 | 30) {
    await fetch(`/api/partners/${partner.id}/follow-ups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ack", level }),
    });
    onChanged();
  }

  const tone =
    max >= 30
      ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
      : max >= 20
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : "border-accent-400/30 bg-accent-500/10 text-accent-100";

  return (
    <div className={cn("card border", tone, "p-4")}>
      <div className="flex items-start gap-3">
        <span className="text-xl">⏰</span>
        <div className="flex-1 space-y-1">
          {items.map((f) => (
            <div key={f.level} className="flex items-center justify-between gap-3">
              <div className="text-sm">{f.message}</div>
              <button
                className="btn-soft text-xs"
                onClick={() => ack(f.level)}
              >
                Acknowledge {f.level}d
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
