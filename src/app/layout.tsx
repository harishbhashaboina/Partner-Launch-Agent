import type { Metadata } from "next";
import "./globals.css";
import { agentMode } from "@/lib/agent";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Partner Launch Agent",
  description:
    "Agentic onboarding & launch for new partners — from signed to live, automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = agentMode();
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <AppHeader agentMode={mode} />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
          <footer className="mx-auto max-w-7xl px-6 py-12 text-center text-xs text-white/30">
            Hackathon 2026 · Partner Launch Agent
          </footer>
        </div>
      </body>
    </html>
  );
}
