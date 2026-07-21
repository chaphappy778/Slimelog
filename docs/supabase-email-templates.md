# Supabase Auth Email Templates

These templates live in the **Supabase Dashboard**, not in git. They cannot
be deployed with `npx supabase db push` or a Vercel push. When one changes,
update it here first (so the repo is the source of truth), then paste it into
the Dashboard by hand.

**Where to paste:** Supabase Dashboard -> Authentication -> Email Templates ->
pick the matching template -> replace the message body -> Save.

House rules apply to every template below (they reach users): no em-dashes,
direct "you" voice, no raw infrastructure URLs, no fabricated claims.

Template variables Supabase provides:

- `{{ .ConfirmationURL }}` — the full, Supabase-hosted verify link. Always
  resolves to `https://<project-ref>.supabase.co/auth/v1/verify?...`. Supabase
  has to own this link so it can verify the token, so we link the **button**
  to it but never print it as visible text.
- `{{ .TokenHash }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}` — see
  the Supabase docs. Some templates below build their own link from these.

---

## Reset Password

**Status:** UPDATED 2026-07-21 (post-T140 first-touch audit, bug 1). Needs to
be pasted into the Dashboard.

**Why it changed:** the old template ended with a "Button not working? Paste
this into your browser" block that rendered `{{ .ConfirmationURL }}` as visible
text. That exposed the raw Supabase verify URL (leaking the project ref) and
read as unpolished next to the SlimeLog branding. We removed the raw URL and
replaced it with a support path instead (Path B). The button still links to
`{{ .ConfirmationURL }}` because Supabase must verify the token.

**Subject:** `Reset your SlimeLog password`

**Message body (HTML) — paste this verbatim:**

```html
<div style="margin:0;padding:0;background:#0A0A0A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto;background:#100020;border:1px solid rgba(45,10,78,0.7);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px 32px;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
              <div style="font-size:20px;font-weight:900;letter-spacing:-0.01em;background:linear-gradient(135deg,#39FF14,#00F0FF);-webkit-background-clip:text;background-clip:text;color:#39FF14;">
                SlimeLog
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;font-family:Arial,Helvetica,sans-serif;color:#F5F5F5;">
              <h1 style="margin:0 0 12px 0;font-family:'Montserrat',Arial,sans-serif;font-size:24px;font-weight:900;color:#FFFFFF;">
                Reset your password
              </h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:rgba(245,245,245,0.75);">
                Tap the button below to choose a new password. This link works
                for one hour, then it expires for your security.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:14px;background:linear-gradient(135deg,#39FF14,#00F0FF);">
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;padding:14px 40px;font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:800;color:#0A0A0A;text-decoration:none;border-radius:14px;">
                      Set a new password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 4px 0;font-size:13px;line-height:1.6;color:rgba(245,245,245,0.55);">
                Having trouble with the button? Email us at
                <a href="mailto:support@slimelog.com" style="color:#00F0FF;text-decoration:none;font-weight:700;">support@slimelog.com</a>
                and we will help you get back in.
              </p>
              <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:rgba(245,245,245,0.4);">
                Didn't ask to reset your password? You can ignore this email and
                nothing will change.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

---

## Other templates (log here when they change)

These are documented as placeholders so future edits get captured in the repo
instead of living only in the Dashboard. Fill in the real body the next time
one is touched.

### Confirm Signup

**Status:** NOT yet mirrored here. Current Dashboard link should point at the
`token_hash` confirm route (cross-device safe, no PKCE cookie needed):

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/welcome
```

See `apps/web/app/auth/confirm/route.ts` for the handler.

### Magic Link

**Status:** NOT yet mirrored here. Document on next edit.

### Change Email Address

**Status:** NOT yet mirrored here. Document on next edit.

### Invite User

**Status:** NOT yet mirrored here. Document on next edit.
