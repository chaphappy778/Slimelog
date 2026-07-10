// apps/web/lib/brevo.ts
//
// =============================================================================
// Brevo API client wrapper
// =============================================================================
//
// This is the ONLY place in the SlimeLog codebase that talks to Brevo directly.
// All email-service integrations for the waitlist flow through this module.
//
// -----------------------------------------------------------------------------
// Required environment variables
// -----------------------------------------------------------------------------
//
//   BREVO_API_KEY             Server only. SENSITIVE. From Brevo dashboard:
//                             SMTP & API -> API keys. Never expose to client.
//                             Never prefix with NEXT_PUBLIC_.
//
//   BREVO_WAITLIST_LIST_ID    Numeric ID of the "SlimeLog Waitlist" list in
//                             Brevo. From Brevo dashboard: Contacts -> Lists.
//                             Not sensitive - just an ID. Server-side only by
//                             convention since nothing on the client needs it.
//
// -----------------------------------------------------------------------------
// Brevo dashboard configuration required (Jennifer does this outside of code)
// -----------------------------------------------------------------------------
//
//   1. Verify slimelog.com sending domain (DKIM + SPF DNS records).
//
//   2. Create list "SlimeLog Waitlist". Copy the numeric list ID into the
//      BREVO_WAITLIST_LIST_ID env var.
//
//   3. Create the following contact attributes:
//
//        FIRSTNAME         - TEXT    (Brevo default; usually already exists)
//        MARKETING_OPT_IN  - BOOLEAN
//        SIGNUP_SOURCE     - TEXT
//        SIGNUP_DATE       - DATE    <-- CRITICAL: must be DATE, NOT DATETIME.
//                                         The Brevo API expects DATE attributes
//                                         to be formatted as "YYYY-MM-DD". This
//                                         module converts the incoming ISO 8601
//                                         datetime to that format before send.
//                                         Brevo's dashboard may render the date
//                                         in your account locale (e.g.
//                                         DD/MM/YYYY) but stores it as
//                                         YYYY-MM-DD underneath.
//
//   4. Create the welcome email template using the copy at the bottom of this
//      comment block.
//
//   5. Configure automation:
//        Trigger: Contact is added to "SlimeLog Waitlist" list
//        Action:  Send welcome email template
//
//   6. Generate API key -> add to Vercel as BREVO_API_KEY
//      (Production + Preview, marked Sensitive).
//
// -----------------------------------------------------------------------------
// Welcome email copy (paste into Brevo template editor)
// -----------------------------------------------------------------------------
//
//   Subject: You're on the list - welcome to SlimeLog
//
//   Hi {{ contact.FIRSTNAME | default: "there" }},
//
//   You're officially on the SlimeLog waitlist. Thanks for being an early
//   supporter - it means a lot.
//
//   SlimeLog is a brand-new way to rate, log, and discover slime. Think
//   Untappd for slime collectors. We're in the final stretch before launch,
//   and waitlist members get first access plus an early-adopter perk when we
//   go live.
//
//   Here's what happens next:
//   - We'll email you the moment beta opens
//   - You'll get a head start logging your collection before the public launch
//   - If you follow @SlimeLogApp on Instagram, you'll see previews, giveaways,
//     and launch countdowns
//
//   Got questions? Just reply to this email - it goes straight to us.
//
//   Talk soon,
//   SlimeLog Team
//
// =============================================================================

// Type definitions for the Brevo POST /v3/contacts request and response

/**
 * Custom attributes sent to Brevo. Keys must match the attribute names
 * configured in the Brevo dashboard (see comment block above).
 */
interface BrevoContactAttributes {
  FIRSTNAME?: string;
  MARKETING_OPT_IN: boolean;
  SIGNUP_SOURCE: string;
  SIGNUP_DATE: string; // YYYY-MM-DD format (DATE attribute), e.g. "2026-04-30"
}

/**
 * Request body for POST https://api.brevo.com/v3/contacts
 * Reference: https://developers.brevo.com/reference/createcontact
 */
interface BrevoCreateContactRequest {
  email: string;
  attributes: BrevoContactAttributes;
  listIds: number[];
  updateEnabled: boolean;
}

/**
 * Success response shape for POST /v3/contacts.
 * Brevo returns `{ id: number }` on both create (201) and update-when-exists
 * paths. For pure updates with no changes Brevo may return 204 with no body.
 */
