# Assurance activities — per-batch build notes + deviations

Source of truth: Figma `mnOq3QRhTdiliuSuzQoNsX`, page 447:2693 (Assurance activities v3, advice route).
Stage 1 inventory + resolved decisions: `assurance-activities-stage1-inventory.md`. GDS: `gds-standards.md`.
Advice route: WebCAF advises, never enforces — nothing blocks a booking. All copy draft, unreviewed.

## Batch 1 — Shared AA01 summary + session model, wired into the dashboard

**Built**
- `app/data/helpers/assurance.js` — the session model (`req.session.data.assurance`), the drawn
  example state (onboarding happened 12 March 2027, pre-call booked 3 May 2027) and a
  nothing-booked state, `ensureAssurance`, `seedAssuranceForState`, `buildAssuranceSummary`
  (AA01 Next/Done derivation), and the `EARLIEST_BOOK_WORKING_DAYS = 5` constant (unconfirmed, flagged).
- `app/views/components/assurance-summary.njk` — the shared **AA01 dashboard summary** partial
  (intro + Next/Done summary rows + "View all assurance activities" → `/assurance-activities`).
- Wired into **R05** (`_cycle-in-progress.html`, replacing the old inline block) and **R09**
  (`_several-reminders.html`, added per decision 2). The dashboard route passes `assuranceSummary`;
  the state switcher calls `seedAssuranceForState` so R05 shows the booked example and R09 shows
  nothing booked — coherent with R09's reminders.
- Removed the now-unused inline `assurance` block from `buildCycleInProgressModel` (readiness helper).

**AA01 derivation**
- **Next** = the first cycle activity that is booked (→ "[name] · booked for [date]"), else the first
  not-booked (→ "[name] · not booked yet"). **Done** = "Onboarding calls for both assessments" when
  both onboarding calls have happened.
- R05 (booked example): Next = "Pre self-assessment call · booked for 3 May 2027", Done = "Onboarding
  calls for both assessments" — **verbatim match** to the drawn AA01.
- R09 (nothing booked): Next = "Onboarding call for your organisation assessment · not booked yet", no
  Done row. **Flag:** the drawn AA01 only shows the booked (R05) state; the R09 "not booked yet" lines
  are derived (composed from the activity name + the drawn "not booked yet" phrasing), not verbatim.

**Deviations / flags**
1. R05 shows **3** critical-system task rows (live: Org + Northgate + Social care) vs the Figma AA01's
   2 (Org + Northgate) — the pre-existing Readiness live-state decision. The **assurance summary
   section matches the Figma exactly.**
2. Status tags follow GDS (grey/blue, sentence case) — the Readiness-section decision.
3. R09 derived "not booked yet" summary lines (see above).

**Accessibility (pa11y)**: R05 and R09 — footer-crown only. **Zero authored errors.**

**Verification**

| Screen/state | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| AA01 on R05 | verbatim match | Yes | "View all" → /assurance-activities (stand-in until Batch 2) | booked example |
| AA01 on R09 | derived (flagged) | Yes | same | nothing-booked, coherent with reminders |

**Not built in Batch 1**: AA02 (+ Other activities), AA03 (Batch 2); AA04, AA07, Bookings stand-in
(Batch 3); AA08, AA05, AA06 (Batch 4). The `/assurance-activities` stand-in remains until Batch 2.

## Batch 2 — AA02 (with Other activities) + AA03

**Built**
- `app/routes/assurance.js` — AA02 (`/assurance-activities`, replaces the Readiness stand-in) and AA03
  (`/assurance-activities/book/:activity`). Registered in `routes.js` after readiness; the old stand-in
  route + template removed from `readiness.js`.
- `app/data/helpers/assurance.js` — `buildActivitiesModel` (AA02 groups, **driven from the live cycle**),
  `resolveBookActivity` (AA03 content per activity), and the date helpers incl. `earliestBookDate`
  (ready date + 5 **working** days).
- Templates: `assurance/activities.html` (AA02), `assurance/before-you-book.html` (AA03).
- `/beta`: added AA02 and AA03 (workshop) links.
- `application.js`: "Copy council name" progressive enhancement (clipboard copy; no-JS safe — the name
  is in the inset to copy manually).

**AA02 — live-driven (decision 4)**
- "For the whole cycle": onboarding ×2 (Done, 12 March 2027 / Update), pre-call (Booked for 3 May 2027 /
  Update), **Other activities** (verbatim text / "Book" → Bookings, new tab, not recorded).
- "Organisation assessment": Objective A (mark-ready then book), Objective D (milestone), Step 4 / 5.
- One group **per selected critical system** (live: Northgate **and Social care**) with Objective B/C +
  Steps 4 and 5. Each system's workshop keys carry the system id (`workshop-B-sys-northgate`, etc.).
- No status tags — all values plain text, as drawn.
- Row values derive from the assurance session, so recording (Batch 3) flips a row to "Booked for … /
  Update". Workshop "Book" → AA08 (`/mark-ready/:activity`); Update → AA04; Other → Bookings.

