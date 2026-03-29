"use client";
// apps/web/components/ImageUpload.tsx

import { useRef, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageUploadProps {
  bucket: "slime-photos" | "avatars";
  userId: string;
  existingUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  aspectRatio?: "square" | "portrait" | "4:3";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_DIMENSION = 1200;
const COMPRESS_QUALITY = 0.8;

// ─── Canvas compression ───────────────────────────────────────────────────────

/**
 * Resizes an image file to MAX_DIMENSION on its longest side and converts
 * it to WebP using the Canvas API. Returns a Blob.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        COMPRESS_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateFilePath(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}/${timestamp}-${random}.webp`;
}

function aspectRatioClass(ar: ImageUploadProps["aspectRatio"]): string {
  switch (ar) {
    case "portrait":
      return "aspect-[3/4]";
    case "4:3":
      return "aspect-[4/3]";
    case "square":
    default:
      return "aspect-square";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageUpload({
  bucket,
  userId,
  existingUrl,
  onUploadComplete,
  onRemove,
  label = "Add a photo",
  aspectRatio = "square",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset state
      setError(null);
      setProgress(0);

      // Show a local preview immediately so the UI feels snappy
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      setUploading(true);

      try {
        // ── 1. Compress ───────────────────────────────────────────────────────
        setProgress(20);
        const compressed = await compressImage(file);
        setProgress(40);

        // ── 2. Build path ─────────────────────────────────────────────────────
        // Path: {userId}/{timestamp}-{random}.webp
        const filePath = generateFilePath(userId);

        // ── 3. Upload to Supabase Storage ─────────────────────────────────────
        setProgress(60);
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, compressed, {
            contentType: "image/webp",
            upsert: false,
          });

        if (uploadError) {
          // Common RLS error: "new row violates row-level security policy"
          // This means the userId prop doesn't match auth.uid() — likely a
          // server component passing a user id to an unauthenticated client.
          throw new Error(uploadError.message);
        }

        setProgress(90);

        // ── 4. Get public URL ─────────────────────────────────────────────────
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);

        setProgress(100);
        setPreviewUrl(publicUrl);
        onUploadComplete(publicUrl);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed. Try again.",
        );
        // Revert to existing URL on failure
        setPreviewUrl(existingUrl ?? null);
        URL.revokeObjectURL(localPreview);
      } finally {
        setUploading(false);
        // Reset the file input so the same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, userId, existingUrl, onUploadComplete, supabase],
  );

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  }, [onRemove]);

  const hasImage = Boolean(previewUrl);
  const arClass = aspectRatioClass(aspectRatio);

  return (
    <div className="flex flex-col gap-2">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        aria-label={label}
      />

      {/* Upload area */}
      <div className={`relative w-full ${arClass} rounded-2xl overflow-hidden`}>
        {hasImage ? (
          /* ── Image preview ─────────────────────────────────────────────── */
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl!}
              alt="Uploaded photo"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay on upload */}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <div className="w-2/3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-white text-xs font-semibold tracking-wide">
                  Uploading… {progress}%
                </p>
              </div>
            )}

            {/* Controls: replace + remove */}
            {!uploading && (
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md text-base active:scale-95 transition-transform"
                  aria-label="Replace photo"
                  title="Replace photo"
                >
                  📷
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md text-base active:scale-95 transition-transform"
                    aria-label="Remove photo"
                    title="Remove photo"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Empty tap-to-upload area ──────────────────────────────────── */
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slime-accent/40 bg-slime-accent/5 active:bg-slime-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={label}
          >
            {uploading ? (
              <>
                <div className="w-1/2 h-1.5 rounded-full bg-slime-accent/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slime-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-slime-accent font-semibold">
                  {progress}%
                </span>
              </>
            ) : (
              <>
                <span className="text-4xl">📷</span>
                <span className="text-sm font-semibold text-slime-accent">
                  {label}
                </span>
                <span className="text-xs text-slime-muted">
                  Tap to choose a photo
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400 leading-snug">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
