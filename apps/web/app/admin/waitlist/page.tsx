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

  // 2026-07-15: destructure { data, error } per CLAUDE.md rule ("Never
  // silently swallow errors"). Previous version omitted `error` and any
  // Supabase failure (missing column, RLS drift, connection blip) would
  // silently render 0s across the board. Also runs a defensive fallback
  // for the "migration-lag" pattern from docs/error-tracker.md — if the
  // attribution columns from migration 20260715000074 aren't applied yet
  // in the environment we're reading from, we retry with just the base
  // columns so the admin page keeps working.
  const FULL_COLUMNS =
    "id, email, created_at, source, heard_from, utm_source, utm_medium, utm_campaign, utm_content, utm_term, marketing_consent, invited_at, notes";
  const LEGACY_COLUMNS =
    "id, email, created_at, source, marketing_consent, invited_at, notes";

  let waitlist: WaitlistRow[] | null = null;
  let migrationApplied = true;

  const fullQuery = await admin
    .from("waitlist")
    .select(FULL_COLUMNS)
    .order("created_at", { ascending: false });

  if (fullQuery.error) {
    console.warn(
      "[admin/waitlist] full-column select failed, retrying with legacy columns:",
      fullQuery.error.message,
    );
    migrationApplied = false;
    const legacyQuery = await admin
      .from("waitlist")
      .select(LEGACY_COLUMNS)
      .order("created_at", { ascending: false });
    if (legacyQuery.error) {
      console.error(
        "[admin/waitlist] legacy select ALSO failed:",
        legacyQuery.error.message,
      );
    } else if (legacyQuery.data) {
      // Coerce legacy rows into WaitlistRow shape by filling the missing
      // attribution columns with nulls.
      waitlist = legacyQuery.data.map((r) => ({
        ...r,
        heard_from: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
        utm_term: null,
      })) as WaitlistRow[];
    }
  } else {
    waitlist = fullQuery.data as WaitlistRow[] | null;
  }

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

        {/* Migration-lag banner — surfaces when the attribution columns
            aren't applied in the current environment yet. Renders as a
            subtle amber warning so the operator knows the "With Attribution"
            stat + Heard From + Campaign columns are showing empty because
            the DB isn't ready, not because signups have no attribution. */}
        {!migrationApplied && (
          <div
            className="rounded-2xl px-4 py-3 mb-6 flex items-start gap-3"
            style={{
              background: "rgba(255,210,74,0.08)",
              border: "1px solid rgba(255,210,74,0.35)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFD24A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 2 }}
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="flex-1 text-xs leading-relaxed" style={{ color: "#FFD24A" }}>
              <p className="font-bold uppercase tracking-widest mb-1" style={{ fontSize: 10 }}>
                Migration pending
              </p>
              <p style={{ color: "rgba(255,210,74,0.9)" }}>
                Attribution columns (heard_from, utm_*) aren&apos;t applied to this
                database yet. Signups still work — the picker + UTM values are
                just being stored as nulls until migration 20260715000074 runs.
                Run <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 4 }}>npx supabase db push</code> to apply. See Vercel logs for
                the exact Supabase error.
              </p>
            </div>
          </div>
        )}

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
