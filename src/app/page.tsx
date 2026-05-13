import Link from "next/link";
import { listPartners } from "@/lib/storage";
import { PartnerCard } from "@/components/PartnerCard";
import { evaluateFollowUps } from "@/lib/followups";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const partners = await listPartners();
  const enriched = partners.map((p) => ({
    ...p,
    followUps: evaluateFollowUps(p),
  }));

  const stats = {
    total: enriched.length,
    inFlight: enriched.filter(
      (p) =>
        p.stage !== "live" && p.stage !== "retro" && p.stage !== "summarized",
    ).length,
    live: enriched.filter((p) => p.stage === "live" || p.stage === "retro")
      .length,
    needsAttention: enriched.filter((p) =>
      p.followUps.some((f) => !f.acknowledged),
    ).length,
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-accent-500/10 via-ink-800/40 to-ink-900/60 p-8 shadow-soft">
        <div className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="section-title">Partnerships · Agentic Workflow</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              From "signed" to "live", automatically.
            </h1>
            <p className="mt-3 max-w-xl text-white/70">
              Open a new partner, drop in their name + site + contact, and the
              agent does the rest: research, internal awareness comms, the
              partner intake chat, the launch timeline, three launch
              communications, follow-ups, and the 30-day retro.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link href="/new" className="btn-primary">
                + New Partner
              </Link>
              <Link href="#partners" className="btn-ghost">
                View pipeline
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Active partners" value={stats.total} />
            <Stat label="In flight" value={stats.inFlight} accent />
            <Stat label="Launched" value={stats.live} ok />
            <Stat
              label="Needs attention"
              value={stats.needsAttention}
              warn={stats.needsAttention > 0}
            />
          </div>
        </div>
      </section>

      <section id="partners">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-white">
            Partner pipeline
          </h2>
          <span className="text-xs text-white/40">
            {enriched.length} {enriched.length === 1 ? "partner" : "partners"}
          </span>
        </div>
        {enriched.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enriched.map((p) => (
              <PartnerCard key={p.id} partner={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  ok,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  ok?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div
        className={
          "mt-1 text-3xl font-semibold " +
          (warn
            ? "text-amber-300"
            : ok
              ? "text-emerald-300"
              : accent
                ? "text-accent-300"
                : "text-white")
        }
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-3 p-12 text-center">
      <div className="text-5xl">🧭</div>
      <h3 className="text-base font-medium text-white">
        No partners yet
      </h3>
      <p className="max-w-sm text-sm text-white/60">
        Add a partner to kick off the agentic onboarding workflow. We'll
        generate research, draft internal comms, and open a partner chat in
        seconds.
      </p>
      <Link href="/new" className="btn-primary mt-2">
        + Add your first partner
      </Link>
    </div>
  );
}
