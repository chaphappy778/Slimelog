// apps/web/components/notifications/NotificationRow.tsx
//
// T29 (2026-07-12): renders a single notification card.
//
// Row shape → copy + icon + link mapping lives in `renderContent`
// below. Each of the 10 notification types has its own icon glyph,
// copy template, and destination. If a joined relation is missing
// (brand deleted, log deleted, actor deleted), we fall back to a
// generic textual variant of the copy instead of crashing.
//
// The tap handler POSTs { ids: [notification.id] } to
// /api/notifications/mark-read before pushing the router — the
// mark-read call is fire-and-forget from the user's perspective
// (we optimistically flip is_read locally through onMarkedRead).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Notification,
  NotificationType,
} from "@/lib/types";
import { formatRelativeTime } from "@/lib/format-time";

interface Props {
  notification: Notification;
  onMarkedRead: (id: string) => void;
}

// ─── Icon library ─────────────────────────────────────────────────────────────
// All icons: line SVGs, 2px stroke, currentColor. No emojis, no
// character art (community sensitivity — no AI-looking illustrations).

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function SlashCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M5 5l14 14" />
    </svg>
  );
}

// ─── Content resolution ───────────────────────────────────────────────────────

interface RenderedContent {
  icon: React.ReactNode;
  // color used by the round icon container as tint. Kept in a small
  // palette so the feed reads cohesively.
  tint: string;
  // Rendered inline copy — actor name, brand name, drop name etc. get
  // baked in here so we don't have to expose the joined data
  // separately.
  copy: React.ReactNode;
  href: string | null;
}

function boldSpan(text: string): React.ReactElement {
  return (
    <span
      className="font-semibold"
      style={{ color: "#FFFFFF" }}
    >
      {text}
    </span>
  );
}

// Palette — matches the neon-holo language used across the app.
const TINT = {
  green: "#39FF14", // approvals, positive
  magenta: "#FF00E5", // drops, live moments
  cyan: "#00F0FF", // discovery, social
  slate: "#B4A9C4", // muted / negative / sold out
} as const;

