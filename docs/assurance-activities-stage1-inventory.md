# Assurance activities — Stage 1 inventory (no code)

Source of truth: Figma `mnOq3QRhTdiliuSuzQoNsX`, page "17 Assurance activities — v3 (proposal agreed,
advice route, 14 Oct)", node **447:2693**. Copy verbatim from the Content frames. The yellow banner:
"Agreed 14 October on the advice route. All copy is still draft and unreviewed by content design.
Microsoft Bookings is outside WebCAF and is not ours to design."

Core idea (README): WebCAF does **not** book. It shows each activity, links to the live Microsoft
Bookings form, and lets the council **or** the assurer **record** booked / done. **Advice route:
WebCAF advises and never enforces — nothing blocks a booking.**

## 1. Route map

GOV.UK Frontend **5.14.0**. All pages use the **full-access** dashboard chrome (reuse
`applyFullAccessChrome` from the Readiness section) and extend `layouts/dashboard.html`.

| Screen | Proposed URL | Template | Linked from | Links to |
|---|---|---|---|---|
| **AA01** dashboard summary | *(no own URL — partial on `/dashboard`)* | `dashboard/_assurance-summary.njk` | R05 (and R09 — see §5) | "View all" → AA02 |
| **AA02** assurance activities | `/assurance-activities` *(replaces the stand-in)* | `assurance/activities.html` | AA01, AA04 saved, AA07, R05, `/beta` | Book → AA08→AA03; Update → AA04; Other activities → Bookings (new tab) |
| **AA03** before you book | `/assurance-activities/book/:activity` | `assurance/before-you-book.html` | AA02 (via AA08), AA05, AA06, AA08; *(D09/P08 design-intent)* | Open Microsoft Bookings (new tab) → external stand-in; "I have already booked this" → AA04 |
| **AA04** update an activity | `/assurance-activities/update/:activity` | `assurance/update-activity.html` | AA02 Update, AA03, AA05 Update, external | Save → AA02 (or AA07 on error) |
| **AA05** book onboarding calls | `/assurance-activities/onboarding` | `assurance/onboarding-calls.html` | starting point / `/beta` *(would replace D09)* | Book → AA03; Update → AA04; Continue → `/dashboard` *(see §5)* |
| **AA06** book pre self-assessment call | `/assurance-activities/pre-call` | `assurance/pre-call.html` | starting point / `/beta` *(would replace P08)* | Book → AA03; "Back to prepare" → Prepare v4 P01 **stand-in** |
| **AA07** error (booked, no date) | *(POST re-render of AA04)* | `assurance/update-activity.html` | AA04 submit | Save and continue → AA02 |
| **AA08** mark info as ready | `/assurance-activities/mark-ready/:objective` | `assurance/mark-ready.html` | AA02 Book (workshop) | Mark as ready and continue → AA03; Back → AA02 |
| **EXTERNAL** Microsoft Bookings | `/assurance-activities/bookings-external` | `assurance/bookings-external.html` **stand-in** ("NOT OUR PAGE") | AA02 Other activities, AA03 | — (opens in new tab) |

Existing pages **not changed** (agreed decision 4): **D09 = `/decide/sent`** ("Book your onboarding
calls", 393:3103). **P08 (Prepare v4, 332:19087) is not built** → stand-in.

## 2. State list per screen (verbatim example data)

**AA01 summary** (on the dashboard): intro "Calls and workshops with your assurer, booked through
Microsoft Bookings." Rows: **Next** "Pre self-assessment call · booked for 3 May 2027"; **Done**
"Onboarding calls for both assessments". Link "View all assurance activities". States: next activity /
done / nothing booked (derived from the assurance session).

**AA02** — H1 "Assurance activities"; intro "You or your assurer can book. Bookings are made in
Microsoft Bookings. Come back here to record them, so your dashboard stays up to date." **No status
tags — all values are plain text.** Three H2 groups:
- **For the whole cycle**: "Step 1: Onboarding, organisation assessment" — "Done, 12 March 2027" /
  Update · "Step 1: Onboarding, critical systems" — "Done, 12 March 2027" / Update · "Step 2: Pre
  self-assessment call (optional)" — "Booked for 3 May 2027" / Update · **Other activities** — "Your
  assurer may ask you to book other sessions, for example CAF 3.2 to 4.0 transition workshops. Book
  them in Microsoft Bookings. These are not recorded here." / **Book** (opens live form, not recorded).
- **Organisation assessment**: "Step 3: Objective A workshop" — "Mark your information as ready for
  review, then book" / Book · "Step 3: Objective D workshop" — "Book when your Objective D outcomes are
  complete" / Book · "Step 4: Report clarification session" — "After your draft report arrives" /
  (none) · "Step 5: Improvement plan review" — "After your final report" / (none).
- **Northgate Revenues and Benefits**: "Step 3: Objective B workshop" — "Not yet" / Book · "Step 3:
  Objective C workshop" — "Not yet" / Book · "Steps 4 and 5" — "After your draft report arrives" / (none).
- Row **status vocabulary**: Done with date · Booked for date · Book when ready · After a milestone ·
  Not yet. Other activities have no status.

**AA03** — Caption = the activity ("Step 3: Objective A workshop"); H1 "Book your Objective A
workshop". Workshop intro states the **readiness + earliest date**: "Your Objective A information has
been ready for assurer review since 12 April 2027, so the earliest date you can book is 19 April 2027.
Your assurer usually needs about five working days to review it…" (**readiness line shows for
workshops only**, not onboarding / pre-call). H2 "In Microsoft Bookings" + 3 numbered steps; inset
"Westborough Borough Council"; link "Copy council name"; button "Open Microsoft Bookings (opens in a
new tab)"; secondary link "I have already booked this". States: **ready** (workshop, earliest date
shown) and **not ready** (onboarding/pre-call, no readiness line).

