import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import PageWrapper from "@/components/PageWrapper";
import ExportCSV from "./ExportCSV";

// ─── Types ────────────────────────────────────────────────────────────────────

type WaitlistRow = {
  id: string;
  email: string;
  created_at: string | null;
  source: string | null;
  marketing_consent: boolean | null;
  invited_at: string | null;
  notes: string | null;
};

// ─── Date helper ──────────────────────────────────────────────────────────────

function formatJoinDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .toLowerCase();
  return `${date} · ${time}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex-1 rounded-2xl px-5 py-4"
      style={{
        background: "#1a0a2e",
        border: "1px solid rgba(45,10,78,0.9)",
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-1"
        style={{ color: "#00F0FF" }}
      >
        {label}
      </p>
      <p className="text-2xl font-black" style={{ color }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function SourcePill({ source }: { source: string | null }) {
  if (!source) return <span className="text-slime-muted">—</span>;
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{
        background: "rgba(45,10,78,0.8)",
        border: "1px solid rgba(45,10,78,1)",
        color: "#00F0FF",
      }}
    >
      {source.replace(/_/g, " ")}
    </span>
  );
}

function InvitedBadge({ invited_at }: { invited_at: string | null }) {
  if (invited_at) {
    return (
      <span
        className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
        style={{
          background: "rgba(57,255,20,0.12)",
          border: "1px solid rgba(57,255,20,0.3)",
          color: "#39FF14",
        }}
      >
        Invited
      </span>
    );
  }
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#666",
      }}
    >
      Pending
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WaitlistAdminPage() {
  // ── Auth check (anon client) ──────────────────────────────────────────────
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    redirect("/");
  }

  // ── Data fetch (service role — bypasses RLS) ──────────────────────────────
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: waitlist } = await supabase
    .from("waitlist")
    .select(
      "id, email, created_at, source, marketing_consent, invited_at, notes",
    )
    .order("created_at", { ascending: false });

  const rows: WaitlistRow[] = waitlist ?? [];

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCount = rows.length;
  const marketingCount = rows.filter((r) => r.marketing_consent).length;
  const pendingCount = rows.filter((r) => !r.invited_at).length;

  return (
    <PageWrapper glow="magenta">
      <div className="px-4 py-8 max-w-5xl mx-auto">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-baseline gap-3">
            <h1
              className="text-2xl font-black tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif", color: "#fff" }}
            >
              Waitlist
            </h1>
            <span
              className="text-2xl font-black"
              style={{ color: "#39FF14", fontFamily: "Montserrat, sans-serif" }}
            >
              {totalCount.toLocaleString()}
            </span>
          </div>
          <ExportCSV data={rows} />
        </div>

        {/* ── Stats row ── */}
        <div className="flex gap-3 mb-8">
          <StatCard label="Total Signups" value={totalCount} color="#39FF14" />
          <StatCard
            label="Marketing Opt-in"
            value={marketingCount}
            color="#00F0FF"
          />
          <StatCard label="Not Invited" value={pendingCount} color="#FF00E5" />
        </div>

        {/* ── Table ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(45,10,78,0.9)" }}
        >
          {rows.length === 0 ? (
            <div className="py-20 text-center text-slime-muted text-sm">
              No signups yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#1a0a2e" }}>
                    {[
                      "Email",
                      "Joined",
                      "Marketing",
                      "Invited",
                      "Source",
                      "Notes",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest"
                        style={{ color: "#00F0FF" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isEven = i % 2 === 0;
                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: isEven
                            ? "#0f0f0f"
                            : "rgba(26,10,46,0.30)",
                        }}
                      >
                        {/* Email */}
                        <td className="px-4 py-3 text-slime-text font-medium whitespace-nowrap">
                          {row.email}
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-slime-muted whitespace-nowrap text-xs">
                          {formatJoinDate(row.created_at)}
                        </td>

                        {/* Marketing */}
                        <td className="px-4 py-3 text-center">
                          {row.marketing_consent ? (
                            <span
                              className="font-bold text-base"
                              style={{ color: "#39FF14" }}
                              title="Opted in"
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="text-slime-muted">—</span>
                          )}
                        </td>

                        {/* Invited */}
                        <td className="px-4 py-3">
                          <InvitedBadge invited_at={row.invited_at} />
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3">
                          <SourcePill source={row.source} />
                        </td>

                        {/* Notes */}
                        <td
                          className="px-4 py-3 text-slime-muted text-xs max-w-[200px] truncate"
                          title={row.notes ?? undefined}
                        >
                          {row.notes ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