**AA03 — `resolveBookActivity`**
- Workshop view (drawn): caption "Step 3: Objective A workshop", readiness + **earliest date computed
  = ready + 5 working days** (12 April 2027 → **19 April 2027**, matches the drawn example exactly),
  numbered Bookings steps, council-name inset + Copy link, "Open Microsoft Bookings (opens in a new
  tab)", "I have already booked this" → AA04. Parameterised for Objectives A/D/B/C (decision 1).
- Onboarding / pre-call views: no readiness line (per the Content frame); step 1 service name
  parameterised. **Flag:** only the workshop AA03 is drawn; the non-workshop lead paragraph is omitted
  (not invented) — exercised from AA05/AA06 in Batch 4.

**Deviations / flags**
1. **AA02 shows two systems** (Northgate + Social care) vs the Figma's one — the intended live-driven
   difference (decision 4). All drawn copy/dates preserved; Social care replicates the drawn pattern.
2. **Other activities action = "Book (opens in a new tab)"** vs the drawn "Book" — the GOV.UK external-
   link new-tab rule.
3. **AA03 numbered steps use a semantic `<ol class="govuk-list--number">`** (the drawn shows "1./2./3."
   paragraphs) — GDS-correct; the council-name inset follows the list.
4. **Nav active state**: AA pages don't highlight a nav item (the Figma shows "Assessments" active). Minor.
5. **"Copy council name"** is a progressive enhancement (clipboard JS added); no-JS users copy from the
   inset. Per the brief.

**Forward links (404 until their batch)**: AA02 Update + AA03 "I have already booked this" → AA04
(Batch 3); Other activities + AA03 "Open Microsoft Bookings" → Bookings stand-in (Batch 3); AA02
workshop Book → AA08 (Batch 4).

**Accessibility (pa11y)**: AA02, AA03 — footer-crown only. **Zero authored errors.**

**Verification (built vs Figma)**

| Screen | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| AA02 | verbatim (+ live 2nd system) | Yes | Update→AA04, Book→AA08, Other→Bookings (forward-404) | live-driven; no tags |
| AA03 | verbatim match | Yes | Open Bookings (new tab)→stand-in; "already booked"→AA04 (forward-404) | earliest date computed = 19 Apr 2027 |

**Not built in Batch 2**: AA04, AA07, Bookings stand-in (Batch 3); AA08, AA05, AA06 (Batch 4).

## Batch 3 — AA04 (update) + AA07 (error) + Microsoft Bookings stand-in

**Built**
- `routes/assurance.js` — AA04 GET/POST (`/assurance-activities/update/:activity`) and the Bookings
  stand-in (`/assurance-activities/bookings-external`). AA07 is AA04's POST validation-error re-render.
- `assurance.js` — `activityMeta` (caption + name + error noun per activity), `formatBookedDate`,
  `dateToParts` (prefill).
- Templates: `assurance/update-activity.html` (AA04 + AA07), `assurance/bookings-external.html`.
- `/beta`: added AA04 and the Bookings stand-in.

**Recording is now live** (verified end-to-end)
- AA04 radios: "Not booked yet" / "Booked" (conditional reveal with a GOV.UK 3-part Day/Month/Year
  date) / "It has happened". Prefilled from the session (pre-call → "Booked", 3/5/2027 — matches the
  drawn AA04). Save → AA02.
- Recording flows through: booking a workshop → AA02 shows "Booked for 7 June 2027 / Update"; marking
  the pre-call "It has happened" → "Done, 3 May 2027" (keeps the booked date); the AA01 dashboard
  summary recomputes Next/Done.
- "It has happened" keeps any existing booked date (no separate date field, as drawn). "Not booked yet"
  clears it. Cancelling is not designed (use "Not booked yet"), per the Content frame.

**AA07 error** — "Booked" with an empty date → error summary "There is a problem" + link to the date
field + inline "Error: Enter the date the [noun] is booked for". Built with **empty** date fields
(correct GOV.UK behaviour; the drawn mock left 3/5/2027 pre-filled — the flagged inconsistency).

**Deviations / flags**
1. **Error wording parameterised by activity**: "Enter the date the **call** is booked for" (verbatim
   for the pre-call / onboarding), "…the **workshop** is booked for" for workshops. Only the pre-call
   wording is drawn (AA07). The "enter the date" check is the only validation drawn (no per-field
   date validation added).
2. **AA07 built with empty date fields** (vs the drawn pre-filled mock) — correct behaviour.
3. **AA04 non-crown pa11y finding** = the govuk-frontend **conditional-reveal `aria-expanded`** on the
   checked "Booked" radio — a **framework finding** (the component's JS adds it at runtime; server HTML
   has `data-aria-controls`). Confirmed framework-wide: `/decide/timing` shows 6 of the same. **Not an
   authored error.**
