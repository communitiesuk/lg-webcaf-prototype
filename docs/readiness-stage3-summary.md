# Readiness and dashboard — Stage 3 summary

Final check of the Readiness and dashboard v3 build (Figma `mnOq3QRhTdiliuSuzQoNsX`, page 209:56).
Stage 1 inventory + decisions: `readiness-stage1-inventory.md`. Per-batch notes + deviations:
`readiness-build-notes.md`. GDS standards: `gds-standards.md`.
README warns: "All copy is draft and unreviewed by content design."

## 1. Accessibility — pa11y (WCAG 2.2 AA, axe + HTML_CodeSniffer)

Swept **all 10 screens, all 5 dashboard states, and both stand-ins** (dashboard states primed by
letting pa11y follow the state-switcher 302 to `/dashboard`). **1 error per page — every one the
GOV.UK footer crown SVG** (`govuk-footer__crown`, `F92/ARIA4`). **Zero authored-content errors.**
Same single framework finding as Get started, Setup, Decide and Claim.

| Screen / state | Route | pa11y |
|---|---|---|
| R01 readiness-check | `/readiness` | crown only |
| R02 your-answers | `/readiness/answers` | crown only |
| R03 setup-in-progress | `/dashboard` (default) | crown only |
| R04 ready-to-decide | `/dashboard` (cycle not approved) | crown only |
| R05 cycle-in-progress | `/dashboard` (approved) | crown only |
| R09 several-reminders | `/dashboard` (approved + demo) | crown only |
| R06 collaborator | `/dashboard` (collaborator) | crown only |
| R07 previous-results | `/dashboard/previous-results` | crown only |
| R08 how-long | `/dashboard/how-long` | crown only |
| R10 choose-council | `/choose-council` | crown only |
| self-assessment stand-in | `/self-assessment` | crown only |
| AA02 stand-in | `/assurance-activities` | crown only |

Built with official GDS macros throughout (radios, summary list, task list, warning text, inset text,
button, back link, notification banner, service navigation, phase banner), so labels, legends, hints,
headings, page titles and the error patterns pass.

## 2. Route walk — every path, no dead ends

| Path | Route in | Route(s) out |
|---|---|---|
| R01 | entry / `/beta` / nav | Save and continue → `/dashboard`; Skip for now → `/dashboard` |
| R02 | R03 "update" / `/beta` | Change → R01; Save changes → `/dashboard`; Back → `/dashboard` |
| R03 | `/dashboard` (live) | Continue setting up / task row → `/setup/task-list`; People → holding; Previous results → R07; How long → R08; Get help → `/support` |
| R04 | `/dashboard` (live) | Start this cycle / task → `/decide` (→ `/decide/cni`); Setup View → `/setup/complete`; Last assessment View → R07 |
| R05 | `/dashboard` (live) | 3 task rows → self-assessment stand-in; View all → AA02 stand-in |
| R09 | `/dashboard` (demo) | 1 task row → self-assessment stand-in |
| R06 | `/dashboard` (collaborator) | 2 task rows → self-assessment stand-in |
| R07 | R03 / R04 | Back → `/dashboard`; "Tell MHCLG" → `/support` |
| R08 | R03 | Back → `/dashboard` |
| R10 | nav "Switch council" / `/beta` | 3× Open → `/choose-council/open/:id` → `/dashboard` |
| stand-ins | R05 / R06 / R09 / nav | Back to your dashboard → `/dashboard` |

All link-out targets return 200 (or the expected redirect: `/decide` → `/decide/cni`,
`/get-started/sign-out` → `/get-started/signed-out` = G10). **No 404s or dead ends** in the built
journey. The prototype state switcher (clearly labelled, outside the service content) reaches every
dashboard state; R10 "Open" reaches R03/R04/R05.

## 3. Cross-section chrome check

- The dashboard reuses the **shared `main.html` header** with three res.locals nav variants
  (`applyFullAccessChrome` / `applyCollaboratorChrome` / `applyNoCouncilChrome`) — **no second header**.
