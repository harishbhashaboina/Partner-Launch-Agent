import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stageLabel(stage: string): string {
  switch (stage) {
    case "research":
      return "Researching";
    case "internal-review":
      return "Internal review";
    case "partner-chat":
      return "Partner chat";
    case "summarized":
      return "Summarized";
    case "launching":
      return "Launching";
    case "live":
      return "Live";
    case "retro":
      return "30-day retro";
    default:
      return stage;
  }
}

export function stagePillClass(stage: string): string {
  switch (stage) {
    case "research":
      return "pill-muted";
    case "internal-review":
      return "pill-accent";
    case "partner-chat":
      return "pill-accent";
    case "summarized":
      return "pill-ok";
    case "launching":
      return "pill-accent";
    case "live":
      return "pill-ok";
    case "retro":
      return "pill-ok";
    default:
      return "pill-muted";
  }
}

export function archetypeAccent(arche?: string): string {
  switch (arche) {
    case "Data Affiliate":
      return "from-cyan-400/30 to-cyan-500/10 ring-cyan-400/30 text-cyan-200";
    case "Go-To-Market":
      return "from-violet-400/30 to-violet-500/10 ring-violet-400/30 text-violet-200";
    case "Platform":
      return "from-emerald-400/30 to-emerald-500/10 ring-emerald-400/30 text-emerald-200";
    case "Channel":
      return "from-amber-400/30 to-amber-500/10 ring-amber-400/30 text-amber-200";
    default:
      return "from-white/15 to-white/5 ring-white/15 text-white";
  }
}
