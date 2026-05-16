// apps/web/app/terms/page.tsx
import Link from "next/link";

export default function TermsPage() {
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
          Terms of Service
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

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Acceptance</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          By using SlimeLog you agree to these terms.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Eligibility</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          You must be 13 or older to use SlimeLog.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Your Account</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          Keep your credentials secure. One account per person. Provide accurate
          information.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>User Content</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          You own your slime logs and photos. You grant SlimeLog a license to
          display them in the app and community features. We never sell your
          content.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Acceptable Use
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          No spam, fake reviews, harassment, or scraping.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Pro Subscription
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          $2.99 per month or $14.99 per year, cancel anytime. No refunds for
          partial months.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Brand Verification
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          $19 per month, cancel anytime.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
          Intellectual Property
        </h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          The SlimeLog name, logo, and design are our property.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Disclaimers</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          The app is provided as-is. We are not liable for user-generated
          content.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Governing Law</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          State of Connecticut.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Changes</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          We will notify users of material changes via email or in-app notice.
        </p>

        <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Contact</h2>
        <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
          support@slimelog.com
        </p>

        <p style={{ marginTop: "2rem" }}>
          <Link href="/privacy" style={{ color: "#00F0FF" }}>
            Read our Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
