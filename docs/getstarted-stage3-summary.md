# Get started — Stage 3 summary

Final check of the Get started v3 build (Figma `mnOq3QRhTdiliuSuzQoNsX`, page 209:1927).
Stage 1 inventory + decisions: `getstarted-stage1-inventory.md` (§6b). Per-batch build notes +
deviations: `getstarted-build-notes.md`. GDS standards: `gds-standards.md`.
README warns: "All copy is draft and unreviewed by content design."

## 1. Accessibility — pa11y (WCAG 2.2 AA, axe + HTML_CodeSniffer)

Swept **11 GET-reachable Get started screens** (both runners, errors only), plus the GET-reachable
success-banner variant `/cookies?saved=1`. **1 error per page — every one the GOV.UK footer crown
SVG** (`govuk-footer__crown`, `F92/ARIA4`). **Zero authored-content errors.** Same single framework
finding as Setup, Decide and Claim (prototype-wide chrome, not introduced here).

| Screen | Route | pa11y |
|---|---|---|
| G01/G02 service start page | `/get-started` | crown only |
| G03 cookie settings | `/cookies` (+ `?saved=1`) | crown only |
| G05 support | `/support` | crown only |
| G11 give feedback | `/feedback` | crown only |
| G13 feedback sent | `/feedback/sent` | crown only |
| G08 service unavailable | `/service-unavailable` | crown only |
| G09 signed out (inactivity) | `/get-started/session-expired` | crown only |
| G10 you have signed out | `/get-started/signed-out` | crown only |
| G07 page not found | catch-all 404 | crown only |
| G04 invitation email (preview) | `/prototype/emails/invitation` | crown only |
| External placeholder | `/external` | crown only |

Everything built with official GDS component macros, so labels, fieldsets/legends, hints, the
notification-banner, radios, buttons, panel, headings and page titles pass.

**Stateful variants not in the GET sweep** (verified structurally in the batches; pa11y runs a fresh
browser session so cannot reach them): the cookie **confirmation banner** (after Accept/Reject) and
the G11 form re-render with retained values. Both reuse the same GDS cookie-banner / form components
that pass on the base pages.

## 2. End-to-end walk — every path, no dead ends

| Path | Steps | Ends at |
|---|---|---|
| Main | G01 → **Start now** | `/prototype-sign-in` (One Login stand-in) |
| Cookies (accept/reject) | G02 banner → choose → confirmation → **Hide** | banner gone; choice stored |
| Cookies (view/settings) | banner "View cookies" / footer "Cookies" → G03 → **Save** | `/cookies` + success banner; radio reflects choice |
| Footer | Get help → G05 · Cookies → G03 · Accessibility / Privacy → holding | all 200 |
| Feedback | phase-banner "feedback" → G11 → **Send feedback** → G13 → **Back to the service** | returns to origin (e.g. `/decide/cni`) |
| Support back | G05 **Back** | returns to origin (Referer), else `/get-started` |
| 404 | any unmatched path | G07 (HTTP 404), service chrome |
| Service unavailable | `/service-unavailable` | G08 (HTTP 503) |
| Signed out (inactivity) | G09 → **Sign in again** | `/get-started` |
| Signed out (chose to) | section "Sign out" → clears Beta state → G10 → **Sign in again** | `/prototype-sign-in` |
| Invitation email | G04 → **Register …** | `/claim` (first-to-join → Claim 01) |

**Cross-section regression (shared-layout + sign-out changes):**
- Setup (`/setup/task-list`, `/setup/complete`), Decide (`/decide/cni`, `/systems`, `/review`) and
  Claim (`/claim/find`, `/your-details`): all **200**, all show the Beta banner + "feedback" link and
  the reconciled **"Sign out" → `/get-started/sign-out`**.
- Sign-out from each section redirects to **G10** and clears that section's state; the section still
  renders afterwards (re-seeds on entry). `/claim` after sign-out correctly falls back to its
  sign-in gate.
- **Alpha journey untouched**: `/research-rounds` still shows the **Alpha** tag, no "feedback" link,
  no cookie banner. No Beta chrome bleed into the Alpha pages or the `/beta` index.

No 404s or 500s anywhere in the built journey (the 404 page is reached only by design).

## 3. Consolidated deviations (intentional, each flagged)