**AA04** — Caption/H1 per activity ("Update your pre self-assessment call"). Radios in order: "Not
booked yet" · "Booked" (**conditional reveal**: label "When is it?", hint "For example, 3 5 2027",
GOV.UK 3-part Day/Month/Year date) · "It has happened". Button "Save and continue". States: booked
with date / not booked / happened. ("Cancelling is not designed; use Not booked yet.")

**AA07** — AA04 with the GOV.UK error pattern. Error summary "There is a problem" → "Enter the date
the call is booked for"; inline "Error: Enter the date the call is booked for". (Triggered by choosing
"Booked" with an empty date.)

**AA05** — Caption "Start a cycle"; H1 "Book your onboarding calls"; intro "This is your first cycle…
Requests go to a shared mailbox and a technical lead assigns your assurer, so you may not have a named
assurer yet." Rows: "Step 1: Onboarding, organisation assessment" — "Not booked yet" / Book · "Step 1:
Onboarding, critical systems" — "Booked for 10 March 2027" / Update. Inset "This does not stop you
sending your plan for approval…". Button "Continue". *(Rows match the `decide.onboarding` seed.)*

**AA06** — Caption "Prepare for your assessment"; H1 "Book your pre self-assessment call"; intro "An
optional one-hour call with your assurer, once per assessment…". Row: "Step 2: Pre self-assessment
call (optional)" — "Not booked yet" / Book. Button "Back to prepare" (secondary).

**AA08** — Caption "Step 3: Objective A workshop"; H1 "Mark your Objective A information as ready";
intro "Your assurer reviews your self-assessment and evidence before the workshop. Tell them it is
ready, and you can book. You can take this back until your assurer opens it." Row: "Objective A
outcomes" — "All complete" / Review. Inset "Your assurer usually needs about five working days to
review your information before the workshop, and will confirm this with you. After you continue, you
will see the earliest date you can book." Button "Mark as ready and continue". **Only the "All
complete" state is drawn** (decision 5). *(Note: the earliest date + assurer are shown on AA03, not in
AA08's inset.)*

**EXTERNAL** — stand-in page: "NOT OUR PAGE — WE DO NOT DESIGN THIS"; "Microsoft Bookings: CAF for
local government, assurance activities"; nine bookable services; staff "Anyone / Local Digital CAF
Assurance"; asks for name, email, special requests, council name (free text); owned by MHCLG, live.

## 3. Shared items

- **AA01 summary → `dashboard/_assurance-summary.njk`**: the "Assurance activities" block (intro +
  Next/Done summary rows + "View all" link), derived from the assurance session by a
  `buildAssuranceSummary()` helper. Reused on **R05** (replacing the current inline block) and **R09**
  (see §5). Updated example: "Next: Pre self-assessment call · booked for 3 May 2027".
- **AA02 activity row**: a repeated summary-list row (key / plain-text value / optional Book|Update
  action), built from the assurance model by a `buildActivityRows()` helper.
- **Session model (new) `req.session.data.assurance`**: per-activity `{ status, date }` keyed by
  activity id (onboarding-org, onboarding-systems, pre-call, workshop-A/D/B/C, report/improvement
  milestones), plus `ready[objective]` + `readyDate[objective]` set by AA08. Seeded to the drawn AA02
  example. **Recording on AA04 / AA05 updates the session; AA01 and AA02 reflect it** (advice-route,
  session-only). Onboarding rows reconcile with the existing `decide.onboarding` seed.
- **Earliest-book-date rule**: one constant **= 5 working days after the "ready" date**, labelled
  unconfirmed in a comment (window still open with Leon). Shown on AA03 for workshops.

## 4. Link-targets table (every Journey link → real route or named stand-in)

