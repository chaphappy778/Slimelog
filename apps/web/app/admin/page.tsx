// apps/web/app/admin/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = (d - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365)
    return rtf.format(Math.round(diff / 86400 / 30), "month");
  return rtf.format(Math.round(diff / 86400 / 365), "year");
}

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
      className="rounded-2xl px-5 py-4"
      style={{
        background: "#1a0a2e",
        border: "1px solid rgba(45,10,78,0.9)",
      }}
    >
      <p
        className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1"
        style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-black"
        style={{ color, fontFamily: "Montserrat, sans-serif" }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// 2026-07-16 (#26): System reminders — surface time-sensitive admin
// chores like key rotations. Each reminder has a due date; the card
// tints based on urgency (amber >30d, magenta ≤30d, red ≤7d) and
// hides itself once the due date is more than 7 days past (giving a
// grace window in case the admin needs to confirm rotation happened).
interface SystemReminderConfig {
  id: string;
  title: string;
  body: string;
  dueDate: string; // ISO date, YYYY-MM-DD
  href?: string;
  hrefLabel?: string;
}

const SYSTEM_REMINDERS: SystemReminderConfig[] = [
  {
    id: "siwa-key-rotation-2027-01",
    title: "Sign in with Apple client secret rotation",
    body:
      "Apple hard-caps SIWA client secrets at 6 months. Supabase should auto-rotate from the uploaded .p8, but verify rotation happened around this date. If not, re-upload the same .p8 in Supabase Auth → Providers → Apple.",
    dueDate: "2027-01-12",
    href: "https://supabase.com/dashboard/project/zxxjpxpchvsjkvslwtvx/auth/providers",
    hrefLabel: "Open Supabase provider config",
  },
];

function SystemReminderCard({ reminder }: { reminder: SystemReminderConfig }) {
  const due = new Date(reminder.dueDate + "T00:00:00Z").getTime();
  const now = Date.now();
  const daysUntil = Math.round((due - now) / (86400 * 1000));

  // Hide once the reminder is 7+ days stale (assumed handled by then).
  if (daysUntil < -7) return null;

  const tint =
    daysUntil <= 7
      ? { color: "#FF3D6E", bg: "rgba(255,61,110,0.10)", border: "rgba(255,61,110,0.45)" }
      : daysUntil <= 30
        ? { color: "#FF00E5", bg: "rgba(255,0,229,0.08)", border: "rgba(255,0,229,0.4)" }
        : { color: "#FFB800", bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.4)" };

  const dueLabel =
    daysUntil > 0
      ? `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`
      : daysUntil === 0
        ? "Due today"
        : `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: tint.bg,
        border: `1px solid ${tint.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p
          className="text-sm font-bold"
          style={{
            color: tint.color,
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          {reminder.title}
        </p>
        <span
          className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap px-2 py-1 rounded-full"
          style={{
            color: tint.color,
            background: `${tint.color}22`,
            border: `1px solid ${tint.border}`,
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          {dueLabel}
        </span>
      </div>
      <p className="text-xs" style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.5 }}>
        {reminder.body}
      </p>
      <p
        className="text-[11px] mt-2"
        style={{ color: "rgba(245,245,245,0.4)" }}
      >
        Target date: {reminder.dueDate}
      </p>
      {reminder.href && (
        <a
          href={reminder.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs font-bold underline underline-offset-2"
          style={{ color: tint.color }}
        >
          {reminder.hrefLabel ?? "Open link"} →
        </a>
      )}
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  badge,
  badgeColor,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  badge?: number;
  badgeColor?: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl p-5 transition-all hover:scale-[1.01]"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{
              width: 40,
              height: 40,
              background: "rgba(45,10,78,0.6)",
              border: "1px solid rgba(45,10,78,0.9)",
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p
              className="text-base font-bold text-white truncate"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {title}
            </p>
            <p className="text-xs text-slime-muted mt-0.5">{description}</p>
          </div>
        </div>
        {badge !== undefined && badge > 0 && (
          <span
            className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `${badgeColor}1F`,
              border: `1px solid ${badgeColor}66`,
              color: badgeColor,
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  // Audit hp-9 (2026-07-06): role-based admin check instead of
  // NEXT_PUBLIC_ADMIN_EMAIL string equality. See lib/is-admin-check.ts.
  if (!(await isAdminUser(authClient, user))) {
    redirect("/");
  }

  const admin = createAdminClient();

  const [
    userCount,
    logCount,
    brandCount,
    claimsCount,
    pendingReviewCount,
    pendingEmailCount,
    waitlistCount,
    pendingBrandSuggestionsCount,
    pendingVariantSuggestionsCount,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    admin
      .from("collection_logs")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    admin
      .from("brands")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review")
      .then((r) => r.count ?? 0),
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_email_verification")
      .then((r) => r.count ?? 0),
    admin
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    // T110 (2026-07-11): pending brand suggestions count for the admin
    // action card badge.
    admin
      .from("brand_suggestions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
    // T158 (2026-07-16): pending variant suggestions count.
    admin
      .from("variant_suggestions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
  ]);

  const [recentUsersResult, recentLogsResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("collection_logs")
      .select(
        `id, slime_name, created_at,
         profiles!collection_logs_user_id_fkey ( username )`,
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recentUsers = recentUsersResult.data ?? [];
  const recentLogs = recentLogsResult.data ?? [];
  const approvedCount = claimsCount - pendingReviewCount - pendingEmailCount;

  return (
    <PageWrapper dots>
      <PageHeader />
      <main className="pt-20 pb-24 px-4 max-w-4xl mx-auto">
        {/* Page title */}
        <div className="mb-8">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif", color: "#fff" }}
          >
            Admin
          </h1>
          <p className="text-xs text-slime-muted mt-1">
            SlimeLog control panel
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label="Users" value={userCount} color="#FF00E5" />
          <StatCard label="Logs" value={logCount} color="#00F0FF" />
          <StatCard label="Brands" value={brandCount} color="#39FF14" />
          <StatCard label="Waitlist" value={waitlistCount} color="#FFB800" />
          <StatCard label="Total Claims" value={claimsCount} color="#888888" />
          <StatCard
            label="Pending Review"
            value={pendingReviewCount}
            color="#00F0FF"
          />
          <StatCard
            label="Pending Email"
            value={pendingEmailCount}
            color="#FFB800"
          />
          <StatCard label="Approved" value={approvedCount} color="#39FF14" />
        </div>

        {/* 2026-07-16 (#26): System reminders — surfaces time-sensitive
            admin chores (key rotations, cert expirations, etc.). Cards
            auto-tint by urgency and hide themselves 7+ days after due. */}
        {SYSTEM_REMINDERS.some((r) => {
          const daysUntil = Math.round(
            (new Date(r.dueDate + "T00:00:00Z").getTime() - Date.now()) /
              (86400 * 1000),
          );
          return daysUntil >= -7;
        }) && (
          <>
            <p
              className="text-[11px] font-black tracking-widest uppercase mb-3"
              style={{ color: "#FFB800", fontFamily: "Montserrat, sans-serif" }}
            >
              System Reminders
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {SYSTEM_REMINDERS.map((r) => (
                <SystemReminderCard key={r.id} reminder={r} />
              ))}
            </div>
          </>
        )}

        {/* Quick actions */}
        <p
          className="text-[11px] font-black tracking-widest uppercase mb-3"
          style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
        >
          Quick Actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <ActionCard
            href="/admin/brand-claims"
            title="Brand Claims"
            description="Review pending ownership claims"
            badge={pendingReviewCount}
            badgeColor="#00F0FF"
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00F0FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 22V4a2 2 0 0 1 2-2h12l-2 5 2 5H6" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            }
          />
          <ActionCard
            href="/admin/brands"
            title="Brand Ownership"
            description="Claim, unclaim, or transfer brand ownership. Admin testing only."
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#39FF14"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          <ActionCard
            href="/admin/waitlist"
            title="Waitlist"
            description="View and export signup waitlist"
            badge={waitlistCount}
            badgeColor="#FFB800"
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFB800"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <ActionCard
            href="/admin/subscriptions"
            title="Subscription Tools"
            description="Sync from Stripe or manually set tier (QA)"
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF00E5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            }
          />
          <ActionCard
            href="/admin/brand-suggestions"
            title="Brand Suggestions"
            description="Review community-submitted brands"
            badge={pendingBrandSuggestionsCount}
            badgeColor="#FF00E5"
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF00E5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2v20" />
                <path d="M2 12h20" />
              </svg>
            }
          />
          <ActionCard
            href="/admin/variant-suggestions"
            title="Variant Suggestions"
            description="Review community-submitted brand variants"
            badge={pendingVariantSuggestionsCount}
            badgeColor="#39FF14"
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#39FF14"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            }
          />
        </div>

        {/* Recent signups */}
        <p
          className="text-[11px] font-black tracking-widest uppercase mb-3"
          style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
        >
          Recent Signups
        </p>
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{ border: "1px solid rgba(45,10,78,0.9)" }}
        >
          {recentUsers.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slime-muted">No users yet.</p>
          ) : (
            recentUsers.map((u, i) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: i % 2 === 0 ? "#0f0f0f" : "rgba(26,10,46,0.30)",
                }}
              >
                <div className="shrink-0" style={{ width: 28, height: 28 }}>
                  {u.avatar_url ? (
                    <Image
                      src={u.avatar_url}
                      alt={u.username ?? ""}
                      width={28}
                      height={28}
                      className="rounded-full object-cover"
                      style={{ width: 28, height: 28 }}
                    />
                  ) : (
                    <div
                      className="rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{
                        width: 28,
                        height: 28,
                        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                        color: "#0A0A0A",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      {(u.username ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span
                  className="text-sm font-bold truncate flex-1 min-w-0"
                  style={{
                    color: "#FF00E5",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  @{u.username ?? "unknown"}
                </span>
                <span className="text-xs text-slime-muted shrink-0 ml-auto">
                  {relativeTime(u.created_at)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Recent logs */}
        <p
          className="text-[11px] font-black tracking-widest uppercase mb-3"
          style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
        >
          Recent Logs
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(45,10,78,0.9)" }}
        >
          {recentLogs.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slime-muted">No logs yet.</p>
          ) : (
            recentLogs.map((log, i) => {
              const profile = Array.isArray(log.profiles)
                ? log.profiles[0]
                : log.profiles;
              return (
                <Link
                  key={log.id}
                  href={`/slimes/${log.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slime-surface"
                  style={{
                    background: i % 2 === 0 ? "#0f0f0f" : "rgba(26,10,46,0.30)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {log.slime_name ?? "Unnamed slime"}
                    </p>
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: "#FF00E5" }}
                    >
                      @{profile?.username ?? "unknown"}
                    </p>
                  </div>
                  <span className="text-xs text-slime-muted shrink-0 ml-auto">
                    {relativeTime(log.created_at)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </PageWrapper>
  );
}
