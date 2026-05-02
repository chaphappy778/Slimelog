// apps/web/lib/brand-claims.ts
// Shared utilities for the brand claiming flow.
// Pure module — no React, no client/server distinction.
// Used by API routes (server) and (where safe) by client code.

import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Verification code generation & hashing ──────────────────────────────────

/**
 * Cryptographically secure 6-digit numeric code, zero-padded.
 * Uses Node's crypto.randomInt — never Math.random().
 */
export function generateVerificationCode(): string {
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

/**
 * SHA-256 hash, hex-encoded. Available in both Node and Edge runtimes via
 * the Web Crypto API. We store hashes in the DB and never the plaintext code.
 */
export async function hashVerificationCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison. Prevents timing attacks during code
 * verification. Both inputs must already be hashed (same length) for the
 * comparison to be meaningful.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Email validation ────────────────────────────────────────────────────────

const FREEMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "mail.com",
  "gmx.com",
  "gmx.us",
  "fastmail.com",
  "tutanota.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
];

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Validate business email format and reject obvious freemail providers.
 * Brand owners need a domain-matched email — that's the whole point.
 */
export function validateBusinessEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required." };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long." };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Enter a valid email address." };
  }

  const domain = trimmed.split("@")[1];
  if (!domain) {
    return { valid: false, error: "Enter a valid email address." };
  }

  if (FREEMAIL_DOMAINS.includes(domain)) {
    return {
      valid: false,
      error:
        "Use a business email at the brand's domain. Free providers like Gmail or Yahoo can't verify ownership.",
    };
  }

  return { valid: true };
}

// ─── Domain matching ─────────────────────────────────────────────────────────

/**
 * Strip protocol, www, paths and query from a URL down to the bare host.
 * Returns null if the input can't be parsed.
 */
function extractHost(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Compare the registrable portion of two hostnames. We accept either an
 * exact match OR a suffix match (handles subdomains like mail.brand.com vs
 * brand.com). Naive but adequate for v1 — no public-suffix list lookup.
 */
function hostsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.endsWith(`.${b}`)) return true;
  if (b.endsWith(`.${a}`)) return true;
  return false;
}

/**
 * Validate that the business email's domain matches the brand's website
 * domain. If the brand has no website on file, returns true (skip check).
 */
export function emailMatchesBrandDomain(
  email: string,
  brandWebsite: string | null,
): boolean {
  if (!brandWebsite || !brandWebsite.trim()) return true;

  const brandHost = extractHost(brandWebsite);
  if (!brandHost) return true; // un-parseable website — don't block

  const emailDomain = email.trim().toLowerCase().split("@")[1];
  if (!emailDomain) return false;

  return hostsMatch(emailDomain, brandHost);
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

/**
 * Count claim submissions or verification code requests for a given user
 * within a time window. Server-only — uses admin client to bypass RLS.
 */
export async function countRecentClaimAttempts(
  userId: string,
  brandId: string,
  windowMinutes: number,
): Promise<number> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("brand_claims")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .gte("created_at", since);

  if (error) {
    // Fail closed for rate limiting — if we can't count, treat as over limit.
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}