4. **Cross-section staleness (noted, out of scope)**: the R05 dashboard *reminders* are static
   Readiness-v3 content and do not recompute from recorded assurance activities, so after recording a
   booking a reminder may still say "not booked yet". The brief's requirement (AA01 + AA02 reflect
   recording) is met; the reminders belong to the Readiness section.

**Accessibility (pa11y)**: Bookings stand-in — footer-crown only. AA04 — footer crown + the
conditional-reveal framework finding; **zero authored errors**. AA07 is POST-only (not in the GET
sweep); it reuses `govukErrorSummary` + `govukDateInput` error pattern, verified structurally.

**Verification (built vs Figma)**

| Screen | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| AA04 | verbatim match | Yes | Save → AA02 / AA07 | prefilled Booked 3/5/2027 |
| AA07 | verbatim (parameterised noun) | Yes (empty date) | Save and continue → AA02 | POST-only; empty fields (correct) |
| Bookings stand-in | verbatim | Yes | Back → AA02 | labelled "NOT OUR PAGE" |

**Not built in Batch 3**: AA08, AA05, AA06 (Batch 4). AA02 workshop "Book" → AA08 still forward-404s
until Batch 4.

## Batch 4 — AA08 (mark ready) + AA05 (onboarding) + AA06 (pre-call) + Prepare stand-in

**Built**
- `routes/assurance.js` — AA08 GET/POST (`/assurance-activities/mark-ready/:activity`), AA05
  (`/assurance-activities/onboarding`), AA06 (`/assurance-activities/pre-call`), and the Prepare v4
  stand-in (`/assurance-activities/prepare-stand-in`).
- `assurance.js` — `resolveMarkReady` (AA08, objective parameterised), `markReady` (records the ready
  date = today), `buildOnboardingRows` / `buildPreCallRow`, and `seedAA05Demo` / `seedAA06Demo`.
- Templates: `assurance/mark-ready.html`, `onboarding-calls.html`, `pre-call.html`, `prepare-stand-in.html`.
- `/beta`: added AA08, AA05 (`?demo=1`), AA06 (`?demo=1`).

**AA08 (decision 1 — parameterised A/B/C/D)**
- Caption "Step 3: Objective [X] workshop", H1 "Mark your Objective [X] information as ready", intro,
  row "Objective [X] outcomes / All complete / Review" (→ self-assessment stand-in), the five-working-
  days inset, "Mark as ready and continue". Only the "All complete" state (decision 5).
- POST records the ready date (today) and → AA03, which then shows the **live** readiness line and the
  computed earliest date (ready + 5 working days).

**The full advice flow now works end-to-end** (last forward-404 cleared): AA02 Objective A "Book" →
AA08 → "Mark as ready and continue" → AA03 showing "ready since 14 October 2026, earliest 21 October
2026" (computed live). Advice route: nothing blocks booking — AA03's Book link works regardless.

**AA05 / AA06**
- AA05: "Start a cycle" / "Book your onboarding calls"; rows from the session (`?demo=1` seeds the
  drawn early state: org "Not booked yet" / Book, systems "Booked for 10 March 2027" / Update); inset;
  "Continue" → `/dashboard` (decision 3).
- AA06: "Prepare for your assessment" / "Book your pre self-assessment call"; pre-call row (`?demo=1`
  seeds "Not booked yet" / Book); "Back to prepare" → Prepare v4 stand-in.

**Deviations / flags**
1. **AA05 / AA06 default vs demo state**: via the normal flow they show the live session state (which
   starts from the completed example — onboarding done, pre-call booked). The drawn frames show an
   early state, so the `/beta` links pass `?demo=1` to seed the drawn "not booked" state for review.
2. **AA05 / AA06 read `assurance.activities`** (one source, so recording via AA04 stays coherent),
   not the separate `decide.onboarding`. The seeded demo values match `decide.onboarding` / the drawn
   frames exactly.
3. **AA03 ready/earliest dates are now live** when reached via AA08 (today + 5 working days); reached
   directly they default to the drawn example (12 April → 19 April 2027).
4. Prepare v4 (P01) is a **labelled stand-in** (not built in the kit).

**Accessibility (pa11y)**: AA08, AA05, AA06, Prepare stand-in — **footer-crown only. Zero authored errors.**

**Verification (built vs Figma)**

| Screen | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| AA08 | verbatim match | Yes | Review → self-assessment; Mark ready → AA03; Back → AA02 | parameterised A/B/C/D |
| AA05 | verbatim match | Yes | Book → AA03, Update → AA04, Continue → /dashboard | `?demo=1` early state |
| AA06 | verbatim match | Yes | Book → AA03, Back to prepare → stand-in | `?demo=1` early state |
| Prepare stand-in | labelled | Yes | → /dashboard | Prepare v4 not built |

**Section build complete — all 8 screens (AA01–AA08) + the Microsoft Bookings and Prepare stand-ins
built across Batches 1–4.** Remaining: **Stage 3** (verification table per screen, pa11y across all,
full route walk, deviations, stand-ins, open items).