interface BrevoCreateContactSuccessResponse {
  id: number;
}

/**
 * Error response shape for POST /v3/contacts (4xx / 5xx).
 * Reference: https://developers.brevo.com/docs/how-it-works#error-codes
 */
interface BrevoErrorResponse {
  code: string;
  message: string;
}

// Public return type from addContactToWaitlist.
// Errors are returned, never thrown, so the API route calling this can
// continue to succeed the user's signup even when Brevo is down.
export type AddContactResult =
  | { success: true; contactId: number | null }
  | { success: false; error: string };

// [Change 1] Convert an ISO 8601 datetime string into a YYYY-MM-DD date string
// for the Brevo SIGNUP_DATE attribute (configured as DATE in the dashboard).
// Uses UTC slice to avoid local-timezone drift across server regions.
function isoDatetimeToBrevoDate(signupDateISO: string): string {
  return new Date(signupDateISO).toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// Marketing consent enforcement rule (2026-07-10)
// -----------------------------------------------------------------------------
//
// GDPR/CCPA compliance: any code path in SlimeLog that sends promotional
// email MUST filter recipients to profiles.marketing_consent = true before
// dispatching. Transactional emails (password reset, receipts, brand claim
// notices) are exempt and do NOT check this flag.
//
// When building a new marketing-email route:
//   1. Read the sender list from public.profiles WHERE marketing_consent = true
//      (or query the equivalent Brevo list; both are kept in sync via
//      syncContactMarketingConsent below).
//   2. Do NOT bypass the flag "for one-time sends" or "for very important
//      updates" — regulators do not distinguish.
//   3. Always let Brevo handle unsubscribe-link injection on marketing sends
//      (their compliance layer). Do not build custom marketing templates
//      that ship without that link.
//
// The syncContactMarketingConsent helper below keeps Brevo's list membership
// in lockstep with profiles.marketing_consent — call it whenever the flag
// flips (signup, settings toggle, admin action).
// -----------------------------------------------------------------------------

// Public function: add-or-update a contact on the SlimeLog waitlist
export async function addContactToWaitlist(params: {
  email: string;
  firstName?: string;
  marketingOptIn: boolean;
  source: string;
  signupDateISO: string;
}): Promise<AddContactResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const listIdRaw = process.env.BREVO_WAITLIST_LIST_ID;

  if (!apiKey) {
    return {
      success: false,
      error: "BREVO_API_KEY is not configured",
    };
  }
  if (!listIdRaw) {
    return {
      success: false,
      error: "BREVO_WAITLIST_LIST_ID is not configured",
    };
  }

  const listId = Number.parseInt(listIdRaw, 10);
  if (!Number.isFinite(listId)) {
    return {
      success: false,
      error: `BREVO_WAITLIST_LIST_ID is not a valid number: ${listIdRaw}`,
    };
  }

  // [Change 2] Convert incoming ISO datetime to YYYY-MM-DD before building
  // the attributes payload. Brevo's DATE attribute type rejects full ISO
  // datetime strings.
  const signupDate = isoDatetimeToBrevoDate(params.signupDateISO);

  // Build attributes. Omit FIRSTNAME if not provided so Brevo's template
  // default ({{ contact.FIRSTNAME | default: "there" }}) kicks in.
  const attributes: BrevoContactAttributes = {
    MARKETING_OPT_IN: params.marketingOptIn,
    SIGNUP_SOURCE: params.source,
    SIGNUP_DATE: signupDate,
  };
  if (params.firstName && params.firstName.trim().length > 0) {
    attributes.FIRSTNAME = params.firstName.trim();
  }

  const body: BrevoCreateContactRequest = {
    email: params.email,
    attributes,
    listIds: [listId],
    updateEnabled: true,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // 204 No Content is a valid success case (update with no changes).
    if (response.status === 204) {
      return { success: true, contactId: null };
    }

    // Try to parse the body. Brevo may return empty bodies in some edge
    // cases - handle that gracefully.
    const rawText = await response.text();
    let parsed: unknown = null;
    if (rawText.length > 0) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    if (response.ok) {
      const id =
        parsed &&
        typeof parsed === "object" &&
        "id" in parsed &&
        typeof (parsed as BrevoCreateContactSuccessResponse).id === "number"
          ? (parsed as BrevoCreateContactSuccessResponse).id
          : null;
      return { success: true, contactId: id };
    }

    // Non-OK response. Build a useful error string.
    const brevoMessage =
      parsed &&
      typeof parsed === "object" &&
      "message" in parsed &&
      typeof (parsed as BrevoErrorResponse).message === "string"
        ? (parsed as BrevoErrorResponse).message
        : rawText || "unknown Brevo error";

    return {
      success: false,
      error: `Brevo ${response.status}: ${brevoMessage}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Brevo fetch failed: ${message}`,
    };
  }
}

