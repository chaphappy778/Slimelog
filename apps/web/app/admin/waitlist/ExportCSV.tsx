"use client";

type WaitlistRow = {
  email: string;
  created_at: string | null;
  marketing_consent: boolean | null;
  source: string | null;
  invited_at: string | null;
  notes: string | null;
};

export default function ExportCSV({ data }: { data: WaitlistRow[] }) {
  function handleExport() {
    const headers = [
      "email",
      "joined_at",
      "marketing_consent",
      "source",
      "invited",
      "notes",
    ];

    const rows = data.map((row) => [
      row.email,
      row.created_at ? new Date(row.created_at).toISOString() : "",
      row.marketing_consent ? "true" : "false",
      row.source ?? "",
      row.invited_at ? new Date(row.invited_at).toISOString() : "pending",
      row.notes ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "slimelog-waitlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="text-xs font-bold px-4 py-2 rounded-full text-black transition-opacity hover:opacity-80 active:opacity-60"
      style={{
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
      }}
    >
      Export CSV
    </button>
  );
}
