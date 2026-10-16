# Get started — per-batch build notes + deviations

Source of truth: Figma `mnOq3QRhTdiliuSuzQoNsX`, page 209:1927 (Get started v3).
Stage 1 inventory + decisions: `getstarted-stage1-inventory.md` (§6b). GDS standards: `gds-standards.md`.
README warns: "All copy is draft and unreviewed by content design."

## Batch 1 — Shared furniture + start / cookies

**Built**
- Reconciled the shared Beta layout (`app/views/layouts/setup.html`), now the base for all four
  Beta sections (Setup, Decide, Claim, Get started):
  - Service-wide **cookie banner** (`app/views/components/cookie-banner.njk`), rendered at the top
    of `beforeContent`, above the phase banner. First visit → question banner; after a choice →
    confirmation banner (once), then nothing. Driven by `req.session.data.cookies`.
  - Phase banner stays **Beta** and now carries a **"feedback"** link → `/feedback` (G11, built in
    Batch 2) in the banner message, per the README.
  - Footer targets wired: "Get help with the CAF" → `/support` (G05, Batch 2), "Cookies" →
    `/cookies` (built), "Accessibility statement" and "Privacy notice" → the holding page
    `/setup/not-in-this-prototype` (deferred — decision §6b.2).
- `app/views/layouts/get-started.html` — signed-out section layout (extends `setup.html`); sets the
  page `<title>` to match the H1.
- `app/routes/get-started.js` — signed-out chrome (service name only, no Sign in/out), the routes,
  and the cookie mechanism. Registered in `routes.js` before `beta`.
- **G01 / G02** service start page (`pages/getstarted/service-start.html`) — one page; the cookie
  banner (shared layout) shows itself on first visit, which is the only difference between G01 and G02.
- **G03** cookie settings (`pages/getstarted/cookie-settings.html`).
- Shared **external placeholder** (`pages/getstarted/external.html`, `/external`) — one holding page
  for every link that leaves the prototype (decision §6b.3). Built now because G01 needs a target.

**Routes / session keys**
- `/get-started` (G01/G02), `/cookies` GET+POST (G03), `/cookies/choose` POST (banner Accept/Reject),
  `/cookies/hide` GET (dismiss confirmation), `/external` GET.
- Session: `cookies.analyticsConsent` ("accepted" | "rejected"), `cookies.choiceMade` (bool),
  `cookies.confirmationVisible` (bool). Transient form fields `cookiesConsent`, `cookiesReturnUrl`,
  `cookiesAnalytics` are read then deleted.

**Deviations (intentional, flagged)**
1. **Start button has the GDS arrow** (`isStartButton: true`). The Figma drew a plain green
   "Start now"; the GOV.UK start-page pattern uses the start button (with arrow). Used the component
   as intended, consistent with the service-wide GDS alignment.
2. **"Start now" → the One Login stand-in** (`/prototype-sign-in`), not G03. The Figma prototype
   arrow to the cookies page is a demo artifact (decision §6b.1).
3. **Save on G03 stays on `/cookies`** and shows the "Your cookie settings were saved" success
   banner, matching the rendered screen (g03.png). The inventory's "→ G01" note is superseded by the
   SCREEN (authoritative).
4. **G03 analytics question uses the content-rich pattern**: H2 "Analytics cookies (optional)" +
   descriptive body + radios with a **visually-hidden legend** (repeating the H2). Matches the Figma
   (H2 + body + radios, no visible legend) and is GDS-correct.
