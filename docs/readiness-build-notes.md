# Readiness and dashboard — per-batch build notes + deviations

Source of truth: Figma `mnOq3QRhTdiliuSuzQoNsX`, page 209:56 (Readiness and dashboard v3).
Stage 1 inventory + resolved decisions: `readiness-stage1-inventory.md`. GDS standards: `gds-standards.md`.
README warns: "All copy is draft and unreviewed by content design."

## Batch 1 — Readiness check + dashboard shell/state (R01, R02, R03)

**Built**
- `app/data/helpers/readiness.js` — session model (`req.session.data.readiness`), the three chrome
  variants (full access / collaborator / signed-in-no-council) reusing the shared `main.html` header,
  the LIVE dashboard state selector, the nudge builder, and the R03 view-model.
- `app/routes/readiness.js` — R01 (`/readiness`), R02 (`/readiness/answers`), the dashboard
  (`/dashboard`) with its state selector, the prototype state switcher (`/dashboard/show/:state`),
  the readiness reset (`/readiness/reset`), and the self-assessment stand-in (`/self-assessment`).
  Registered in `routes.js` before the catch-all 404.
- `layouts/dashboard.html` (extends the shared `setup.html` Beta base; sets the page title).
- Templates: `readiness/readiness-check.html` (R01), `readiness/your-answers.html` (R02),
  `dashboard/index.html` (shell) + `dashboard/_setup-in-progress.html` (R03) +
  `dashboard/_state-pending.html` (placeholder for R04/R05/R09/R06) +
  `dashboard/_state-switcher.html` (prototype control), `readiness/self-assessment-stub.html`.
- `/beta` index: added a "Readiness and dashboard" section (R01 / R02 / Dashboard).

