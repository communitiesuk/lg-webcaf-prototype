# Assurance activities — Stage 3 summary

Final check of the Assurance activities v3 build (Figma `mnOq3QRhTdiliuSuzQoNsX`, page 447:2693 —
proposal agreed, advice route). Stage 1 inventory + decisions: `assurance-activities-stage1-inventory.md`.
Per-batch notes + deviations: `assurance-activities-build-notes.md`. GDS: `gds-standards.md`.
Advice route: WebCAF advises, never enforces — nothing blocks a booking. All copy draft, unreviewed.

## 1. Verification table (built vs Content frame + screenshot)

| Screen | Text matches Content frame | Layout matches screenshot | Routes work | States covered | Not verified |
|---|---|---|---|---|---|
| **AA01** summary (on R05/R09) | Yes — R05 verbatim; R09 derived* | Yes | Yes | next-booked (R05), nothing-booked (R09) | — |
| **AA02** activities | Yes (verbatim) | Yes — +live 2nd system (decision 4) | Yes | Done / Booked / Book-when-ready / After-milestone / Not-yet | — |
| **AA03** before you book | Yes | Yes | Yes | workshop (ready+earliest), onboarding/pre-call (no readiness line) | non-workshop lead paragraph (not drawn — omitted) |
| **AA04** update | Yes | Yes | Yes | not-booked / booked+date / happened | — |
| **AA07** error | Yes (noun parameterised*) | Yes (empty date — correct) | Yes | "Booked" with no date | POST-only, not in the GET pa11y sweep — verified structurally |
| **AA05** onboarding | Yes | Yes | Yes | drawn early (`?demo=1`) + live | — |
| **AA06** pre-call | Yes | Yes | Yes | drawn early (`?demo=1`) + live | — |
| **AA08** mark ready | Yes | Yes | Yes | "All complete" only (decision 5) | incomplete state (deliberately not drawn/built) |
| **Bookings** stand-in | Yes (verbatim) | n/a (labelled "NOT OUR PAGE") | Yes | — | the real external page (not ours) |
| **Prepare v4** stand-in | n/a (labelled) | n/a | Yes | — | Prepare v4 (not built) |

\* R09's AA01 "not booked yet" line and the AA07 error noun are **derived/parameterised** (only the
booked-R05 AA01 and the pre-call AA07 are drawn verbatim) — see §3.

## 2. Accessibility, routes, recording, no-JS

- **pa11y (WCAG 2.2 AA, axe + HTML_CodeSniffer)** across all 8 screens + both stand-ins + both AA01
  dashboard states: **footer-crown only everywhere**, except **AA04** which also shows the
  govuk-frontend **conditional-reveal `aria-expanded`** finding (the component's JS adds it to the
  checked "Booked" radio; server HTML has `data-aria-controls`; `/decide/timing` shows 6 of the same).
  Both are **framework-level**. **Zero authored-content errors.**
- **Route walk — no dead ends.** Every link target resolves (all 200): AA01→AA02; AA02 Back→dashboard,
  Update→AA04, workshop Book→AA08, Other→Bookings (new tab); AA03 Back→AA02, Open Bookings→Bookings
  (new tab), "already booked"→AA04; AA04 Save→AA02 (or AA07); AA05 Book→AA03/Update→AA04/Continue→
  dashboard; AA06 Book→AA03/Back to prepare→stand-in; AA08 Review→self-assessment/Mark ready→AA03/
  Back→AA02; stand-ins→AA02/dashboard. The full advice flow AA02→AA08→AA03 works, with AA03 showing the
  **live** ready date (today) + earliest (today + 5 working days = 21 October 2026).
- **Recording reflects (brief requirement met).** From R09 (nothing booked), recording onboarding as
  "Booked for 2 December 2026" on AA04 → AA02 shows "Booked for 2 December 2026 / Update" **and** the
  AA01 dashboard summary Next line updates. Marking "It has happened" keeps the booked date → "Done, …".
- **External links** (AA02 Other activities, AA03 Open Bookings) carry `target="_blank"
  rel="noopener noreferrer"` and say "(opens in a new tab)".
