import Link from "next/link";

interface ProGateProps {
  isPro: boolean;
  children: React.ReactNode;
  slug?: string;
}

export default function ProGate({ isPro, children, slug }: ProGateProps) {
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
            Verified Brand Feature
          </p>
          <p className="text-sm text-[#9B8AAE] mb-4 leading-relaxed">
            Upgrade to Verified to unlock full analytics, drop notifications,
            and more.
          </p>
          <Link
            href={slug ? `/brands/${slug}` : "/brands"}
            className="inline-block px-4 py-2 rounded-full text-sm font-bold text-[#0A0A0A] transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
          >
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}
