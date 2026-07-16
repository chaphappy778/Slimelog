// apps/web/app/admin/waitlist/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import PageWrapper from "@/components/PageWrapper";
// 2026-07-11: PageHeader added so the shared back-button route (via
// BACK_BUTTON_ROUTES → /^\/admin\/waitlist$/ in PageHeader.tsx) actually
// renders. Was missing before; page had no way to navigate back to /admin.
import PageHeader from "@/components/PageHeader";
import ExportCSV from "./ExportCSV";

// ─── Types ────────────────────────────────────────────────────────────────────

type WaitlistRow = {
  id: string;
  email: string;
  created_at: string | null;
  source: string | null;
  // 2026-07-15 side quest: attribution capture from /waitlist form + URL params.
  heard_from: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
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

// 2026-07-15: dedicated pill for the heard_from picker value. Handles the
// "other:<free text>" sentinel by splitting and showing the free text if
// present, otherwise "Other". Color-differentiated (magenta) so it's visually
// distinct from the SIGNUP_SOURCE pill (cyan) which is a legacy page identifier.
function HeardFromPill({ value }: { value: string | null }) {
  if (!value) return <span className="text-slime-muted">—</span>;
  const isOtherFreeText = value.startsWith("other:");
  const display = isOtherFreeText
    ? value.slice("other:".length).trim() || "other"
    : value.replace(/_/g, " ");
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full max-w-[160px] truncate align-middle"
      style={{
        background: isOtherFreeText ? "rgba(255,0,229,0.10)" : "rgba(255,0,229,0.08)",
        border: `1px solid ${isOtherFreeText ? "rgba(255,0,229,0.5)" : "rgba(255,0,229,0.35)"}`,
        color: "#FF00E5",
      }}
      title={display}
    >
      {display}
    </span>
  );
}

// Compact display for UTM campaign (when set). Green tint so it's visually
// distinct from both source pills.
function UtmCampaignPill({ campaign }: { campaign: string | null }) {
  if (!campaign) return <span className="text-slime-muted">—</span>;
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full max-w-[180px] truncate align-middle"
      style={{
        background: "rgba(57,255,20,0.08)",
        border: "1px solid rgba(57,255,20,0.3)",
        color: "#39FF14",
      }}
      title={campaign}
    >
      {campaign}
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

  // Audit hp-9 (2026-07-06): role-based admin check.
  if (!(await isAdminUser(authClient, user))) {
    redirect("/");
  }

  // ── Data fetch (service role — bypasses RLS) ──────────────────────────────
  const admin = createAdminClient();

  const { data: waitlist } = await admin
    .from("waitlist")
    .select(
      // 2026-07-15: include attribution capture columns (heard_from + UTM)
      // added by migration 20260715000074.
      "id, email, created_at, source, heard_from, utm_source, utm_medium, utm_campaign, utm_content, utm_term, marketing_consent, invited_at, notes",
    )
    .order("created_at", { ascending: false });

  const rows: WaitlistRow[] = waitlist ?? [];

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCount = rows.length;
  const marketingCount = rows.filter((r) => r.marketing_consent).length;
  const pendingCount = rows.filter((r) => !r.invited_at).length;
  // 2026-07-15: track how many signups came in with any attribution data
  // (self-report OR any UTM param). Useful health metric — if this stays
  // low after the /waitlist dropdown ships, promo link tagging or the
  // dropdown itself needs attention.
  const attributedCount = rows.filter(
    (r) =>
      r.heard_from !== null ||
      r.utm_source !== null ||
      r.utm_campaign !== null,
  ).length;

  return (
    <PageWrapper glow="magenta">
      <PageHeader />
      <div className="pt-20 px-4 py-8 max-w-5xl mx-auto">
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
        <div className="flex flex-wrap gap-3 mb-8">
          <StatCard label="Total Signups" value={totalCount} color="#39FF14" />
          <StatCard
            label="Marketing Opt-in"
            value={marketingCount}
            color="#00F0FF"
          />
          <StatCard label="Not Invited" value={pendingCount} color="#FF00E5" />
          <StatCard
            label="With Attribution"
            value={attributedCount}
            color="#FFD24A"
          />
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
                      "Heard From",
                      "Campaign",
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
                            <svg
                              aria-label="Opted in"
                              role="img"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#39FF14"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                display: "inline-block",
                                verticalAlign: "middle",
                              }}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="text-slime-muted">—</span>
                          )}
                        </td>

                        {/* Invited */}
                        <td className="px-4 py-3">
                          <InvitedBadge invited_at={row.invited_at} />
                        </td>

                        {/* Heard From (self-reported picker value) */}
                        <td className="px-4 py-3">
                          <HeardFromPill value={row.heard_from} />
                        </td>

                        {/* UTM Campaign (paid promo attribution) */}
                        <td className="px-4 py-3">
                          <UtmCampaignPill campaign={row.utm_campaign} />
                        </td>

                        {/* Source (legacy page identifier) */}
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
