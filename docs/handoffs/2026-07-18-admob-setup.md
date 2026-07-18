# AdMob Setup — 2026-07-18

Full step-by-step for wiring AdMob-mediated native feed ads into
SlimeLog. Sequence: external account setup → app + ad unit
registration → app-ads.txt on the domain → Capacitor plugin →
FeedAdSlot component → UMP consent management → live testing.

**Launch config:**
- Ad density: 1 native ad per 7 feed logs
- Pro monthly: $2.99 (bump to $4.99 when video ships)
- Pro annual: $19.99 (bump to $29.99 when video ships)
- "Go ad-free" CTA under every ad linking to `/settings/subscription`
- Ad-free entitlement: Pro users see zero ads once RC is wired
- Video-launch tightening: 1 per 6 or 1 per 5, TBD by usage

**Live IDs (populated 2026-07-18):**
- Publisher ID: `pub-4196515541932235`
- iOS App ID: `ca-app-pub-4196515541932235~7063119839`
- iOS Feed Native Ad Unit ID: `ca-app-pub-4196515541932235/3355809110`
- `app-ads.txt` shipped at `apps/web/public/app-ads.txt` — live at https://slimelog.com/app-ads.txt after next Vercel deploy
- Android IDs: TBD (register when kicking off T183 Android track)

Prerequisites:
- Google account (personal or business — recommend business for tax reasons)
- Tax + payment info for AdMob payouts
- App Store Connect SlimeLog app record (already exists from SIWA setup)
- ChapHaus business banking info

Estimated total time to Phase 5 completion: 90 min external + ~4 hr code.

---

## Phase 1 — Create the AdMob account

**Time: 15-20 min.**

1. Go to https://admob.google.com — click **Get Started** or **Sign In**.
2. Sign in with the Google account you want to receive AdMob payouts on.
   - Recommendation: use a business Google account tied to ChapHaus so tax + payment records live with your business.
3. Fill in the AdMob account creation wizard:
   - **Country / territory**: United States
   - **Time zone**: Eastern (or wherever ChapHaus operates)
   - **Payments currency**: USD
   - **Account type**: Business (not Individual) — matches your ChapHaus setup
4. Read + accept the AdMob terms.
5. On the next screen you'll be asked to link Firebase — **click Skip for now**. We don't need Firebase for basic AdMob; can add later if we want analytics.
6. AdMob dashboard loads. Confirm the URL is https://apps.admob.com.

**Done when:** you land on the AdMob dashboard with a blank Apps list.

---

## Phase 2 — Payment + tax info

**Time: 20-30 min. Do this early so payouts aren't blocked when ads start earning. Sources verified from Google support Jul 2026.**

1. Left sidebar → **Payments** → **Settings** → click **Manage settings**.
2. **Payments profile** section → click **Manage payments profile**.
   - Google migrated all AdMob payment settings into the shared "Google payments profile" surface — same profile now covers AdMob + AdSense + Cloud + Play. If you already have a Google payments profile from any of those, AdMob attaches to it.
3. **Account type**: **Organization** (not "Business" — Google renamed the option). Once picked, this can NOT be changed later.
4. **Organization name**: `ChapHaus LLC` — must match your EIN / D-U-N-S filing letter-for-letter, including the `LLC` suffix.
5. **Legal address**: `310R Flanders Rd #447, East Lyme, CT 06333, USA` — must match D&B.
6. **Contact name**: your name + business email.
7. **Primary phone**: business phone number.
8. Save.
9. Click **Manage tax info** → **United States tax info** → **Add tax info**.
10. Fill the W-9:
    - **Tax form type**: W-9
    - **EIN** (from ChapHaus IRS letter)
    - **Legal company name**: `ChapHaus LLC`
    - **Federal tax classification**: LLC → then select the LLC's tax election (usually "Disregarded entity" if single-member, or "S corp" / "C corp" / "Partnership" if you elected differently)
    - Sign electronically with your name + date
    - Submit
11. Add payment method: **Payments** → **How you get paid** → **Add payment method** → **Wire transfer** or **Direct deposit (ACH)**.
    - **Direct deposit** is faster (2-5 days once threshold is hit) and no fees.
    - Enter ChapHaus business checking routing + account number.
    - Save.
12. AdMob triggers a **PIN verification** by physical postcard mailed to the address on the profile once you cross ~$10 in earnings. Watch for it in the mail; enter the PIN when it arrives to unlock the first payout.

**Done when:** Payments profile shows tax status **Submitted** and payment method **Active** (with a green check).