5. **Cookie confirmation wording** uses the GOV.UK standard ("You've accepted/rejected analytics
   cookies. You can change your cookie settings at any time." + "Hide cookie message") — decision §6b.5.
6. **Page `<title>`** set to match each H1 (the kit never set it). The start page collapses the title
   to "Service name - GOV.UK" (no duplicate), per GDS start-page convention.
7. **Placeholders built as shown and flagged, not filled**: G01 "roughly 26 weeks", G03 "Google
   Analytics". No analytics actually run.
8. **Feedback link target `/feedback`** is wired now but the page (G11) is built in Batch 2 — the
   link 404s until then.

**Accessibility (pa11y, axe + HTML_CodeSniffer)**
- `/get-started`, `/cookies`, `/external`: **1 error each, all the GOV.UK footer crown SVG**
  (`govuk-footer__crown`, `F92,ARIA4`) — the framework-level finding present prototype-wide (same as
  the 18 on Claim). **Zero authored-content errors.**

**Not built in Batch 1 (later batches)**
- G05 support, G11 give feedback, G13 feedback sent (Batch 2).
- G06 accessibility statement, G12 privacy notice — LEFT OUT (decision §6b.2).
- G07/G08/G09 errors, G10 you-have-signed-out + real sign-out route, G04 email preview (Batch 3).

## Batch 2 — Service-wide content + feedback

**Built** (all verbatim from the SCREEN frames; signed-out Get started chrome)
- **G05** support, "Get help with the CAF" (`pages/getstarted/support.html`, `/support`) — Back link +
  four sections: Guidance / Contact the CAF team / Webinars / Your WARP.
- **G11** give feedback (`pages/getstarted/feedback.html`, `/feedback`) — intro + "Your feedback"
  textarea (+ hint) + optional email + "Send feedback". Fields auto-save to `data.feedback` via
  `name="feedback[message]"` / `name="feedback[email]"`. Nothing is sent or stored.
- **G13** feedback sent (`pages/getstarted/feedback-sent.html`, `/feedback/sent`) — `govukPanel`
  ("Thank you for your feedback" / "We read every response."), paragraph, secondary
  "Back to the service" button.
- Added `/support` and `/feedback` to the Get started signed-out chrome paths. The phase-banner
  "feedback" link (wired in Batch 1) and the footer "Get help with the CAF" link now resolve.

**Back-link / return behaviour**
- G05 Back and G13 "Back to the service" return to **where the user came from** via a `localReferer`
  helper (reads the Referer, compares `hostname` only because the kit proxies — the request host port
  differs from the browser-facing port; falls back to `/get-started`). G13's target is captured on
  `GET /feedback` and stored at `feedback.returnUrl`.

**Deviations (intentional, flagged)**
1. **Prototype "not sent" note on G11** — added at build time, then **REMOVED** on your instruction
   so the page reads as live service content (`feedback_no_prototype_language` preference). Feedback
   is still never sent or stored behind the scenes.
2. **G05 external references are plain text** (security.gov.uk, Local Digital website), matching the
   SCREEN (they are not links there). The shared external placeholder is therefore not used on G05.
3. **G05 contact email** — originally drawn as "cafsupport@communities.gov.uk"; **swapped to the
   fictional `cafsupport@example.gov.uk`** on your instruction (plain text, no mailto).
4. **Placeholder kept as drawn and flagged**: G05 "We aim to reply within 5 working days".

**Accessibility (pa11y, axe + HTML_CodeSniffer)**
- `/support`, `/feedback`, `/feedback/sent`: **1 error each — the footer crown SVG only**
  (framework-wide). **Zero authored-content errors.**

**Still to come (Batch 3)**
- G07 page not found (wire kit 404), G08 service unavailable, G09 signed out (inactivity),
  G10 you-have-signed-out + a real sign-out route that clears the session, G04 email preview.

## Batch 3 — Errors, sign-out and the invitation email

**Built** (verbatim from the SCREEN frames)
- **G07** page not found (`pages/getstarted/page-not-found.html`) — wired via a **catch-all 404**
  at the end of `routes.js` (registered last; skips `/public`, `/plugin-assets`, `/manage-prototype`,
  `/govuk`, `/assets`, etc. so kit internals and assets still work). Renders with signed-out service
  chrome and HTTP 404.
- **G08** service unavailable (`pages/getstarted/service-unavailable.html`, `/service-unavailable`) —
  HTTP 503. No action.
- **G09** signed out after inactivity (`pages/getstarted/session-expired.html`,
  `/get-started/session-expired`) — "Sign in again" → `/get-started` (start page).
- **G10** you have signed out (`pages/getstarted/signed-out.html`, `/get-started/signed-out`) —
  "Sign in again" → `/prototype-sign-in` (One Login stand-in).
- **Real sign-out route** `/get-started/sign-out` — clears the Beta service state (`setup`,
  `decide`, `claim`; each section re-seeds on next entry), leaves cookie prefs and the Alpha journey
  untouched, then shows G10. The **"Sign out"** link in Setup, Decide and Claim now points here
  (was: Setup/Decide → holding page, Claim → `/prototype-scenarios`).
- **G04** invitation email (`pages/getstarted/invitation-email.html`, `/prototype/emails/invitation`)
  — prototype-only PREVIEW of the MHCLG email, as an email card (not a service page). CTA
  "Register Westborough Borough Council" → `/prototype-scenarios/first-to-join` (decision §6b.6),
  which lands on Claim 01.
- Added a **Get started** section to the `/beta` index (first, in journey order) linking all of the
  above plus the Batch 1–2 pages, so every screen is reviewable. The 404 is demoed via a deliberately
  non-existent path.

**Deviations (intentional, flagged)**
1. **No "Error:" title prefix** on G07/G08/G09/G10 (decision §6b.4 — GDS reserves it for form-
   validation errors). Titles match each H1.
2. **G09 inactivity timeout** built as drawn. The GOV.UK **timeout-warning pattern** before sign-out
   is not designed — flagged (Stage 1 §6.6), not invented. No real timeout runs in the prototype.
3. **Placeholder kept as drawn**: G08 "9am on Monday 28 September 2026".
4. **Emails swapped to fictional** (was real MHCLG domain): G07/G08 body →
   "cafsupport@example.gov.uk"; G04 From → "cyber@example.gov.uk". Same swap applied to the three
   Claim pages that used the CAF-team address. Alpha `round-two-access.js` left untouched.
5. **Sign-out clears the Beta namespaces only** (not the whole session) — keeps cookie prefs and the
   Alpha journey intact. A meaningful "signed out" for the Beta service without collateral.

**Accessibility (pa11y, axe + HTML_CodeSniffer)**
- G07, G08, G09, G10, G04: **1 error each — footer crown SVG only** (framework-wide). **Zero
  authored-content errors.**

**Section build complete** — Batches 1–3 done. Remaining: **Stage 3** (full pa11y sweep, end-to-end
walk incl. footer/error/sign-out and cross-section checks, consolidated deviations). G06 accessibility
statement and G12 privacy notice remain deliberately out (decision §6b.2).
