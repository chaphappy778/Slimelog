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
//        SIGNUP_DATE       - DATETIME  <-- CRITICAL: must be DATETIME, NOT DATE.
//                                         If this attribute is set to DATE,
//                                         Brevo's API will reject the ISO 8601
//                                         timestamp we send and the whole
//                                         contact create/update call will fail.
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
//   Jennifer
//   Founder, SlimeLog
//
// =============================================================================

// [Change 1] Type definitions for the Brevo POST /v3/contacts request and response

/**
 * Custom attributes sent to Brevo. Keys must match the attribute names
 * configured in the Brevo dashboard (see comment block above).
 */
interface BrevoContactAttributes {
  FIRSTNAME?: string;
  MARKETING_OPT_IN: boolean;
  SIGNUP_SOURCE: string;
  SIGNUP_DATE: string; // ISO 8601 datetime, e.g. "2026-04-24T15:30:00.000Z"
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

// [Change 2] Public return type from addContactToWaitlist.
// Errors are returned, never thrown, so the API route calling this can
// continue to succeed the user's signup even when Brevo is down.
export type AddContactResult =
  | { success: true; contactId: number | null }
  | { success: false; error: string };

// [Change 3] Public function: add-or-update a contact on the SlimeLog waitlist
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

  // Build attributes. Omit FIRSTNAME if not provided so Brevo's template
  // default ({{ contact.FIRSTNAME | default: "there" }}) kicks in.
  const attributes: BrevoContactAttributes = {
    MARKETING_OPT_IN: params.marketingOptIn,
    SIGNUP_SOURCE: params.source,
    SIGNUP_DATE: params.signupDateISO,
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
