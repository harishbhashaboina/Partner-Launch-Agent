import { cn } from "@/lib/utils";
import type { PartnerStage } from "@/lib/types";

const STAGES: { id: PartnerStage; label: string }[] = [
  { id: "research", label: "Research" },
  { id: "internal-review", label: "Internal Review" },
  { id: "partner-chat", label: "Partner Chat" },
  { id: "summarized", label: "Summarized" },
  { id: "launching", label: "Launching" },
  { id: "live", label: "Live" },
  { id: "retro", label: "30-day Retro" },
];

export function StageRail({ stage }: { stage: PartnerStage }) {
  const idx = STAGES.findIndex((s) => s.id === stage);
  return (
    <div className="card p-4">
      <ol className="flex flex-wrap items-center gap-2">
        {STAGES.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 items-center gap-2 rounded-full px-3 text-xs font-medium ring-1 ring-inset transition",
                  done && "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
                  active &&
                    "bg-accent-500/15 text-accent-200 ring-accent-400/40 shadow-glow",
                  !done && !active && "bg-white/[0.04] text-white/40 ring-white/10",
                )}
              >
                <span
                  className={cn(
                    "inline-grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold",
                    done && "bg-emerald-400/30 text-emerald-100",
                    active && "bg-accent-400/30 text-accent-100",
                    !done && !active && "bg-white/10 text-white/60",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                {s.label}
              </div>
              {i < STAGES.length - 1 && (
                <span
                  className={cn(
                    "h-px w-6",
                    done ? "bg-emerald-400/40" : "bg-white/10",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
