// apps/web/app/brands/[slug]/catalog/page.tsx
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";

export default async function BrandCatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PageWrapper dots>
      <PageHeader />
      <main className="pt-14 pb-24 max-w-2xl mx-auto">
        {/* Back button */}
        <div className="px-4 pt-4">
          <Link
            href={`/brands/${slug}`}
            className="inline-flex items-center justify-center transition-colors"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(10,0,20,0.55)",
              border: "1px solid rgba(45,10,78,0.5)",
            }}
            aria-label="Back to brand"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <h1
            className="text-2xl font-black"
            style={{
              color: "#00F0FF",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            Slime Catalog
          </h1>
          <p className="text-sm text-slime-muted mt-2">
            Full catalog view coming soon.
          </p>
        </div>
      </main>
    </PageWrapper>
  );
}
