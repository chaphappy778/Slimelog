export default function PrivacyPage() {
  return (
    <div
      style={{
        background: "#0A0A0A",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "'Montserrat', sans-serif",
        color: "#F5F5F5",
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
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

      <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>What We Collect</h2>
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
        We use Supabase for database, authentication, and storage. Google OAuth
        for sign-in. Vercel for hosting.
      </p>

      <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Photo Storage</h2>
      <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
        Photos are stored in Supabase Storage with a 5MB limit per photo.
      </p>

      <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Data Retention</h2>
      <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
        We keep your data for as long as your account is active.
      </p>

      <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>Your Rights</h2>
      <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
        You can access your data or delete your account and all associated data
        from the Settings page.
      </p>

      <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
        Account Deletion
      </h2>
      <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
        Deleting your account removes all logs, photos, ratings, and profile
        data permanently.
      </p>

      <h2 style={{ color: "#00F0FF", marginTop: "1.5rem" }}>
        Children's Privacy
      </h2>
      <p style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.7 }}>
        SlimeLog is intended for users 13 and older. We do not knowingly collect
        data from anyone under 13. Contact us if you believe a minor has signed
        up.
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
        hello@slimelog.com
      </p>

      <p style={{ marginTop: "2rem" }}>
        <a href="/terms" style={{ color: "#00F0FF" }}>
          Read our Terms of Service
        </a>
      </p>
    </div>
  );
}
