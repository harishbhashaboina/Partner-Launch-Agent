"use client";
import Link from "next/link";
import type { Partner } from "@/lib/types";
import { archetypeAccent, cn, stageLabel, stagePillClass } from "@/lib/utils";
import { relativeTime } from "@/lib/time";

export function PartnerCard({ partner }: { partner: Partner }) {
  const r = partner.research;
  const unack = (partner.followUps ?? []).filter((f) => !f.acknowledged);
  return (
    <Link
      href={`/partners/${partner.id}`}
      className="card card-hover group block p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              {partner.name}
            </h3>
            <span className={stagePillClass(partner.stage)}>
              {stageLabel(partner.stage)}
            </span>
            {unack.length > 0 && (
              <span className="pill-warn">
                {unack[unack.length - 1].level}d no reply
              </span>
            )}
          </div>
          <a
            href={
              partner.website.startsWith("http")
                ? partner.website
                : `https://${partner.website}`
            }
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-block text-xs text-white/50 hover:text-white/80"
          >
            {partner.website}
          </a>
        </div>
        {r?.archetype && (
          <div
            className={cn(
              "rounded-xl bg-gradient-to-br px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
              archetypeAccent(r.archetype),
            )}
          >
            {r.archetype}
          </div>
        )}
      </div>
      {r?.valueProp && (
        <p className="mt-3 line-clamp-3 text-sm text-white/70">
          {r.valueProp}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between text-[11px] text-white/40">
        <span>Updated {relativeTime(partner.updatedAt)}</span>
        <span className="opacity-0 transition group-hover:opacity-100">
          Open →
        </span>
      </div>
    </Link>
  );
}