**Payout thresholds:**
- **$100** minimum earnings before AdMob issues a payout.
- **Address verification** (postcard PIN) triggered around ~$10 accumulated — do this as soon as it arrives.
- **Payment cycle**: monthly, ~30 days after month-end. August earnings → paid end of September.

**Tax note:** tax info must be submitted by the **20th of the month** for payments to issue that month. Do this before the 20th of any month you're earning meaningfully.

---

## Phase 3 — Register SlimeLog iOS app in AdMob

**Time: 10-15 min. UI verified from Google AdMob Help + Developer docs Jul 2026.**

1. Left sidebar → **Apps** → **ADD APP** button (top right of the Apps list, all caps in the current UI).
2. **Is your app listed on a supported app store?** → **No** (pre-launch). This is the current phrasing — Google reworded away from "Have you published your app" a while back.
3. **Platform**: **iOS**.
4. **App name**: `SlimeLog`. Recommendation from AdMob docs: use the same name that will be in the store listing, because AdMob uses this for the automated readiness review later.
5. **User metrics**: this is a real toggle in the current flow, not a skip. When ON, AdMob collects Firebase-flavored analytics — average session duration, ARPU, retention curves, LTV. It's free and doesn't add app-side work (SDK collects it via the Google Mobile Ads SDK). Turn it **ON** — the analytics are useful for making density/pricing decisions later, and there's no cost.
6. Click **ADD**.
7. AdMob generates an **App ID** in the format `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (note the `~`).
   - Copy it. Goes in `Info.plist` under `GADApplicationIdentifier` at Phase 6.
8. AdMob will show a **link to app store** prompt now that the app is unpublished — this stays greyed out. Once we publish to the App Store, come back to AdMob and link the app to its ASC listing (that's what activates full revenue reporting; unpublished apps show throttled reporting).
9. Note: SKAdNetwork requirement for iOS. Apple's attribution framework requires listing every ad network's SKAdNetwork identifier in `Info.plist`. Google publishes the current list at https://developers.google.com/admob/ios/quick-start. Claude will paste the current list at Phase 6 build time.

**Done when:** SlimeLog appears in the Apps list with an iOS badge and a copyable App ID.

**Android registration is now unblocked** since T181 is done (ChapHaus LLC Google Play Console verified). Register the Android app in AdMob at the same time as iOS if we're going parallel per T183 — same steps, just pick Android on step 3.

---

## Phase 4 — Create the native feed ad unit

**Time: 5 min per unit. UI verified from AdMob Help Jul 2026.**

1. From the SlimeLog iOS app page in AdMob, click **Ad units** in the left sub-nav → **ADD AD UNIT**.
2. **Ad format** grid → pick **Native advanced**.
   - Label correction (verified from live UI 2026-07-18): the format is still called **Native advanced** in the AdMob dashboard, not just "Native." Older docs claimed the label was simplified; it wasn't. Pick Native advanced.
3. **Media type**: leave default **Image | Video**. Video ads in a feed context work fine at our density (1/7) — Start-muted is the default and matches user expectations.
4. **Ad unit name**: `Feed native ad`
5. **Advanced settings** panel — the fields available on Native are:
   - **Media type**: leave default `Image | Video`. Video ads work fine in-feed at our density.
   - **eCPM floor**: three options — **Google optimized** (recommended for launch), Manual floor (set once we have data), Disabled. Under Google optimized, pick **All prices** to maximize fill rate at launch. Switch to **Medium floor** or **High floor** later once we see stable eCPM data — those beta options bias toward higher-paying ads at the cost of fill rate.
6. Click **CREATE AD UNIT**.
7. AdMob shows a modal with the **Ad Unit ID** in the format `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY` (note the `/`, not `~` like the App ID).
   - Copy it. FeedAdSlot references this ID.

**Frequency capping — the correction:** frequency capping IS available for Native ads, just NOT at the ad-unit level. It's on the **App settings** page under **Ad serving settings**. Set it there at 12 impressions per user per day as a defensive backstop — our in-app 1-per-7 density is the primary control, but this catches edge cases where Google might serve the same ad multiple times.
6. Click **CREATE AD UNIT**.
7. AdMob shows a modal with the **Ad Unit ID** in the format `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY` (note the `/`, not `~` like the App ID).
   - Copy it. FeedAdSlot references this ID.

**Deferred to later phases** (skip for now):
- **Rewarded ad unit** — for optional "watch video to unlock a Pro-lite perk" flow. Filed as T182 in the tracker.
- **Interstitial** — skip entirely for launch. Interstitials in a scrolling feed context feel intrusive and drive churn.

**Done when:** SlimeLog iOS app has one `Feed native ad` unit with a copied Ad Unit ID.

---

## Phase 5 — app-ads.txt on slimelog.com

**Time: 10-15 min. UI verified from AdMob Help docs Jul 2026. Google requires this for authorized-sellers verification — without it ads will still show, but revenue is capped and IAB Tech Lab flags your inventory as unverified.**

**Prerequisite (do this in App Store Connect + Play Console first):** the developer/marketing website field on your store listings must be `https://slimelog.com`. AdMob's crawler resolves the store listing → developer URL → then fetches `/app-ads.txt` from that domain. If the store listing points somewhere else, verification silently fails.

