// apps/web/app/brand-verification/page.tsx
import type { Metadata } from "next";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Brand Verification — SlimeLog",
  description:
    "How brand verification works on SlimeLog. Verify ownership of your brand to unlock the brand dashboard and verified badge.",
};

export default function BrandVerificationPage() {
  return (
    <PageWrapper dots>
      <PageHeader />

      {/* [Change 2 — Bundle A] Inline back button block removed. PageHeader
          now matches /brand-verification via BACK_BUTTON_ROUTES and renders
          its own back button with proper navigation-history-stack behavior.
          The <header> below was previously mt-6 to sit beneath the inline
          back button; now mt-0 since <main>'s pt-14 already provides
          clearance from the fixed PageHeader. The unused `Link` import was
          also removed (all in-page links use raw <a href> tags). */}
      <main className="pt-14 pb-24 max-w-2xl mx-auto px-4">
        <header className="mt-0">
          <p
            className="text-[10px] uppercase tracking-widest font-bold mb-2"
            style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
          >
            For brand owners
          </p>
          <h1
            className="text-3xl font-black"
            style={{
              color: "#fff",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            Brand Verification
          </h1>
          <p className="mt-4 text-sm text-slime-text/85 leading-relaxed">
            SlimeLog brand verification protects the integrity of every brand
            page on the platform. Verified brand owners get access to the brand
            dashboard, analytics, drop management, and the verified badge that
            signals to the community this is the real brand.
          </p>
        </header>

        <Section title="What we require">
          <ul className="flex flex-col gap-3">
            <BulletItem>
              A business email at the brand&apos;s domain (e.g.{" "}
              <code className="text-slime-cyan">you@yourbrand.com</code>) —
              generic addresses like Gmail or Yahoo can&apos;t verify ownership.
            </BulletItem>
            <BulletItem>
              Business documentation: business registration certificate, EIN
              letter, trademark filing, or DBA certificate.
            </BulletItem>
            <BulletItem>
              Your full legal name and your role at the brand (owner or
              authorized representative).
            </BulletItem>
          </ul>
        </Section>

        <Section title="How review works">
          <p className="text-sm text-white/85 leading-relaxed">
            You submit a claim through the brand page. We send a 6-digit code to
            your business email — entering it confirms you control that inbox.
            You upload a piece of business documentation. From there, the
            SlimeLog team reviews your claim within 3-5 business days. Approval
            grants you access to the brand dashboard and the verified badge on
            your brand page. If we can&apos;t verify the claim, we send a
            rejection email with the reason and you&apos;re welcome to resubmit.
          </p>
        </Section>

        <Section title="When multiple people claim the same brand">
          <p className="text-sm text-white/85 leading-relaxed">
            Sometimes more than one person claims the same brand at the same
            time. We review every claim individually. When we approve one,
            others receive a polite auto-rejection email. If you believe the
            wrong person was approved as the brand owner, email{" "}
            <a
              href="mailto:support@slimelog.com"
              className="text-slime-accent font-semibold hover:underline"
            >
              support@slimelog.com
            </a>{" "}
            and we&apos;ll investigate.
          </p>
        </Section>

        <Section title="Your documents are private">
          <p className="text-sm text-white/85 leading-relaxed">
            Documentation you upload is stored securely and only viewable by
            SlimeLog reviewers. We never share documents with third parties.
            After verification is approved or rejected, documents are retained
            for our records and may be deleted on request after the claim is
            finalized.
          </p>
        </Section>

        <Section title="After verification">
          <p className="text-sm text-white/85 leading-relaxed">
            Once your brand is verified, you&apos;ll have access to the brand
            dashboard. Brand Pro is a separate optional upgrade that unlocks
            analytics, CSV export, and recurring drop management — but
            verification itself is always free.
          </p>
        </Section>

        <footer className="mt-10 text-center">
          <p className="text-xs text-slime-muted">
            Questions?{" "}
            <a
              href="mailto:support@slimelog.com"
              className="text-slime-accent font-semibold hover:underline"
            >
              Email support@slimelog.com
            </a>
          </p>
        </footer>
      </main>
    </PageWrapper>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mt-6 rounded-xl"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
        padding: 24,
        backdropFilter: "blur(8px)",
      }}
    >
      <h2
        className="text-base font-bold mb-3"
        style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-white/85 leading-relaxed">
      <span
        className="shrink-0 mt-0.5 flex items-center justify-center"
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: "rgba(57,255,20,0.15)",
          border: "1px solid rgba(57,255,20,0.4)",
        }}
        aria-hidden="true"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#39FF14"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
