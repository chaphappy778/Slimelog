// apps/web/app/admin/brand-claims/[id]/ClaimDocumentPreview.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

interface Props {
  claimId: string;
  filename: string | null;
}

interface SignedUrlResponse {
  signed_url: string;
  mime_type: string;
  filename: string | null;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: SignedUrlResponse }
  | { kind: "error"; message: string };

export default function ClaimDocumentPreview({ claimId, filename }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/admin/brand-claims/document-url?claim_id=${encodeURIComponent(
          claimId,
        )}`,
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message:
            (json && typeof json.error === "string" ? json.error : null) ??
            "Could not load document.",
        });
        return;
      }
      const data = (await res.json()) as SignedUrlResponse;
      setState({ kind: "ready", data });
    } catch {
      setState({ kind: "error", message: "Could not load document." });
    }
  }, [claimId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <p className="text-sm text-slime-muted text-center py-8">
        Loading document…
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slime-muted mb-3">
          {state.message} Try refreshing.
        </p>
        <button
          type="button"
          onClick={load}
          className="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
          style={{
            background: "rgba(10,0,20,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#00F0FF",
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  const { signed_url, mime_type } = state.data;
  const isPdf = mime_type === "application/pdf";
  const isImage = mime_type.startsWith("image/");

  return (
    <div>
      {isPdf && (
        <iframe
          src={signed_url}
          title="Claim verification document"
          style={{
            width: "100%",
            height: 800,
            border: "none",
            borderRadius: 10,
            background: "#fff",
          }}
        />
      )}
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signed_url}
          alt="Claim verification document"
          style={{
            maxWidth: "100%",
            borderRadius: 10,
            display: "block",
          }}
        />
      )}
      {!isPdf && !isImage && (
        <div
          className="rounded-lg p-4"
          style={{
            background: "rgba(10,0,20,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <p className="text-sm text-slime-muted mb-2">
            Inline preview not available for this file type ({mime_type}).
          </p>
          <a
            href={signed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#39FF14" }}
          >
            Open in new tab →
          </a>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        <p className="text-slime-muted truncate">
          {filename ?? "(unknown filename)"}
        </p>
        <a
          href={signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold uppercase tracking-widest shrink-0 ml-2"
          style={{ color: "#00F0FF" }}
        >
          Open ↗
        </a>
      </div>
    </div>
  );
}