- Setup, Decide, Claim and Get started all still render (200) with the shared Beta banner, cookie
  banner and footer. The **repointed nav** is live: "Dashboard" → `/dashboard` (200), "Switch council"
  → `/choose-council` (200), "Assessments" → `/self-assessment`, "Sign out" → `/get-started/sign-out`
  (→ G10). The Alpha journey (`/research-rounds`) is **untouched** (still "Alpha", no bleed).
- `/beta` index shows the "Readiness and dashboard" section (R01, R02, dashboard + state switcher,
  R07, R08, R10).

## 4. Consolidated deviations (intentional, each flagged)

1. **Dashboard reads LIVE Setup/Decide state** (decision #2). Counts differ from the drawn example:
   R03 "3 of 8 tasks done" (drawn "4 of 6"; the built Setup has 8 tasks), R04 "3 essential services
   and **5** critical systems" (drawn 4). R05's system names resolve live and **match** the design.
2. **Status tags follow GDS** (decision #4): grey "Not started", blue "In progress", **sentence case**.
   The design drew every tag blue and uppercase.
3. **R07 date = March 2025** throughout (decision #3) — the drawn H2 "March 2024" is corrected to match
   the inset, README and R04.
4. **Prototype state switcher** on the dashboard, and **amber "Prototype note" blocks** for example /
   proposal data — both prototype-only, outside the service content.
5. **Built with GDS macros**; single-question radio page (R01) uses inline radios with heading-style
   legends; the dashboard task rows use `govukTaskList`, reminders use `govukWarningText`.
6. **"Update your readiness answers" link is not on R03** — the screen and its Content frame omit it
   (the Journey block lists it). Built faithfully without it; R02 reached via `/beta` and the nav.
   (Open — where should the entry point live?)
7. **R07 "Tell MHCLG" → `/support`** — the design draws a link with no named target; assumed support.
8. **R10 is a single-council prototype** — only Westborough has seed data, so all three "Open" links
   land on the Westborough-backed dashboard in the state shown (noted on-page).

## 5. Proposals and placeholders (reproduced as drawn, labelled, not invented)

- **PROPOSAL** (README): the dashboard leading with "whatever comes next" (R03–R05); Microsoft Bookings
  — R05's assurance-activities summary and the R05/R09 reminders are built "as if agreed", with a
  "Proposal, not agreed" note; who is offered the readiness check and when (R02); R07 alongside-vs-
  separate and CAF-version mapping; R10 register-once-vs-per-council.
- **PLACEHOLDERS**: "around 26 weeks" and every R08 duration (await MHCLG sign-off) — reproduced
  verbatim with a placeholder note.
- **Example data, not real** (labelled): R04 "Last assessment", R07 previous results, R10 councils,
  and the R05/R06/R09 outcome progress.

## 6. Decisions / open questions for you

1. **Nudge wording gap (content):** "teams involved = Not yet" has **no nudge** (none drawn; not
   invented). Supply wording, or confirm that question never nudges.
2. **"Update your readiness answers" entry point** — not drawn on R03. Where should it live?
3. **R07 "Tell MHCLG" target** — confirm `/support`, or a dedicated report-an-error flow.
4. **R08 durations / "26 weeks"** — confirm the placeholders with MHCLG.
5. **R09** — the README asks whether five reminders reads as failure; worth user testing.
6. **TO CLARIFY WITH ROSA** (README, no behaviour built here): returning councils that have already
   done their organisation assessment can only assess new critical systems, and some reach "nothing
   new to assess" (Decide D20). Confirm how this is handled/explained in Decide.

## 7. Not verified / out of scope

- **What assurers and MHCLG see when signed in** — deliberately not drawn (README); not built.
- The **self-assessment** and **AA02 assurance activities** — not designed; single labelled stand-ins.
- **Index page (page 00)** may still list "Q1 CAF lead" for this section; the v3 screens removed it
  (now a Setup task) — built without it, mismatch noted.
- Multi-council **identity** on the dashboard after R10 (single-council prototype, §4.8).