- **Works without JavaScript**: forms POST normally; external links are plain anchors; the AA04
  conditional date reveal shows by default without JS; "Copy council name" is a progressive enhancement
  (the exact name is in the inset to copy manually).

## 3. Deviations from Figma (and why)

1. **AA02 shows two critical systems** (Northgate + Social care) vs the drawn one — the intended
   **live-driven** structure (decision 4); all drawn copy/dates preserved, Social care replicates the
   drawn per-system pattern.
2. **Other activities action = "Book (opens in a new tab)"** vs the drawn "Book" — the GOV.UK
   external-link rule (every external link says it opens in a new tab).
3. **AA03 numbered steps use a semantic `<ol class="govuk-list--number">`** (the mock shows "1./2./3."
   paragraphs); the council-name inset follows the list.
4. **AA03 non-workshop view omits the lead paragraph** (only the workshop AA03 is drawn; the onboarding/
   pre-call intro is not drawn, so it is not invented — the Bookings steps + inset still render).
5. **AA07 built with empty date fields** (the mock left 3/5/2027 pre-filled, which contradicts a
   "no date" error) — correct GOV.UK behaviour. **Error noun parameterised**: "…the call…" (verbatim
   for calls) / "…the workshop…" for workshops (only the pre-call wording is drawn). Only the
   "enter the date" error is drawn; no per-field date validation was added.
6. **AA03 ready/earliest dates are live** when reached via AA08 (today + 5 working days); reached
   directly they default to the drawn example (12 April → 19 April 2027). The 5-working-day window is a
   single constant, flagged unconfirmed.
7. **AA pages have no status tags** (as drawn — plain-text values). The dashboard (AA01) tags follow
   the Readiness section's GDS grey/blue decision.
8. **Nav active state** is not set on AA pages (the Figma highlights "Assessments"). Minor.
9. **"Copy council name"** is a progressive-enhancement clipboard copy; no-JS users copy from the inset.
10. **AA05 / AA06 read `assurance.activities`** (one source, so AA04 recording stays coherent). Their
    `/beta` links pass `?demo=1` to seed the drawn early state for review; via the normal flow they show
    the live session state (which starts from the completed example).
11. **R09's AA01 summary line is derived** ("[activity] · not booked yet") — only the booked (R05) AA01
    is drawn.

## 4. Stand-in pages created

- **Microsoft Bookings** (`/assurance-activities/bookings-external`) — labelled "NOT OUR PAGE — WE DO
  NOT DESIGN THIS"; no URL invented (external, owned by MHCLG).
- **Prepare v4 (P01)** (`/assurance-activities/prepare-stand-in`) — reached from AA06 "Back to prepare";
  Prepare v4 is built separately and has no route in the kit.
- **Self-assessment** (`/self-assessment`) — reused from the Readiness section (not designed yet).

## 5. Open items / decisions still needed (from the README and the build)

1. **AA05 / AA06 replacement of D09 / P08** — open. Built as separate routes; D09 (`/decide/sent`) and
   P08 are not changed. Whether they replace them is still to be decided.
2. **AA08 incomplete state** — deliberately not drawn (decision 5); not invented. Open for design.
3. **Five-working-day review window** — unconfirmed with Leon; implemented as one labelled constant.
4. **Who is told when a booking arrives and no assurer is assigned** — open (README). The screens never
   imply the council is booking its named assurer; "no assurer assigned" assurer-side state is not built.
5. **Council name field: free text vs dropdown** — Leon checking (D-2026-106). WebCAF shows the exact
   registered name to copy for now.
6. **Can the form enforce the earliest workshop date** — open; the advice route does not rely on it.
7. **Reading bookings back from Microsoft Bookings** — not proposed now (needs the Bookings API,
   permissions, council matching and a DPIA). Everything is recorded by hand in the session.
8. **Cross-section note**: the R05 dashboard *reminders* are static Readiness-v3 content and do not
   recompute from recorded assurance activities. The brief's requirement (AA01 + AA02 reflect recording)
   is met; the reminders belong to the Readiness section.

## 6. Not built (deliberately, per the brief / README)

Council dropdown, contact database, assurer views, notification screens, any read-back from Microsoft
Bookings, and the self-assessment itself — all out of scope; the external and self-assessment pages are
single labelled stand-ins.
