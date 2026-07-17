# RevenueCat + Apple App Store Connect Setup — 2026-07-17

Full step-by-step walk-through to wire iOS in-app purchases through
RevenueCat before we can ship the Capacitor SDK integration. Reference
this doc alongside the running chat.

Prerequisites:
- Apple Developer account active (team `K2QB62Z3PC`, ChapHaus)
- App ID exists: `com.chaphaus.slimelog`
- Services ID for SIWA: `com.chaphaus.slimelog.web` (from 2026-07-16)
- RevenueCat account exists, 2 products already set up (pull from
  chat notes: Stripe monthly + annual, entitlements defined)
- Stripe web subs live for reference on product IDs and pricing

Estimated total time: 2.5 hours.

---

## Phase 1 — Enable In-App Purchase capability on the App ID

**Time: 30 seconds.**

1. Open https://developer.apple.com/account.
2. Sign in if prompted. Two-factor code will come to your Apple device.
3. Click **Certificates, Identifiers & Profiles** in the left sidebar.
4. Click **Identifiers** in the sidebar.
5. In the top-right filter dropdown (says "All Types" by default),
   pick **App IDs**.
6. Click the row for `SlimeLog` — the Bundle ID should be
   `com.chaphaus.slimelog`. This is your primary App ID, NOT the
   `.web` Services ID.
7. Scroll down to the **Capabilities** list.
8. Find **In-App Purchase** in the list (alphabetical).
9. Check the checkbox.
10. Scroll to the top and click **Save**.
11. Confirm the dialog if it asks.

**Done when:** the App ID page reloads with In-App Purchase showing as
enabled.

---

## Phase 2 — Create the SlimeLog Pro subscription group in App Store Connect

**Time: 5 minutes.**

Auto-renewable subscriptions in App Store Connect are grouped so users
can only be subscribed to one product per group at a time (Apple's
policy — this is how monthly vs annual upgrades/downgrades work).

1. Open https://appstoreconnect.apple.com.
2. Sign in.
3. Click **Apps**.
4. Click on **SlimeLog** in your apps list. If SlimeLog doesn't
   appear, you'll need to create the app record first — see the
   sidebar "Create the App Store Connect app record" section at the
   bottom of this doc.
5. In the left sidebar of the SlimeLog app page, look under
   **In-App Purchases**. Click **Manage** or **Subscriptions**
   (Apple has renamed this a few times).
6. On the Subscriptions page, click **Subscription Groups** (or in
   some UIs, subscription groups appear as a top-level section).
7. Click the **`+`** button next to Subscription Groups.
8. Enter a **Reference Name**: `SlimeLog Pro`. This is internal only,
   never shown to users.
9. Click **Create**.

**Done when:** you see a new empty "SlimeLog Pro" subscription group
with 0 subscriptions in it.

---

## Phase 3 — Create the two IAP products (Pro Monthly + Pro Annual)

**Time: 30-60 minutes** (mostly for copy + pricing tables). This is the
biggest step. **Do Pro Monthly first, then Pro Annual — same steps
repeated.**

### 3A — Create Pro Monthly

1. Inside the **SlimeLog Pro** subscription group you just created,
   click **Create Subscription** (or the `+` button).
2. **Reference Name** — internal only. Enter: `Pro Monthly`.
3. **Product ID** — this is the string the app code + RevenueCat +
   Stripe all need to agree on. Convention: use lowercase snake_case
   with the platform baked in.
   - Enter: `com.chaphaus.slimelog.pro.monthly`
   - (Match the Stripe SKU naming if you can. Confirm with James
     what your Stripe Pro Monthly Price ID looks like — if it's
     something like `pro_monthly`, we can pick `pro_monthly` here
     for symmetry.)