**In AdMob:**
1. Left sidebar → **Apps** → **View all apps** → click **SlimeLog** (iOS).
2. On the app overview, look for the yellow **"Requires review"** banner or scroll to **app-ads.txt** in the setup checklist.
3. Click **How to set up app-ads.txt**.
4. AdMob generates the exact line — something like:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
5. Copy that line and **paste it into chat here** so Claude can commit the file. Include the full line character-for-character (the hash at the end is the identity tag — copying wrong = verification fails).

**Then Claude will:**

6. Create `apps/web/public/app-ads.txt` with that single line as its content.
7. Commit + push to main. Vercel serves it at `https://slimelog.com/app-ads.txt` within ~30 sec.
8. Verify the URL returns the exact line as plaintext with `Content-Type: text/plain`.

**Then you go back to AdMob:**

9. From the All apps page, find SlimeLog → click **Verify app** in the Status details column. Optional — AdMob's crawler will also find it on its own within 24 hr.
10. Status moves from "Requires review" → "Authorized" within 24-48 hr.

**Done when:** the file is live at the URL, AND AdMob's dashboard shows **"Authorized"** status for SlimeLog.

**Once Android app is registered in AdMob:** the SAME `app-ads.txt` file at `https://slimelog.com/app-ads.txt` covers both platforms — no separate file needed, but the file will need a SECOND line for the Android app's pub-id (they share the same pub-id typically, so it's often one line, but confirm what AdMob generates for the Android app).

---

## Phase 6 — Install Capacitor AdMob plugin

**Time: 15 min setup + 30 min Info.plist. Plugin version verified against `@capacitor-community/admob` v8 (current stable Jul 2026, matches our Capacitor 8 shell).**

This is the code side. Claude handles it in a build session:

1. From `apps/web/`: `npm install @capacitor-community/admob@^8`.
2. Sync into the iOS project: `npx cap sync ios`. This auto-installs the CocoaPods (Google-Mobile-Ads-SDK + GoogleUserMessagingPlatform SDK — both required for iOS 14+ ATT compliance).
3. Add these keys to `apps/web/ios/App/App/Info.plist` inside the outermost `<dict>`:
   ```xml
   <key>GADIsAdManagerApp</key>
   <true/>
   <key>GADApplicationIdentifier</key>
   <string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
   <key>NSUserTrackingUsageDescription</key>
   <string>SlimeLog uses this identifier to keep the ads you see relevant. You can opt out anytime, and Pro subscribers see zero ads.</string>
   <key>SKAdNetworkItems</key>
   <array>
     <!-- Google + partners list — 80+ entries -->
     <!-- Full list at https://developers.google.com/admob/ios/quick-start -->
     <dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>
     <!-- ... and the rest of the current list from AdMob docs ... -->
   </array>
   ```
   The SKAdNetwork list changes as Google's ad-network partners rotate — Claude will paste the current full list at build time straight from Google's docs (~80 IDs).
4. Add `AdMob.initialize()` call inside a Capacitor-only client component that mounts once on app boot. Guard with `if (Capacitor.isNativePlatform())`.
5. Register test device IDs so we develop against test ads (not live ads) — pull them from Xcode console on first launch and hardcode in dev builds only.

**Done when:** shell app boots on the iOS simulator, `AdMob.initialize()` returns without error, and Xcode console shows `Google Mobile Ads SDK initialized`.

**Android note (once T183 kicks off):** the SAME plugin covers both platforms. Add the App ID under `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"...>` in `AndroidManifest.xml`, then `npx cap sync android`. No separate SKAdNetwork list on Android — that's iOS-specific.

---

## Phase 7 — FeedAdSlot component + feed integration

**Time: 3-4 hr.**

