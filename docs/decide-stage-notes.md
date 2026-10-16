# Decide ("Decide what to assess") — build notes, deviations and open questions

Source of truth: Figma file `mnOq3QRhTdiliuSuzQoNsX`, **Decide v6** page `393:2311` (README `393:2312`).
Reads systems/criticality/CNI/assessed-before from the Setup model (`req.session.data.setup`);
Decide's own cycle choices live under `req.session.data.decide` (seeded by `buildDecideSeed`).

## Routes built so far

| Screen | Node | Route |
|---|---|---|
| D23 any CNI? | 393:3118 | `/decide/cni` |
| D24 check none CNI | 393:3174 | `/decide/cni/check` |
| D25 which system is CNI | 393:3212 | `/decide/cni/add` |
| D26 CNI systems added | 393:3229 | `/decide/cni/added` (+ `/:id/remove`) |
| D02 / D22 / D15 which systems | 393:2337 / 393:3058 / 393:2834 | `/decide/systems` (GET base/unrated, POST handles error + branching) |
| D19 over-limit warning | 393:2938 | `/decide/systems/too-many` |
| D20 nothing left to assess | 393:2977 | `/decide/systems/nothing-left` |
| D03 confirm what cycle covers | 393:2415 | `/decide/confirm` |
| D04 / D16 timing (base / error) | 393:2447 / 393:2871 | `/decide/timing` |
| D05 review + send to assurer | 393:2504 | `/decide/review` |
| — plan summary partial | 316:1278 | `components/plan-summary.njk` |
| D06 waiting for an assurer | 393:2539 | `/decide/no-assurer` |
| D09 book onboarding calls | 393:3103 | `/decide/sent` |
| D07 assurer: review setup + plan | 393:2572 | `/decide/assurer-review` |
| D08 council: assurer feedback | 393:2617 | `/decide/feedback` |
| D11 / D17 approver: approve (base / error) | 393:2685 / 393:2905 | `/decide/approve` |
| D12 council: record approver decision | 393:2726 | `/decide/record-approval` |
| D13 council: cycle approved | 393:2769 | `/decide/approved` |
| D14 council: plan returned | 393:2800 | `/decide/returned` |
| D21 printable plan summary | 393:3013 | `/decide/plan-summary` |

## Shared-seed decisions (example data, not real)

- **5th critical system added — "Housing management system" (Mission critical).** The D02/D19/D22
  mocks all include it as a named example. Added to the Setup seed so the shared dataset renders
  Decide's "Which critical systems will you assess?" faithfully (two Mission-tier systems; the
  over-limit path). Setup counts are all derived, so they recompute — re-verified: S23 hub lists 5,
  S24 coverage reads "5 of your 5 critical systems". Linked to `plat-network` so it is not orphaned.
- **Per-system CNI** lives on `setup.criticalSystems[].cni` (set in Decide D23/D25/D26). Setup only
  captures council-level CNI (`councilContext.cni`). Urban traffic control seeded CNI.
- Shared example data Setup does not capture, added to the Setup seed for Decide: approver job title,
  assigned assurer (K Osei, Bridewell), organisation-assessment-history (`organisationAssessment.doneBefore`).

## Ranking rule (PROPOSAL, per D02)

Assessable systems (not assessed in a previous cycle) are ranked: criticality tier
(Mission > Business critical > Business supporting > Non-critical > unrated), and within a tier,
CNI first; otherwise stable by directory order. Implemented in `rankAssessableSystems`.
Flagged on-screen with a "Proposal" note. The alternative ("CNI outranks everything") is an open
policy call noted in the design — NOT implemented.

## Deviations from the mock (logged, not silent)

1. **D02 "Showing your 5 highest-ranked systems. 104 critical systems have not been assessed yet."
   hint + "Show all 104 systems" link — OMITTED.** They assume a large directory; the coherent seed
   has 4 unassessed systems, all shown. The cap logic is built (`SYSTEM_DISPLAY_CAP = 5`) and only
   renders when the assessable count exceeds the cap, so it stays off with the seed.
2. **D02 duplicate lead-in reproduced as drawn.** The design renders both a ranking **inset** and a
   near-duplicate **body** paragraph ("These systems have not been assessed yet…"). Kept faithful;
   recommend removing one. (Open question for content.)
3. **Cross-frame criticality inconsistency for "Housing management system":** D02 shows it Mission
   critical, D19 shows it Business supporting, D22 shows it unrated. The coherent seed rates it
   **Mission critical**; live screens use the real ranking. (Design mocks disagree with each other.)
4. **D22 example set differs from the mock.** The D22 mock shows only Northgate, Social care and an
   unrated Housing. Live renders the full real assessable set (so Urban traffic·CNI also appears).
   The unrated behaviour (listed last, "not yet rated", ranking warning) matches.
5. Visually-hidden `<legend>` added to the D02/D22 checkbox group (the mock has no legend) — an
   accessibility improvement, not a visible change.

## Batch 3 notes (confirm / timing / review + plan-summary partial)

- **Plan-summary partial** (`components/plan-summary.njk`) renders Included / Not included /
  (caller-supplied warning slot) / Already assessed from `buildPlanSummary`. Each screen passes its
  own `planWarning`. D05 passes "Your assurer will look at this… book your onboarding calls…".
