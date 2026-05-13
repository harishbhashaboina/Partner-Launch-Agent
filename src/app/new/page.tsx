"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPartnerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    website: "",
    contactName: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStepLabel("Researching partner…");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create partner");
      }
      const data = await res.json();
      setStepLabel("Drafting internal awareness comm…");
      await new Promise((r) => setTimeout(r, 300));
      router.push(`/partners/${data.partner.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="mb-4 inline-block text-xs text-white/50 hover:text-white/80"
      >
        ← Back to dashboard
      </Link>
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-white">New Partner</h1>
        <p className="mt-1 text-sm text-white/60">
          Three fields. The agent handles the rest: value prop, ICP,
          archetype, internal comms, and the partner chat.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Field
            label="Partner name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="e.g. Acme Data Co"
            required
          />
          <Field
            label="Partner website"
            value={form.website}
            onChange={(v) => setForm({ ...form, website: v })}
            placeholder="acmedata.com"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Partner contact name"
              value={form.contactName}
              onChange={(v) => setForm({ ...form, contactName: v })}
              placeholder="Jordan Lee"
              required
            />
            <Field
              label="Partner contact email"
              value={form.contactEmail}
              type="email"
              onChange={(v) => setForm({ ...form, contactEmail: v })}
              placeholder="jordan@acmedata.com"
              required
            />
          </div>
          {error && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-white/40">
              {loading ? stepLabel : "Agent will run automatically."}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Spinner />
                  Working…
                </>
              ) : (
                "Run agent"
              )}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="card mt-4 overflow-hidden p-0">
          <div className="h-1 w-full overflow-hidden bg-white/[0.04]">
            <div className="h-full w-1/3 animate-[shimmer_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-accent-400/70 to-transparent" />
          </div>
          <div className="p-4 text-xs text-white/60">
            Generating research brief, value prop, ICP, partner archetype, and
            internal awareness draft…
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="label mb-1.5">{label}</div>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}
