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
| setup_incomplete | Tile with "finish setup first" | R03: Decide tile not shown |
| no_approver | Tile hint "Confirm your Approver first" | Tile as Not started; Start this cycle opens D01 |
| with_assurer tile | Waiting | Waiting, plus "You can book your onboarding calls while you wait." and link (R04c) |
| N02 | Only on D05 | Also when an assurer is assigned to a plan that is already waiting (D06) |
| N08 | Approver changed while awaiting_approval | Also from D12b; sent only when the previous Approver was asked in the service (only they had N05) |
| Old N02 link | Dashboard | Assurer's councils list (AL30) with the R04e banner |
| A36 link | Their own dashboard | G01 when the person has no council |

## Decisions made in the build

- **D01 reachability.** S30 will not finish setup without an Approver, so "setup finished, no Approver" cannot happen. `no_approver` is checked before `setup_incomplete`, so the Assessments link shows D01 during setup. The dashboard tile never shows D01 (the dashboard is R03 until setup is finished). Relates to D01 panel, Q18.
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