// -----------------------------------------------------------------------------
// syncContactMarketingConsent (2026-07-10)
// -----------------------------------------------------------------------------
//
// Keeps Brevo list membership in lockstep with profiles.marketing_consent.
// Called on:
//   - New signup with consent = true (adds to list)
//   - Settings toggle from false → true (adds to list)
//   - Settings toggle from true → false (removes from list)
//   - Admin/support action changing the flag
//
// Direction:
//   consent = true  → upsert contact via /v3/contacts (same list add path
//                     as addContactToWaitlist, so a converted waitlist
//                     user stays reachable). updateEnabled: true handles
//                     the "already exists" case cleanly.
//   consent = false → remove from the list via
//                     DELETE /v3/contacts/lists/{listId}/contacts/remove
//                     which pulls them from the list but leaves the
//                     contact record intact (Brevo will still show them
//                     in Contacts, just not on the sending list).
//
// Errors are returned, never thrown — the calling route stays successful
// so we don't fail a settings save because Brevo is temporarily unreachable.
// The retry story is manual (admin can re-toggle to re-sync). If we ever
// need more robust reconciliation, a periodic cron running a "reconcile
// consent" job over profiles + Brevo can catch drift.

export type SyncMarketingConsentResult =
  | { success: true }
  | { success: false; error: string };

export async function syncContactMarketingConsent(params: {
  email: string;
  marketingConsent: boolean;
  firstName?: string;
  source?: string;
}): Promise<SyncMarketingConsentResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const listIdRaw = process.env.BREVO_WAITLIST_LIST_ID;

  if (!apiKey) {
    return { success: false, error: "BREVO_API_KEY is not configured" };
  }
  if (!listIdRaw) {
    return {
      success: false,
      error: "BREVO_WAITLIST_LIST_ID is not configured",
    };
  }
  const listId = Number.parseInt(listIdRaw, 10);
  if (!Number.isFinite(listId)) {
    return {
      success: false,
      error: `BREVO_WAITLIST_LIST_ID is not a valid number: ${listIdRaw}`,
    };
  }

  // Consent = true → upsert contact on the list. Reuse the same POST
  // /v3/contacts endpoint as the waitlist path so returning users get
  // updated instead of duplicated.
  if (params.marketingConsent) {
    const attributes: BrevoContactAttributes = {
      MARKETING_OPT_IN: true,
      SIGNUP_SOURCE: params.source ?? "signup",
      SIGNUP_DATE: isoDatetimeToBrevoDate(new Date().toISOString()),
    };
    if (params.firstName && params.firstName.trim().length > 0) {
      attributes.FIRSTNAME = params.firstName.trim();
    }
    const body: BrevoCreateContactRequest = {
      email: params.email,
      attributes,
      listIds: [listId],
      updateEnabled: true,
    };
    try {
      const response = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (response.ok || response.status === 204) return { success: true };
      const text = await response.text();
      return {
        success: false,
        error: `Brevo ${response.status}: ${text || "unknown error"}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Brevo fetch failed: ${message}` };
    }
  }

  // Consent = false → remove from the list.
  //
  // Brevo endpoint: POST /v3/contacts/lists/{listId}/contacts/remove
  // (yes, POST not DELETE — that's their API). Body accepts either
  // { emails: [...] } or { ids: [...] } or { all: true }. We use emails.
  try {
    const response = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${listId}/contacts/remove`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({ emails: [params.email] }),
      },
    );
    if (response.ok || response.status === 204) return { success: true };
    // Brevo returns 400 when the email isn't on the list — treat that as
    // success from our perspective since the desired end-state is "not on
    // the list."
    if (response.status === 400) return { success: true };
    const text = await response.text();
    return {
      success: false,
      error: `Brevo ${response.status}: ${text || "unknown error"}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Brevo fetch failed: ${message}` };
  }
}
