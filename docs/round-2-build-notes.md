# Round 2 build notes: plan state, emails and the link rule

Branch `beta-2` (from `beta-1`, tag `beta-1-before-round-2`), 11 November 2026.
Figma: "LG WebCAF – Work in progress" (SxhsROJ8jrpAETpQ5Grvyr): Decide v8, Readiness and dashboard v5,
Access management v6 (A36), Assurance allocation v1 (AL30).

## Where the build prompt and the Figma panels disagreed (the panels were followed)

| Topic | Prompt | Built, per panel |
|---|---|---|
| D11b / D11e | Separate return page; D11e = no reason | D11b is D11 with the reason revealed (as built). D11e = nothing selected ("Select yes if you approve this plan"). D17 = empty reason. |
| D12 returned | D12 records Approved or Returned | D12 only records an approval (D13). Returns only come from D11. |
| in_progress tile | Action needed · Continue | In progress · Continue (R04b) |
| approved tile | Done | Completed. R05b is drawn without the Decide tile, so the approved dashboard stays R05 as built (the R04 table says the tile reads Completed: Figma to resolve). |
| setup_incomplete | Tile "Not started", hint says finish setup first | R03: Decide tile not shown (R04 panel, row 1). AS01 explains what is left. |
| with_assurer tile | Waiting | Waiting, plus "You can book your onboarding calls while you wait." and link (R04c) |
| N02 | Only on D05 | Also when an assurer is assigned to a plan that is already waiting (D06) |
| N08 | Approver changed while awaiting_approval | Also from D12b; sent only when the previous Approver was asked in the service (only they had N05) |
| Old N02 link | Dashboard | Assurer's councils list (AL30) with the R04e banner |
| A36 link | Their own dashboard | G01 when the person has no council |

## Decisions made in the build

- **D01 replaced by AS01 (13 November).** `no_approver` is folded into `setup_incomplete`. "Assessments" in the service navigation always opens AS01 (`/your-assessments`; `/assessments` belongs to the alpha prototype). AS01 lists the unfinished Setup tasks; AS01b shows the Decide tile; AS01c shows the approval line, View your plan and the cycle's assessments (rows go to "not built" until Prepare P01 is built). Previous assessments shows only for the example council (same rule as the R04 Last assessment row). The tile on AS01 starts Decide with `?from=assessments`, so Back on the first Decide screen (D23, or D02 without CNI) returns to AS01; otherwise to the dashboard. D-2026-144 (proposed), Q24.
- **Claim's own navigation** (07 Access granted and the reviewer screens) now also opens AS01 from "Assessments" and People (`/access`) from "People", so the navigation is the same on every page (13 November).
- **Banner rules beyond the R04e table.** N03/N04 after the plan was pulled back to in progress (Change plan): dashboard, no banner. N03/N04 when the plan is ready to send but not sent: D10/D10b (the screen for the state). N05 after an Approver change: A36 for the replaced Approver (D11 panel).
- **Someone at the council opening another person's email** (for example the CAF Lead opening N02): their own starting page, no banner. Not covered by the panels.
- **AL30 status lines.** "Plan sent for your review" and "Setup in progress" are from Figma. "Review sent on [date]" is the build's own (no Figma copy). AL30 needs design.
- **One council per session.** The "switch to the council in the link" rule is coded but cannot be exercised: the prototype holds one council at a time. A36 uses a labelled example council (Northmoor Borough Council (example)).
- **Research switch.** Session flag, off by default, turned on from /beta. Hides the example councils on /beta, N00, the "Research only" footer link, the person switcher, the dashboard state switcher and the Decide "Prototype only" blocks. Claim's "Prototype only" blocks are unchanged (Registration was out of scope).
- **Scenario data.** Scenarios 3 to 12 build the plan from the participant's setup: up to 3 highest-ranked systems, the organisation assessment if due, every date "I do not know yet". The assurer is a labelled "Example assurer, Example supplier". Assurer feedback and return reasons are generated from the participant's systems. Scenarios 6, 7, 9, 10 and 12 set the participant's Approver to use the service.

## Not built

- Choosing which council to switch to (multi-council sessions).
- N01 "also send if the assurer changes (reallocation)": wording to agree.
- N06 to the assurer (Q12).

## Figma housekeeping found during the build

- R04 Content panel, CHANGED IN THIS VERSION, said "Assessments in the navigation goes to Decide". Updated in Figma on 13 November to "goes to AS01 Assessments (from 12 November; it no longer opens Decide)".

## Figma v8 copy pass, 17 November 2026

The prototype now matches the screen wording on "08 Decide what to assess · v8" (screens, not the
Content panels). Where frames of the same page disagree, the main frame was followed:

- D02 heading "Select assessments for 2027 to 2028" is used in every state of the page (D02b, D02c,
  D15 and D22 frames still show "Which critical systems will you assess?").
- D04e still has "Your CAF Lead and Approver will be the same for every assessment this cycle." It
  was removed from D04 on 10 November, so it is not shown.
- D05/D07/D11/D21 plan headings differ by screen and are mirrored per screen. The warning ending:
  D05 "you can challenge that here"; D07, D11 and D21 "you can mention this in your feedback"
  (D11b and D11e say "challenge that here").
- D07e intro "The council has provided…" is older than D07 "Where possible, the council has
  provided…"; D07 followed. D07 services row reads "3 services" (D07e: "3 services, all in scope").
- D10b typo "nwo" read as "now".
- D11 reads "This assessment cannot be updated yet" (D11e: "You cannot update this assessment yet").
- D11e has two error summary lines for one question (Select Yes… / Select No…). Mirrored; GOV.UK
  usually has one message per question.
- D23e and D26e inline errors "Select a response from below" differ from their summary messages.
  Mirrored; GOV.UK expects the same message in both places.
- D12c link hint "For example: Meeting minutes…" kept as D12 ("For example, meeting minutes…").
- D22 "None this cycle — organisation assessment only" kept as D02 (comma).
- "Assessed 2025 to 2026" in Figma; the example seed holds a date ("Assessed March 2025"), shared
  with Setup, so it is not changed here.
- AS01c "Organisational assessment" (every other Decide screen says "Organisation assessment").
- AS01 lists Setup tasks 4 to 6 as "Identify your …"; the Setup task list itself says "Your …".