4. Click **Create**.
5. You're now on the product detail page. Fill in each section:

   **Subscription Duration**: pick **1 Month**.

   **Subscription Prices**: click **`+`** to add a price.
   - Choose your primary market first: **United States (USD)**.
   - Pick the price tier that matches your Stripe monthly price.
     Apple's tiers are strict — e.g. Tier 5 = $4.99, Tier 10 =
     $9.99, etc.
   - Apple will auto-populate every other country's price based on
     the tier. Review the auto-populated countries — you can edit
     per-country if you want, but the auto values are usually fine
     for launch.
   - Click **Next** → **Confirm**.

   **App Store Localization**: click **`+`** to add a localization.
   - Pick **English (U.S.)** as your primary. (Add more later if
     you want to launch in other languages.)
   - **Subscription Display Name**: `SlimeLog Pro` (shown on the
     purchase sheet).
   - **Description**: 30-word max, sells the value. Example:
     > Unlock unlimited slime logs, advanced ratings, priority
     > brand notifications, and the SlimeLog Guide download. Cancel
     > anytime.
     Refine this with Jenn — don't ship the placeholder above.
   - Save.

   **Review Information**: Apple requires info for the reviewer.
   - **Review Screenshot**: upload a screenshot showing the paywall
     screen inside your app. If we don't have one yet, take a
     screenshot of the current /pricing (or wherever your Pro
     upgrade UI is) on iPhone Safari (2732×2048 min). Placeholder
     is OK — you can upload a better one before Submit for Review.
   - **Review Notes**: what the reviewer needs to know to test.
     Example:
     > SlimeLog Pro is an auto-renewable subscription that unlocks
     > unlimited slime logs and the SlimeLog Guide download. To
     > test: sign in, tap Upgrade to Pro on the profile screen.
   - Save.

6. Click **Save** at the top-right of the product detail page.
7. The product will show status **Missing Metadata** at first, then
   **Ready to Submit** once all required fields are complete.

### 3B — Create Pro Annual

Repeat all of 3A with these differences:
- Reference Name: `Pro Annual`
- Product ID: `com.chaphaus.slimelog.pro.annual`
- Subscription Duration: **1 Year**
- Price: match your Stripe annual price (typically Tier 40 = $39.99,
  Tier 50 = $49.99, etc.)
- Description: emphasize the savings vs monthly.
  Example:
  > Unlock unlimited slime logs, advanced ratings, priority brand
  > notifications, and the SlimeLog Guide download. Save
  > **~17%** vs monthly. Cancel anytime.
- Review Notes: same content, mention it's the annual tier.

**Done when:** both products show **Ready to Submit** status in the
subscription group.

---

## Phase 4 — Set up App Store Connect API key

**Time: 5-10 minutes.** RevenueCat uses this key to validate
purchases + fetch product metadata from Apple's servers.

1. Still in https://appstoreconnect.apple.com.
2. Click **Users and Access** in the top nav.
3. Click the **Integrations** tab (or **Keys** in older UI).
4. Click **App Store Connect API** in the sidebar.
5. Click **`+`** to generate a new key.
6. **Name**: `RevenueCat` (internal only).
7. **Access**: set to **App Manager** (RevenueCat needs product read
   + receipt validation; App Manager is Apple's recommended role for
   this integration).
8. Click **Generate**.
9. On the next screen, you'll see the key details:
   - **Key ID** — 10-char string like `A1B2C3D4E5`. Copy this
     somewhere temporary — you'll need it for Phase 5.
   - **Issuer ID** — a longer UUID at the top of the page. Copy this
     too.
   - **Download button** — click to download the **.p8 file**. Save
     it somewhere safe (e.g. `~/Documents/SlimeLog/AppStoreConnect
     _AuthKey_A1B2C3D4E5.p8`).
10. **CRITICAL:** you can only download the .p8 file ONCE. If you
    close this page before downloading, you have to revoke the key
    and generate a new one. Download it now.

**Done when:** you have the .p8 file saved, plus the Key ID and Issuer
ID copied.

---

## Phase 5 — Add iOS as a Store in RevenueCat

**Time: 5-10 minutes.**

1. Open https://app.revenuecat.com.
2. Pick the **SlimeLog** project.
3. Click **Project Settings** (gear icon, top-left).
4. Click **Apps** in the settings sidebar.
5. Click **`+ New App`** (or similar plus button).
6. Pick **App Store** as the store.
7. Enter the app details:
   - **App name**: `SlimeLog iOS`
   - **Bundle ID**: `com.chaphaus.slimelog` (must match Phase 1
     exactly)
8. Fill in the App Store Connect integration section:
   - **Key ID** (from Phase 4 step 9)
   - **Issuer ID** (from Phase 4 step 9)
   - **Upload the .p8 file** you downloaded in Phase 4 step 9
9. Optionally: paste the **Shared Secret** if the "In-App Purchase
   Shared Secret" field also appears. Get it from App Store Connect
   → Apps → SlimeLog → App Information → App-Specific Shared Secret.
   (This is legacy; the API key alone is enough on modern setups.)
10. Click **Save**.
11. RevenueCat will now auto-generate the **iOS SDK API Key** (starts
    with `appl_`). Copy it — this is what we'll use in the Capacitor
    code later.

**Done when:** RevenueCat's app list shows SlimeLog iOS with a green
"Connected" indicator, and you have the `appl_...` SDK API key
copied.

