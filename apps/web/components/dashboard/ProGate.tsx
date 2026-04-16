// apps/web/components/dashboard/ProGate.tsx
"use client";

import UpgradeButton from "@/components/UpgradeButton";

interface ProGateProps {
  isPro: boolean;
  children: React.ReactNode;
  brandId?: string;
  brandSlug?: string;
}

export default function ProGate({
  isPro,
  children,
  brandId,
  brandSlug,
}: ProGateProps) {
  if (isPro) return <>{children}</>;

  return (
    <div className="relative">
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(3px)", opacity: 0.4 }}
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] rounded-xl">
        <div
          className="rounded-2xl p-6 text-center max-w-xs mx-auto border"
          style={{
            background: "rgba(45,10,78,0.92)",
            borderColor: "rgba(0,240,255,0.3)",
            boxShadow: "0 0 40px rgba(0,240,255,0.1)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#00F0FF] mb-2">
            Brand Pro Feature
          </p>
          <p className="text-sm text-[#9B8AAE] mb-4 leading-relaxed">
            Upgrade to Brand Pro to unlock full analytics and export tools.
          </p>
          <UpgradeButton
            priceId={process.env.NEXT_PUBLIC_STRIPE_BRAND_PRO_PRICE_ID!}
            label="Upgrade to Brand Pro — $19/mo"
            mode="brand"
            brandId={brandId}
            currentPath={
              brandSlug ? `/brand-dashboard/${brandSlug}/analytics` : "/brands"
            }
          />
        </div>
      </div>
    </div>
  );
}
