"use client";
// apps/web/app/settings/profile/page.tsx
//
// Changes from previous version:
//  - Avatar URL text input replaced with <ImageUpload> component
//  - Uses the 'avatars' bucket
//  - image_url returned from onUploadComplete updates avatar_url in form state
//  - All other save logic (supabase.from("profiles").update) is unchanged

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ImageUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileFormState {
  username: string;
  bio: string;
  location: string;
  website_url: string;
  avatar_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-2xl bg-white border border-pink-100 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-300/60 transition shadow-sm";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-300 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    username: "",
    bio: "",
    location: "",
    website_url: "",
    avatar_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Load current profile ──────────────────────────────────────────────────

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, location, website_url, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load profile:", error.message);
      }

      if (data) {
        setForm({
          username: data.username ?? "",
          bio: data.bio ?? "",
          location: data.location ?? "",
          website_url: data.website_url ?? "",
          avatar_url: data.avatar_url ?? null,
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function set<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!userId) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: form.username.trim() || undefined,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        website_url: form.website_url.trim() || null,
        avatar_url: form.avatar_url,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <main
        className="min-h-screen pb-24 px-4 pt-10"
        style={{
          background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
        }}
      >
        <div className="max-w-md mx-auto space-y-4 animate-pulse">
          <div className="h-8 w-40 bg-pink-100 rounded-xl" />
          <div className="h-32 w-32 bg-pink-100 rounded-3xl mx-auto" />
          <div className="h-12 bg-pink-100 rounded-2xl" />
          <div className="h-12 bg-pink-100 rounded-2xl" />
          <div className="h-24 bg-pink-100 rounded-2xl" />
        </div>
      </main>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main
      className="min-h-screen pb-24"
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
      }}
    >
      <header className="px-4 pt-10 pb-6">
        <h1 className="text-xl font-black text-gray-900">Edit Profile</h1>
        <p className="text-sm text-gray-400 mt-1">
          Customize how you appear to the community.
        </p>
      </header>

      <div className="px-4 flex flex-col gap-6 max-w-md mx-auto">
        {/* ── Avatar upload ── */}
        <Field label="Profile Photo" hint="Square photos work best. Max 2 MB.">
          {userId ? (
            <div className="flex items-start gap-4">
              {/* Constrain the upload area to a square thumbnail size */}
              <div className="w-28 shrink-0">
                <ImageUpload
                  bucket="avatars"
                  userId={userId}
                  existingUrl={form.avatar_url}
                  onUploadComplete={(url) => set("avatar_url", url)}
                  onRemove={() => set("avatar_url", null)}
                  label="Add photo"
                  aspectRatio="square"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1 pt-1">
                <p className="text-sm font-semibold text-gray-700 leading-tight">
                  {form.username || "Your Name"}
                </p>
                <p className="text-xs text-gray-400">
                  Tap the photo area to upload or change your avatar.
                </p>
                {form.avatar_url && (
                  <button
                    type="button"
                    onClick={() => set("avatar_url", null)}
                    className="mt-1 text-xs text-pink-400 font-medium text-left active:opacity-70 transition-opacity"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-28 aspect-square rounded-2xl bg-pink-50 border border-pink-100 animate-pulse" />
          )}
        </Field>

        {/* ── Username ── */}
        <Field label="Username" hint="Letters, numbers, and underscores only.">
          <input
            className={inputCls}
            placeholder="slime_lover_99"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>

        {/* ── Bio ── */}
        <Field label="Bio">
          <textarea
            className={`${inputCls} resize-none h-24`}
            placeholder="Tell the community about your slime obsession…"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={300}
          />
        </Field>

        {/* ── Location ── */}
        <Field label="Location">
          <input
            className={inputCls}
            placeholder="e.g. Austin, TX"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={100}
          />
        </Field>

        {/* ── Website ── */}
        <Field label="Website">
          <input
            className={inputCls}
            type="url"
            placeholder="https://yourshop.com"
            value={form.website_url}
            onChange={(e) => set("website_url", e.target.value)}
            maxLength={200}
            inputMode="url"
          />
        </Field>

        {/* ── Error / success feedback ── */}
        {saveError && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-500">
            ⚠️ {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-600 font-medium">
            ✅ Profile saved!
          </div>
        )}

        {/* ── Save button ── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl text-white text-sm font-bold transition disabled:opacity-60 active:scale-[0.98]"
          style={{
            background: saving
              ? "#d1d5db"
              : "linear-gradient(90deg, #ec4899, #a855f7)",
          }}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </main>
  );
}