1. **Start button carries the GDS arrow** (`isStartButton`). Figma drew a plain green "Start now";
   used the start-page component as intended, consistent with the service-wide GDS alignment.
2. **"Start now" → the One Login stand-in** (`/prototype-sign-in`); the Figma arrow to G03 is a demo
   artifact (decision §6b.1).
3. **Built with official GDS macros**; G03's analytics question uses the content-rich pattern
   (H2 + body + radios with a **visually-hidden legend**).
4. **Save on G03 stays on `/cookies`** with the success banner, matching the rendered screen (the
   inventory's "→ G01" note is superseded by the SCREEN).
5. **Cookie confirmation wording** uses the GOV.UK standard ("You've accepted/rejected analytics
   cookies. You can change your cookie settings at any time." + "Hide cookie message") — decision §6b.5.
6. **G11 has no prototype "not sent" note** — the note was added at Stage 1, then **removed** on your
   instruction so the page reads as live service content (per the `feedback_no_prototype_language`
   preference). Feedback is still never sent or stored behind the scenes.
7. **No "Error:" title prefix** on G07–G10 (decision §6b.4). Page `<title>`s set to match each H1
   (the kit never set it); the start page collapses to "Service name - GOV.UK".
8. **G05 external references are plain text** (security.gov.uk, Local Digital), matching the SCREEN.
   The shared external placeholder is used only by G01's three guidance links.
9. **Sign-out clears the Beta namespaces only** (`setup`/`decide`/`claim`), leaving cookie prefs and
   the Alpha journey intact — a meaningful sign-out without collateral.
10. **Back / return links are Referer-based** (G05 Back, G13 "Back to the service"), comparing
    `hostname` only because the kit proxies on a different internal port; fall back to `/get-started`.
11. **G04 is a prototype-only email preview** (not a service page), with a clear "EMAIL — NOT A WEB
    PAGE" header; CTA → the Claim first-to-join scenario (decision §6b.6).
12. **Placeholders built as shown and flagged, not filled**: G01 "roughly 26 weeks", G03 "Google
    Analytics", G05 "5 working days", G08 "9am on Monday 28 September 2026".

## 4. Not built / simulated (prototype limits)

- **G06 accessibility statement and G12 privacy notice — deliberately OUT** (decision §6b.2;
  incomplete placeholder legal content). Their footer links point to the holding page.
- **No analytics actually run** (Google Analytics is a placeholder tool name). The cookie choice is
  stored in the session only.
- **Feedback is never sent or stored.** G13 is shown regardless of input.
- **No real session timeout** (G09) and **no real email send** (G04) — both are static previews.
- **G07/G08/G09/G10 error states** are reachable directly for review; only the 404 is wired to real
  unmatched-path behaviour.

## 5. Rules the design does not state (listed, not invented)

- **G09 inactivity timeout length** is undecided, and the GOV.UK **timeout-warning pattern** before
  sign-out is not designed (flag — Stage 1 §6.6). Built G09 as drawn.
- **Service-unavailable date/time** (G08) is a drawn placeholder, not a real maintenance window.
- **Reply SLA** "5 working days" (G05) is a placeholder, not confirmed.

## 6. Decisions

**Resolved**
- **Emails swapped to fictional** — `cafsupport@communities.gov.uk` → `cafsupport@example.gov.uk`
  (G05/G07/G08) and `cyber@communities.gov.uk` → `cyber@example.gov.uk` (G04 From), using the
  prototype's existing `example.gov.uk` convention. Also swapped the same CAF-team address in the
  three Claim pages (not-approved, not-in-list, contact-support) for consistency. The Alpha-only
  `round-two-access.js` (`caf-admin@communities.gov.uk`) was left untouched — separate journey, feeds
  email-matching logic.
- **G11 prototype note removed** — the feedback page now reads as live service content.

**Still needed from you**
1. **Confirm the drawn placeholders**: "roughly 26 weeks" (G01), "Google Analytics" (G03),
   "5 working days" (G05), "9am on Monday 28 September 2026" (G08).
2. **G09 timeout** — the inactivity length and whether to add the GOV.UK timeout-warning pattern.
3. **G06 / G12** — when the real accessibility statement and privacy notice content is ready, build
   them and repoint the footer links (currently the holding page).