**State model (LIVE — decision #2)**
- Selector: `readiness.demoCollaborator` → R06; else `!setup.completed` → R03; else
  `decide.approval.decision !== "approved"` → R04; else `readiness.demoReminders` → R09; else R05.
- `setup.completed` (set at `/setup/check-your-setup`) is the finish signal; the default seed is
  falsy → the dashboard naturally lands on **R03**.
- The prototype state switcher sets those live flags; it mutates `setup`/`decide` (shared with those
  sections) by design, as a demo control.
- Example readiness answers (Not yet / Yes / Not yet, 2 September 2026) are seeded **only when
  pristine**, so the default dashboard shows R03's two nudges and R02 shows the example — without ever
  overwriting a real user's answers. `/readiness/reset` clears them so R01 shows blank for review.

**Nudges (decision #1)**
- Only the two questions with drawn wording nudge: senior sponsor and secure evidence. **"Teams
  involved = Not yet" produces NO nudge** (no wording in the Content frames; not invented).
  **Content gap flagged** — supply the "teams involved" nudge wording to complete R03.

**Shared nav repointed (decision #6)** across Setup, Decide and Claim nav builders:
"Dashboard" → `/dashboard`, "Switch council" → `/choose-council`, "Assessments" → `/self-assessment`
(was all the holding page). "Sign out" already → `/get-started/sign-out`.

**Deviations (intentional, flagged)**
1. **Live counts differ from the drawn example** (decision #2): R03 shows "**3 of 8** tasks done"
   (live) vs the design's "4 of 6". The built Setup has 8 tasks; the design assumed 6.
2. **Status tags follow GDS** (decision #4): "Not started" grey, "In progress" blue. The design drew
   all tags blue and uppercase; current GDS tags are blue/grey and **sentence case** ("In progress").
3. **R02 date** rendered from `readiness.answeredAt` (example "2 September 2026"); the Content frame
   used a `[date]` placeholder.
4. **Prototype state switcher** added on the dashboard (clearly labelled, outside the service
   content) per the brief, to show R03–R06 on demand.

**Forward links that 404 until later batches** (render the service-chromed 404 page):
`/choose-council` (R10, Batch 3 — from "Switch council"), `/dashboard/previous-results` (R07, Batch 3),
`/dashboard/how-long` (R08, Batch 3 — both from R03's "Also on this page"). "People" → holding page.

**Accessibility (pa11y, axe + HTML_CodeSniffer)**
- `/readiness`, `/readiness/answers`, `/dashboard`, `/self-assessment`: **1 error each — the footer
  crown SVG only** (framework-wide). **Zero authored-content errors.**

**Open question flagged for you** (not blocking): the Journey block lists R03 → R02 via "Update your
readiness answers", but **that link is not drawn on the R03 screen or in its Content frame** (which
list only "People and governance · Previous CAF results · How long the CAF takes · Get help"). Built
faithfully without it. Where should the "Update your readiness answers" entry point live?

**Not built in Batch 1**
- R04, R05, R09 (Batch 2); R06, R07, R08, R10 (Batch 3). The state machinery already selects them.

## Batch 2 — Core dashboard states (R04, R05, R09) + stand-ins

**Built**
- Dashboard state partials: `_ready-to-decide.html` (R04, 209:175), `_cycle-in-progress.html`
  (R05, 209:200), `_several-reminders.html` (R09, 209:313). View-models in `readiness.js`
  (`buildReadyToDecideModel`, `buildCycleInProgressModel`, `buildSeveralRemindersModel`,
  `selectedSystemNames`). The dashboard route selects the partial and passes `prototypeNotes`.
- **AA02 stand-in** (`readiness/assurance-activities-stub.html`, `/assurance-activities`) — labelled
  "Prototype only: assurance activities proposal". Linked from R05 "View all assurance activities".
- The self-assessment stand-in (Batch 1) is linked from the R05 (3) and R09 (1) assessment rows.

**Live data (decision #2)**
- R04 "Setup" value is computed: "Complete, **3 essential services and 5 critical systems**" (the
  built seed has 5 systems; the design drew 4). R05's three rows resolve LIVE from
  `decide.cycle.selectedSystems` → the Setup system names (Organisation assessment + Northgate
  Revenues and Benefits + Social care case management) — an exact match to the design.
- Example / proposal data (labelled on-page via a "Prototype note"): R04 "Last assessment", R05/R09
  outcome progress, and the R05 assurance-activities summary + all reminders (Microsoft Bookings is a
  PROPOSAL). Reminder wording is verbatim from the Content frames.

**Deviations (intentional, flagged)**
1. **Status tags follow GDS** (decision #4): "Not started" grey, "In progress" blue, sentence case.
   The design drew all tags blue and uppercase.
2. **Prototype notes** (amber, labelled "Prototype note", outside the main flow) carry the
   "Example data, not real" (R04) and "Proposal, not agreed — Microsoft Bookings" (R05/R09) flags per
   the brief.
3. R04 "Last assessment" value is the drawn example string (no live prior-assurance record exists).

**Forward link that 404s until Batch 3**: R04 "Last assessment → View" → `/dashboard/previous-results`
(R07).

**Verification (built vs Figma, same width)**

| State | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| R04 ready-to-decide | Yes | Yes | Decide task → `/decide`, Setup View → `/setup/complete`, Last-assessment View → R07 (404 til Batch 3) | live "5 critical systems"; grey "Not started" |
| R05 cycle-in-progress | Yes (verbatim) | Yes | 3 rows → self-assessment stand-in; View all → AA02 stand-in | live system names; proposal note |
| R09 several-reminders | Yes (5 reminders verbatim) | Yes | 1 row → self-assessment stand-in | proposal note; single task row as drawn |

**Accessibility**: `/assurance-activities` footer-crown only. R04/R05/R09 use only standard GDS
components (govukTaskList / govukWarningText / govukSummaryList / govukButton), identical to R03 which
passes; the authoritative per-state pa11y sweep is in Stage 3.

**Not built in Batch 2**: R06, R07, R08, R10 (Batch 3).

## Batch 3 — Other views and edges (R06, R07, R08, R10)

**Built**
- **R06** collaborator view (`dashboard/_collaborator.html`, 209:226) — rendered as a dashboard state
  (via the switcher / `demoCollaborator`) with the **collaborator** nav variant ("Your tasks" +
  "Sign out", identity "Priya Shah · Westborough Borough Council"). Model `buildCollaboratorModel`.
- **R07** previous CAF results (`dashboard/previous-results.html`, `/dashboard/previous-results`,
  209:253) — inset + outcomes summary list + "Tell MHCLG" link. **Example data** note.
- **R08** how long the CAF takes (`dashboard/how-long.html`, `/dashboard/how-long`, 209:283) — intro
  + six durations (verbatim). **Placeholder** note.
- **R10** choose a council (`readiness/choose-council.html`, `/choose-council`, 209:341) — the
  **"signed in, no council"** nav variant (Sign out only, no identity); three example councils
  (Westborough/Eastvale/Northmoor) with "Open". `/choose-council/open/:council` maps each to its
  dashboard state (Westborough → R05, Eastvale → R03, Northmoor → R04).
- `/beta` Readiness section extended with R07, R08, R10 links. R06 via the dashboard state switcher.

**All three previously-404 forward links now resolve**: `/choose-council` (nav "Switch council"),
`/dashboard/previous-results` (R03/R04), `/dashboard/how-long` (R03).

**Decisions applied**
- **#3 R07 date = March 2025** throughout: the drawn H2 "Assured March 2024" is corrected to
  "Assured March 2025, against CAF v3.2" to match the inset, README and R04.
- **#4 GDS tags**: R06 "Not started" grey, "In progress" blue, sentence case.

**Deviations / flags**
1. **R07 "Something look wrong? Tell MHCLG…" → `/support`** (the CAF team contact). The design draws
   it as a link but names no target — assumed the support page. Confirm.
2. **R10 single-council limitation**: only Westborough has full seed data, so all three "Open" links
   land on the (Westborough-backed) dashboard in the state shown against each council's name. Noted in
   an on-page prototype note.
3. **Placeholders reproduced as drawn** (R08): "around 26 weeks" and all six durations — flagged, not
   corrected.
4. Prototype "Example data, not real" notes on R07 and R10; placeholder note on R08.

**Verification (built vs Figma, same width)**

| Screen | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| R06 collaborator | verbatim | Yes | 2 rows → self-assessment stand-in; collaborator nav | Priya Shah identity |
| R07 previous results | verbatim (date → 2025) | Yes | Back → dashboard; "Tell MHCLG" → /support | example note |
| R08 how long | verbatim (durations) | Yes | Back → dashboard | placeholder note |
| R10 choose council | verbatim | Yes | 3× Open → `/choose-council/open/:id` → dashboard; no-council nav | example note |

**Accessibility**: `/dashboard/previous-results`, `/dashboard/how-long`, `/choose-council`:
footer-crown only. **Zero authored errors.**

**Section build complete** — all 10 screens (R01–R10) built across Batches 1–3. Remaining: **Stage 3**
(full pa11y sweep incl. every dashboard state, full route walk, cross-section chrome check,
consolidated deviations + proposals + placeholders + open decisions).