1. Build `apps/web/components/feed/FeedAdSlot.tsx` — a React component that:
   - On Capacitor-native platform: renders a native ad via the plugin (renders headline, media, icon, CTA into our own JSX so it visually matches a FeedCard).
   - On web: renders an AdSense unit (or a placeholder for pre-ad-approval).
   - When the user is Pro (entitlement check via RevenueCat `usePro()` hook): renders NULL.
   - Below the ad, renders a small magenta "Go ad-free →" CTA that links to `/settings/subscription`.
2. Modify `FeedListClient.tsx` to inject a `<FeedAdSlot>` every 7 rows.
3. Handle load failures gracefully — empty slot, no broken layout, no error toast.
4. Add analytics events: `ad_impression`, `ad_click`, `ad_upsell_click`. Route through the existing analytics adapter so RC and ad events stream to the same sink.
5. **Ad-attribution correctness gotcha:** the native ad plugin fires an impression event when the ad becomes visible in the viewport for at least 1 sec + >50% visible. This means the FeedAdSlot MUST be inside the same IntersectionObserver root as the feed list, or Google will over-report impressions and later underpay eCPM to correct.

**Deferred to next session after Phases 1-6 are done.** Blocked by RC entitlement wiring — the "hide ads for Pro" check needs `Purchases.getCustomerInfo().entitlements.active.pro` to be reliable, which requires #22 shipped.

---

## Phase 8 — UMP consent management + ATT

**Time: 1-2 hr. Verified against Google's UMP SDK docs Jul 2026.**

Required by GDPR (EU users) + Apple's App Tracking Transparency (ATT, iOS 14.5+). Apple has rejected apps for showing an incorrectly-styled ATT prompt, so this needs care.

**Setup (in AdMob first):**
1. AdMob → **Privacy & messaging** → **GDPR** → create a GDPR message. Style + copy tuned to SlimeLog's voice.
2. AdMob → **Privacy & messaging** → **IDFA** → create an IDFA message. This is the pre-ATT explainer Apple wants users to see BEFORE the OS-level ATT prompt.

**Critical sequencing** (per Google's UMP docs, learned the hard way by apps that got rejected):
- Show the **GDPR/UMP consent form FIRST** (if the user is in an EU/UK region).
- If the user grants consent for Purpose 1 (personalized ads), THEN show the **IDFA pre-message**.
- Only after they tap "Continue" on our IDFA message, call `ATTrackingManager.requestTrackingAuthorization()` to trigger Apple's OS-level prompt.
- If they deny consent for Purpose 1, do NOT show the ATT prompt at all — Google's UMP SDK skips it automatically.

**Code (all iOS-specific):**
1. `@capacitor-community/admob` v8 has UMP support built-in. No separate plugin.
2. On app boot, after `AdMob.initialize()`:
   ```ts
   const consentInfo = await AdMob.requestConsentInfo();
   if (consentInfo.isConsentFormAvailable && consentInfo.status === 'REQUIRED') {
     await AdMob.showConsentForm();
   }
   const attStatus = await AdMob.trackingAuthorizationStatus();
   if (attStatus.status === 'notDetermined') {
     await AdMob.requestTrackingAuthorization();
   }
   ```
3. Wrap in `if (Capacitor.getPlatform() === 'ios')` — Android UMP is same API but no ATT step.
4. Persist consent state in Capacitor Preferences (NOT localStorage — Capacitor Preferences is native-persisted and survives WebView storage clears).

**Testing:**
- ATT alert appears only ONCE per install. Uninstall + reinstall between test runs.
- Use a EU/UK-region simulator (change region in Settings → General → Language & Region) to force the GDPR form to appear.
- Add test-device-consent-override in dev builds to bypass the flow while working on other features.

**Deferred to when iOS TestFlight is running.** Blocked by #23 Capacitor + Phase 6 SDK init.

---

## Ad revenue projections (for reference)

At 1 ad per 7 logs, $2.99 Pro:

| DAU | Monthly | Annualized |
|-----|--------:|-----------:|
| 500 | $1,500 | $18,000 |
| 1,000 | $3,000 | $36,000 |
| 3,000 | $8,997 | $107,964 |
| 5,000 | $14,995 | $179,940 |
| 10,000 | $29,990 | $359,880 |

When video ships, tightening to 1 per 6 or 1 per 5 recovers bandwidth
costs and juices Pro conversion via more upsell moments.

---

## Order-of-operations reminder

**Phases 1-4 today (in AdMob dashboard, ~50-60 min for you).**

**Phase 5 today or tomorrow** — Claude commits the app-ads.txt file once you paste the AdMob-generated line.

**Phases 6-8 in follow-up sessions** — deferred until AdMob account is set up + we have the App ID and Ad Unit ID copied. Some of this depends on RC being wired first so the "hide ads for Pro users" gate actually works.