function renderContent(n: Notification): RenderedContent {
  const type: NotificationType = n.type;
  const actorName = n.actor?.username ?? null;
  const brandName = n.brand?.name ?? null;
  const brandSlug = n.brand?.slug ?? null;
  const dropName = n.drop?.name ?? null;
  const logId = n.log?.id ?? null;
  const slimeName = n.log?.slime_name ?? null;

  const actorLabel = actorName ? `@${actorName}` : "Someone";

  switch (type) {
    case "brand_suggestion_approved": {
      const brandLabel = brandName ?? "your suggestion";
      return {
        icon: <CheckIcon />,
        tint: TINT.green,
        copy: (
          <>
            Your brand suggestion {boldSpan(brandLabel)} is now in the
            catalog.
          </>
        ),
        href: brandSlug ? `/brands/${brandSlug}` : null,
      };
    }

    case "brand_suggestion_rejected": {
      return {
        icon: <XIcon />,
        tint: TINT.slate,
        copy: <>Your brand suggestion wasn&apos;t accepted.</>,
        href: "/submit-brand",
      };
    }

    // T158 (2026-07-16): variant suggestion outcomes. Notifications
    // for these fire from the /admin/variant-suggestions approve /
    // reject endpoints and are linked to the brand the variant is
    // scoped to. The wizard's picker will now include the newly
    // approved variant next time the user opens the log flow for that
    // brand + base type.
    case "variant_suggestion_approved": {
      const brandLabel = brandName ?? "your suggestion";
      return {
        icon: <CheckIcon />,
        tint: TINT.green,
        copy: (
          <>
            Your variant suggestion is now tracked for{" "}
            {boldSpan(brandLabel)}.
          </>
        ),
        href: brandSlug ? `/brands/${brandSlug}` : null,
      };
    }

    case "variant_suggestion_rejected": {
      const brandLabel = brandName ?? "that brand";
      return {
        icon: <XIcon />,
        tint: TINT.slate,
        copy: (
          <>
            Your variant suggestion for {boldSpan(brandLabel)} wasn&apos;t
            accepted.
          </>
        ),
        href: brandSlug ? `/brands/${brandSlug}` : null,
      };
    }

    case "new_follower": {
      return {
        icon: <UserPlusIcon />,
        tint: TINT.cyan,
        copy: <>{boldSpan(actorLabel)} followed you.</>,
        href: actorName ? `/users/${actorName}` : null,
      };
    }

    case "friend_log": {
      return {
        icon: <PlusSquareIcon />,
        tint: TINT.green,
        copy: <>{boldSpan(actorLabel)} logged a new slime.</>,
        href: logId ? `/slimes/${logId}` : null,
      };
    }

    case "friend_rating": {
      const target = slimeName ? boldSpan(slimeName) : boldSpan("a slime");
      return {
        icon: <StarIcon />,
        tint: TINT.cyan,
        copy: (
          <>
            {boldSpan(actorLabel)} rated {target}.
          </>
        ),
        href: logId ? `/slimes/${logId}` : null,
      };
    }

    case "comment_on_log": {
      return {
        icon: <MessageIcon />,
        tint: TINT.cyan,
        copy: <>{boldSpan(actorLabel)} commented on your log.</>,
        href: logId ? `/slimes/${logId}` : null,
      };
    }

    case "like_on_log": {
      return {
        icon: <HeartIcon />,
        tint: TINT.magenta,
        copy: <>{boldSpan(actorLabel)} liked your log.</>,
        href: logId ? `/slimes/${logId}` : null,
      };
    }

    case "drop_announced": {
      const brandLabel = brandName ?? "a brand you follow";
      const drop = dropName ? `: ${dropName}` : "";
      return {
        icon: <BellIcon />,
        tint: TINT.magenta,
        copy: (
          <>
            New drop from {boldSpan(brandLabel)}
            {drop}.
          </>
        ),
        href: brandSlug ? `/brands/${brandSlug}` : null,
      };
    }

    case "drop_live": {
      const drop = dropName ? boldSpan(dropName) : boldSpan("A drop");
      return {
        icon: <ZapIcon />,
        tint: TINT.magenta,
        copy: <>{drop} is live now.</>,
        href: brandSlug ? `/brands/${brandSlug}` : null,
      };
    }

    case "drop_sold_out": {
      const drop = dropName ? boldSpan(dropName) : boldSpan("A drop");
      return {
        icon: <SlashCircleIcon />,
        tint: TINT.slate,
        copy: <>{drop} sold out.</>,
        href: brandSlug ? `/brands/${brandSlug}` : null,
      };
    }

    default: {
      // Exhaustiveness guard — if a future migration adds a new enum
      // value and forgets to teach this switch about it, we still
      // render something readable instead of crashing.
      const _exhaustive: never = type;
      void _exhaustive;
      return {
        icon: <BellIcon />,
        tint: TINT.slate,
        copy: <>You have a new notification.</>,
        href: null,
      };
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationRow({
  notification,
  onMarkedRead,
}: Props): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [readLocal, setReadLocal] = useState<boolean>(notification.is_read);

  const content = renderContent(notification);

  const isRead = readLocal;
  const time = formatRelativeTime(notification.created_at);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);

    // Optimistic — flip locally + notify parent so the badge / count
    // pill both refresh without waiting on the network.
    if (!isRead) {
      setReadLocal(true);
      onMarkedRead(notification.id);
    }

    // Fire-and-forget mark-read. If it fails we've already updated
    // the UI; the next page load will resync the flag.
    if (!notification.is_read) {
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids: [notification.id] }),
        });
      } catch (err) {
        console.error("[NotificationRow] mark-read failed:", err);
      }
    }

    if (content.href) {
      router.push(content.href);
    }
    setBusy(false);
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(45,10,78,0.3)",
    border: "1px solid rgba(45,10,78,0.7)",
    borderLeft: isRead ? "1px solid rgba(45,10,78,0.7)" : "3px solid #00F0FF",
    // Push the label to the right a hair when the unread accent
    // steals a couple of pixels of border width so the copy doesn't
    // shift between read/unread states.
    paddingLeft: isRead ? 12 : 10,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="w-full text-left rounded-2xl transition-colors active:scale-[0.99]"
      style={cardStyle}
      aria-label={isRead ? "Notification" : "Unread notification"}
    >
      <div
        className="flex items-center gap-3 py-3 pr-3"
        style={{ minHeight: 56 }}
      >
        {/* Icon puck */}
        <div
          className="flex-none flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: `${content.tint}22`,
            color: content.tint,
            border: `1px solid ${content.tint}55`,
          }}
        >
          {content.icon}
        </div>

        {/* Copy */}
        <div
          className="flex-1 min-w-0 text-sm leading-snug"
          style={{ color: "#E7E1F3" }}
        >
          {content.copy}
        </div>

        {/* Timestamp */}
        <div
          className="flex-none text-xs"
          style={{ color: "#8C7FA0" }}
        >
          {time}
        </div>
      </div>
    </button>
  );
}