---

## Phase 6 — Map the new iOS products to your existing RC entitlement

**Time: 5-10 minutes.** The two products you created in Phase 3 need
to be linked to your existing RevenueCat entitlement so an iOS
purchase grants the same access as a Stripe web purchase.

1. In RevenueCat dashboard, click **Products** in the sidebar.
2. Click **`+ New`** and pick **App Store**.
3. First product — Pro Monthly:
   - **Identifier**: `com.chaphaus.slimelog.pro.monthly` (must match
     Phase 3A exactly)
   - **Display Name**: `SlimeLog Pro Monthly`
   - Save.
4. Second product — Pro Annual:
   - **Identifier**: `com.chaphaus.slimelog.pro.annual`
   - **Display Name**: `SlimeLog Pro Annual`
   - Save.
5. Now link them to your existing **Pro** entitlement:
   - Click **Entitlements** in the sidebar.
   - Click your existing **pro** entitlement (assumes it's named
     "pro" — adjust if you called it something else).
   - Click **Attach Products**.
   - Check both new products (Pro Monthly + Pro Annual).
   - Save.

**Done when:** the entitlement page shows both iOS products AND your
existing Stripe products attached under the same "pro" entitlement.

---

## Phase 7 — Attach the products to your default offering

**Time: 5 minutes.** Offerings are what the RevenueCat SDK returns to
the app when it asks "what can I sell right now?". A default offering
is what the app shows by default on the paywall.

1. In RevenueCat dashboard, click **Offerings** in the sidebar.
2. You should have an existing "default" offering (or whatever it's
   named). Click into it.
3. Click **Attach Packages** or **Add Package**.
4. Set up two packages:
   - **`$rc_monthly`** (RevenueCat's magic identifier for monthly)
     → attach `com.chaphaus.slimelog.pro.monthly`
   - **`$rc_annual`** → attach `com.chaphaus.slimelog.pro.annual`
5. Confirm the offering is marked as the **Current Offering** (there's
   a badge or dropdown at the top).
6. Save.

**Done when:** the offering shows both packages listed with their
attached products.

---

## Sanity check before we touch code

Before we go install the Capacitor SDK, verify the flow via
RevenueCat's built-in sandbox test tool:

1. In RevenueCat, click **Charts** → **Overview**.
2. You shouldn't see any purchase data yet (that's expected).
3. Click **Sandbox Testers** (if the option exists) — some plans
   don't show this.
4. This is enough for now. Real sandbox purchases require a physical
   iPhone signed into a sandbox test Apple ID, which we'll set up when
   we start Phase 8.

Also confirm in App Store Connect:
- Both subscriptions are **Ready to Submit** status
- Subscription Group has a **Localizations** section filled in (at
  least English) — needed for the group to be App Store approved

---

## Phase 8 — Wire the RevenueCat Capacitor SDK (next session, on Mac)

Once Phases 1-7 are done, come back to this doc on your Mac. Then:

1. `npm install @revenuecat/purchases-capacitor` in `apps/web/`.
2. `npx cap sync ios` to pull the native plugin into the Xcode project.
3. Add the `appl_...` SDK API key from Phase 5 to an env var.
4. Initialize `Purchases` in `apps/web/app/layout.tsx` or a client
   provider component (only inside Capacitor context via
   `Capacitor.isNativePlatform()`).
5. Bridge the paywall's "Upgrade to Pro" button to call
   `Purchases.purchasePackage(...)` when in native context, fall
   back to Stripe checkout on web.
6. Handle purchase result → refresh entitlement → surface Pro
   features.

Estimated Phase 8: 3-4 hours code time.

---

## Sidebar: Create the App Store Connect app record (if it doesn't exist)

If SlimeLog doesn't appear in your App Store Connect Apps list yet:

1. https://appstoreconnect.apple.com → **Apps** → **`+`** →
   **New App**.
2. Fill in:
   - **Platform**: iOS
   - **Name**: `SlimeLog`
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: pick `com.chaphaus.slimelog` from the dropdown
   - **SKU**: `slimelog-ios` (internal, never shown)
   - **User Access**: Full Access
3. Click **Create**.

Now you can go back to Phase 2.

---

## Reference: what's in the RevenueCat dashboard already

From notes on 2026-07-16:
- 2 products already set up (assumed Stripe web monthly + annual)
- Entitlement configured
- Default offering created, missing final product attachment

We're adding iOS products alongside the existing Stripe ones. Same
entitlement, same offering — RevenueCat handles the platform-specific
routing.