| Journey link | Target |
|---|---|
| AA01 "View all assurance activities" | `/assurance-activities` (AA02) |
| AA02 "Book" (Objective A/D/B/C workshop) | `/assurance-activities/mark-ready/:obj` (AA08) → AA03 |
| AA02 "Book" (Other activities) | `/assurance-activities/bookings-external` **stand-in** (new tab) |
| AA02 "Update" | `/assurance-activities/update/:activity` (AA04) |
| AA03 "Open Microsoft Bookings (opens in a new tab)" | `/assurance-activities/bookings-external` **stand-in** (new tab) |
| AA03 "I have already booked this" | AA04 |
| AA04 / AA07 "Save and continue" | AA02 (AA07 on validation error) |
| AA05 "Book" / "Update" / "Continue" | AA03 / AA04 / `/dashboard` *(Continue not in Journey — §5)* |
| AA06 "Book" / "Back to prepare" | AA03 / Prepare v4 P01 **stand-in** |
| AA08 "Mark as ready and continue" / "Back" | AA03 / AA02 |
| → the self-assessment (AA01/dashboard) | `/self-assessment` **stand-in** (exists) |
| D09 (`/decide/sent`) / P08 → AA03 | **design-intent only** — D09 frozen (decision 4), P08 not built |

Stand-ins created: **Microsoft Bookings external** ("NOT OUR PAGE"), **Prepare v4 P01** (AA06 back),
and the existing **self-assessment** stand-in is reused.

## 5. Cannot build / ambiguities / conflicts

1. **AA08 is drawn for Objective A only** (decision 5: only the "All complete" state). The README says
   the mark-ready step applies to **any workshop**. Proposal: **parameterise AA08 by objective**
   (`:objective` = A/D/B/C), reusing the drawn Objective A copy with the letter substituted, so every
   workshop "Book" follows mark-ready → AA03. Only Objective A is verbatim. **Confirm.**
2. **R09 has no assurance summary today** (it is reminders-only from Readiness v3). The brief says the
   AA01 partial is reused by R05 **and R09**. Proposal: add the summary to R09 as well. **Confirm** it
   belongs there (R09 = "several reminders", little booked).
3. **AA05 "Continue" has no Journey target.** Proposal: → `/dashboard`. (D09/`decide/sent` continues
   into the Decide approval flow, but AA05 is standalone.) **Confirm.**
4. **AA02 example shows one critical system (Northgate)** as drawn; the live `decide.cycle` has two
   (Northgate + Social care). Per "use the example data exactly as drawn", AA02 will seed the **drawn
   Northgate-only** example, so AA02 will differ from the live dashboard's two systems. **Confirm**
   (drawn example) vs driving AA02 from live `decide.cycle`.
5. **AA03 inbound from D09/P08 is design-intent only** — D09 (`/decide/sent`) is frozen and P08 is not
   built, so those inbound links are not wired. AA03 is reachable from AA02/AA05/AA06/AA08.
6. **"Copy council name" (AA03) is a progressive enhancement.** The kit has no copy-to-clipboard JS
   pattern. The exact name is shown in the inset to copy manually (works without JS); the link will be
   a no-JS-safe enhancement or listed as a **deviation**.
7. **AA07 is drawn with the date fields still pre-filled (3/5/2027) despite the "no date" error.** That
   is inconsistent — the error means no date was entered. Build the error state with **empty** date
   fields (correct GOV.UK behaviour); **deviation** from the drawn mock.
8. **Microsoft Bookings** cannot be built (external, not ours) — single labelled stand-in, no invented
   URL.
9. **Five-working-day window, dropdown council field, who-is-told-when-no-assurer, AA08 incomplete
   state** — all open in the README; reproduced/omitted as drawn, listed as open items.

## 5b. Decisions resolved (sign-off)

1. **AA08 parameterised by objective A/B/C/D** — each workshop is booked individually via mark-ready →
   AA03. Objective A copy is verbatim; the letter is substituted for B/C/D.
2. **AA01 summary added to R09** as well as R05 (shared partial, state-derived content).
3. **AA05 "Continue" → `/dashboard`** (service home; the AA01 summary there reflects the recorded
   onboarding).
4. **AA02 is driven from the live `decide.cycle`** (organisation assessment + each selected critical
   system = Northgate + Social care), preserving all drawn copy/dates and replicating the drawn
   per-system workshop pattern for each system. Keeps the dashboard and AA02 coherent. The
   AA02-vs-Figma system count (2 live vs 1 drawn) is the intended live-driven difference, flagged in
   Stage 3.

## 6. Proposed build batches (per the brief)

1. Shared **AA01 summary partial** + the **AA02 activity-row** helper + session model, wired into the
   dashboard (R05, R09).
2. **AA02** (with the Other activities row) + **AA03**.
3. **AA04** + **AA07** (error) + the **Microsoft Bookings** stand-in.
4. **AA08** + **AA05** + **AA06** (+ the Prepare v4 stand-in).

**Stop — awaiting your approval and the §5 confirmations before any code.**
