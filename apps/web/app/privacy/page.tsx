// apps/web/app/privacy/page.tsx
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div
      style={{
        background: "#0A0A0A",
        minHeight: "100vh",
        fontFamily: "'Montserrat', sans-serif",
        color: "#F5F5F5",
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
      {/* Back button header */}
      <div style={{ padding: "1.5rem 1.5rem 0" }}>
        <Link
          href="/settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(245,245,245,0.5)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            width={16}
            height={16}
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Settings
        </Link>
      </div>

      <div style={{ padding: "1.5rem 2rem 4rem" }}>
        <h1 style={{ color: "#39FF14", marginBottom: "0.5rem" }}>
          Privacy Policy
        </h1>
        <p
          style={{
            color: "rgba(245,245,245,0.4)",
            fontSize: 13,
            marginBottom: "2rem",
          }}
        >
          Last updated: March 2026
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          What We Collect
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          We collect your email address, username, avatar, slime logs, photos,
          ratings, device info, and usage analytics.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>How We Use It</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          We use your data to run the app, power community features, and send
          marketing emails only if you explicitly opted in.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Third Party Services
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          We use Supabase for database, authentication, and storage. Google
          OAuth for sign-in. Vercel for hosting.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Photo Storage</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          Photos are stored in Supabase Storage with a 5MB limit per photo.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Data Retention
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          We keep your data for as long as your account is active.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Your Rights</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          You can access your data or delete your account and all associated
          data from the Settings page.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Account Deletion
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          Deleting your account removes all logs, photos, ratings, and profile
          data permanently.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Children&apos;s Privacy
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          SlimeLog is intended for users 13 and older. We do not knowingly
          collect data from anyone under 13. Contact us if you believe a minor
          has signed up.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Marketing Emails
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          We only send marketing emails if you explicitly opted in. Every email
          includes an unsubscribe link.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Contact</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          support@slimelog.com
        </p>

        <p style={{ marginTop: "2rem" }}>
          <Link href="/terms" style={{ color: "#00F0FF" }}>
            Read our Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