- **Generic priority warning** ("Check what is not included: … is CNI, and … is mission critical
  while a business critical system is included.") is computed by `buildPriorityWarning` and matches
  the component spec verbatim with the seed. It is **reserved for D11** (Batch 4) — NOT shown on D05,
  because the D05 mock puts the assurer/onboarding message in that slot instead.
- **Ranking: within-tier CNI tie-breaker confirmed** by the user — no change.
- **Deviation — D03 "Not included this cycle" lists ALL not-included systems** (Housing management
  system, Urban traffic control). The D03 mock showed only Urban traffic (omitting Housing); listing
  both keeps D03 consistent with D05's plan summary. Logged.
- **Deviation — D05 duplicate line reproduced as drawn:** "Your assurer will look at this before it
  goes for approval." appears both inside the warning and as a plain paragraph above the button.
  Kept faithful; recommend removing the plain paragraph. (Content question.)
- **D04 proposal note added** for the "To be confirmed" timing option (data tracker currently expects
  a month) — per the inventory's [PROPOSAL] tag.
- **D04/D16 validation:** each included assessment must choose "Give a month" or "To be confirmed";
  a missing choice re-renders D04 with the error summary + per-assessment inline error (D16). A
  "Give a month" with empty month/year is stored as "to be confirmed" (prototype tolerance), matching
  the single error the design shows.
- **Onward target:** D05 "Send to your assurer" → `/decide/sent` (D09) when an assurer is assigned,
  else `/decide/no-assurer` (D06). Both are Batch 4 and 404 until then (expected).

## Batch 4 notes (assurer / send flow)

- **D07 assurer chrome** uses `applyDecideMinimalChrome` (only "Sign out", no council identity line,
  caption "ASSURER VIEW · {council}"). Verified isolated — no council nav or "Jo Hart" leak.
- **D07 plan summary shows the priority warning** (`buildPriorityWarning`) in the warning slot — this
  is where the generic "Check what is not included…" warning lives (D05 used the assurer message).
- **D08 branch on `approver.hasAccount`** (added to seed, default `true`): "Carry on, send for
  approval" → `/decide/approve` (D11); if `false` → `/decide/record-approval` (D12). Both Batch 5.
- **D05 "Send to your assurer" branch on `assurer.assigned`:** assigned → D09 `/decide/sent`; not
  assigned → D06 `/decide/no-assurer`. Seed has it assigned (→ D09); D06 verified by direct GET.
- **Seed additions:** `decide.assurerFeedback` prefilled with the assurer's comment (shown on D07
  textarea, quoted on D08 inset); `people.approver.hasAccount = true`.
- **D09 button is "Continue"** (the v6 frame carries the label; the content-sheet "no label" note is stale).
- **Deviation — D07 setup summary reads "5 systems, all in scope, all rated"** (mock said "4 systems").
  Coherent with the 5-system seed; "all rated" is true because every *assessable* system is rated
  (Council website is unrated but already-assessed, so out of the assessable pool).
- **Not-built links point to the holding page:** D07 View (AV02/AV03 read-only assurer views) and
  D09 Book/Update (AA03/AA04 assurance-activity bookings) are proposal pages, not in this build.

## Batch 5 notes (approval flow + printable plan summary)

- **D11 / D17 approver chrome** = `applyDecideMinimalChrome` (only "Sign out", no council identity,
  caption "APPROVER VIEW · {council}", no back link). Verified: 0 council-identity leak.
- **D11 shows the plan summary with the priority warning** plus a "Your assurer" row
  ("{assurer} · Commented on the plan").
- **D11 POST branches:** Approve → D13 `/decide/approved`; Return it with reasons + reason → D14
  `/decide/returned`; Return with no reason → D17 (re-render with error summary + inline error inside
  the reveal). No decision chosen → re-render unchanged.
- **D12** (council, when `approver.hasAccount` is false) records an offline decision → D13. Date field
  prefilled "18 March 2027" from the seed to match the mock.
- **D13** confirmation panel "Approved by {approver} on {date}"; **D14** Important banner + quoted
  return reason; **D21** printable plan summary with a "People" section and a "Print this page" button
  (`data-print-page` → `window.print()` handler in application.js).
- **Seed additions:** `decide.approval.date = "18 March 2027"`, `decide.approval.returnReason` example.
- **Deviation — D12 date format mismatch reproduced as drawn:** hint "For example, 18 3 2027" vs the
  value "18 March 2027". Kept faithful; no validation (prototype).
- **Not-built links → holding page:** D11 View (assurer comment), D12 Change (A29 access management),
  D13 "Prepare for assessment" (P01 Prepare v3).

## Stage 2 (build) — COMPLETE

All 21 Decide v6 screens built (D02–D26 minus the out-of-scope AV/AA/P01/A29 proposal pages, which
link to the holding page). Remaining: **Stage 3** — pa11y across Decide, end-to-end click-through in
the two CNI scenarios (flagged / not-flagged), and the collated deviations / not-verified /
unstated-rule list.

## Open questions (design implies, does not state)

- **CNI ranking into D02:** does CNI outrank criticality tier, or only break ties within a tier?
  (D24 wording note says "Ray/Asim to advise".) Built as tie-breaker within tier.
- **D02 duplicate lead-in** (deviation 2) — which paragraph stays.
- **"Up to three" is guidance, not a limit** — confirmed not enforced (D19 lets you continue).

## Still to build (later batches)

- D03 confirm (`/decide/confirm`), D04 timing, D05 review+send, D16 timing error — Batch 3.
- Assurer/approver screens (D06–D14, D17), plan-summary partial, D21 print — Batches 3–5.
  `/decide/confirm` is the current onward target from D02/D19 and 404s until Batch 3 (expected).
