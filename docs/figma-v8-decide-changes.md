# Figma v8: Decide what to assess, changes from the prototype

Prompt for updating Figma so it matches the coded prototype (branch `beta-1`, commits
`f985686` → `9b6e464`, 9 November 2026). Paste the prompt below into an agent with Figma access.

Covers three rounds of prototype changes from commit `f985686` onwards (the second and third are
under SECOND ROUND and THIRD ROUND in the prompt).

Decisions made (9 November 2026), so nothing is waiting on design before research:

- **Assessments after approval:** the assessments section is out of scope for now. Once the plan is
  approved, "Assessments" goes to the "not built in this prototype" page. No design needed yet.
- **Approver changes mid-cycle:** a plan waiting for a decision goes to the new Approver, and the
  CAF Lead is told once (banner on D27 or D12). An approved plan is unaffected.
- **Organisation assessment done before:** asked properly in Setup task 2 (new screen S03a).
- **"Non-critical":** kept as the fourth criticality level, matching Setup's impact page (S28),
  which already names four levels. Decide ranks it after Business supporting.

## Prompt

```
You are updating the Figma file mnOq3QRhTdiliuSuzQoNsX so it matches the coded GOV.UK prototype
(lg-webcaf-prototype, branch beta-1, commits f985686 → 9b6e464). Figma is the design source of
truth; the prototype has moved ahead and Figma must catch up.

SET-UP
- Duplicate the page "08 Decide what to assess · v7" to a new page "08 Decide what to assess · v8".
  Make every change on v8; do not edit v7.
- Use the existing GOV.UK Design System components and text styles already in the file. Match the
  layout, header (service navigation) and spacing of the existing D-frames exactly.
- Label every new frame "ADDED FROM PROTOTYPE" in the frame description, and every changed frame
  "CHANGED FROM PROTOTYPE" with a one-line note of the change.
- Do NOT design any "Prototype only" blocks (grey section break + "Prototype only" caption). They
  are research scaffolding, not service content.
- Example data in frames: use Westborough Borough Council, CAF Lead Jo Hart, Approver Cllr M Devlin
  (Cabinet Member for Resources), assurer K Osei, Bridewell, systems as already used in v7.

NEW FRAMES
1. D27 — Plan sent for approval (council / CAF Lead view, council service navigation)
   Place after D08. Shown when the Approver uses the service.
   - Green confirmation panel. Title: "Plan sent for approval". Body: "We have sent your plan to
     Cllr M Devlin"
   - H2 "What happens next"
   - Body: "Cllr M Devlin will review your plan in this service. We will tell you when they have
     approved it or returned it to you."
   - Link: "View or print your plan summary" (→ D21)
   - Primary button: "Back to your dashboard"
2. D28a — Plan approved (APPROVER view, minimal navigation: Sign out only)
   Place after D11. Shown after the Approver selects "Yes, approve the plan".
   - Panel title "Plan approved". Body "You have approved what Westborough Borough Council will
     assess this cycle"
   - H2 "What happens next"; body "We have told Jo Hart. They can now start the assessments."
   - Body "You do not need to do anything else."
3. D28b — Plan returned (APPROVER view, minimal navigation)
   - Panel title "Plan returned". Body "You have returned the plan to Jo Hart"
   - H2 "What happens next"; body "We have told Jo Hart and shared your reason with them. They will
     change the plan and send it to you again."
   - Body "You do not need to do anything else."
4. D23 error — no answer selected. Error summary + inline error:
   "Select yes if any of your critical systems are part of CNI"
5. D25 error — no system selected. Error summary + inline error on the autocomplete:
   "Select a critical system"
6. D12 error — Error summary listing both, inline errors on each field:
   "Enter the date the plan was approved" / "Select how the plan was approved"
   Also on D12 base: NO radio pre-selected for "How was the plan approved?".
7. D02 expanded — the "Show all" state: all ranked systems listed (6+), unrated system last,
   no cap hint or Show-all link.

CHANGED FRAMES
- D02 base (more than 5 systems): show the 5 highest-ranked systems, then hint
  "Showing your 5 highest-ranked systems. 6 critical systems have not been assessed yet." and link
  "Show all 6 systems". Inset "Your organisation assessment is included because your council has
  not completed one yet" shows whenever the organisation assessment is included (base and D22).
  "Already assessed" rows read "Assessed before" when no date is known.
- D22: when 2+ systems are unrated the warning reads "A and B are listed last because their
  criticality has not been rated yet. Rate them in Setup to rank them properly."
- D15: when the organisation assessment is NOT included, the error reads
  "Select at least one critical system" (no ‘None this cycle’ option exists).
- D19: replace the checkboxes with a bulleted list of the selected systems ("Name — criticality");
  keep "Continue with N systems" and "Change your selection".
- D26: unrated system's value reads "Not yet rated"; "Are any other critical systems part of CNI?"
  has no radio pre-selected.
- D05: between "Not included this cycle" and "Already assessed" show, when it applies, the warning
  "Check the systems that are not included" with bullets, e.g.
  "Adult social care is mission critical while a business supporting system is included" and
  "Traffic signals is CNI and is business critical while a business supporting system is included",
  then the existing advice paragraph; then the existing assurer warning
  ("Your assurer will review your plan before it goes for approval." + "Next, arrange a call…").
- Plan summary component (D07/D11/D21): same warning wording rule — one bullet per left-out system;
  "[System] is [its level] while a [least critical included level] system is included"; CNI joined
  with "and". Already assessed rows: "Assessed before · You cannot update this assessment yet".
- D07: "Organisation context" value "Completed" (or "Not completed"); Critical systems value
  "5 systems, all in scope, 1 not yet rated" when any are unrated.
- D09: "Continue" returns to the dashboard (annotate the flow arrow).
- D11: "Your assurer" section only when an assurer is assigned; "View feedback" action only when
  the assurer gave feedback.
- D13: "Approved by Cllr M Devlin on 9 November 2026" — when approved in service, the date is the
  day the Approver approved.
- D14: "Cllr M Devlin returned the plan on [date returned]".
- D21: "Assessment cycle starting [current year]"; "For approval by" line and the Assurer row are
  omitted when there is no Approver / no assigned assurer.

FLOW ANNOTATIONS (add as connector notes on the v8 flow)
- Entry to Decide requires a named Approver; otherwise the person goes to the Setup task list.
- D23–D26a appear only if a CNI sector was chosen in Setup S03 and the council has critical
  systems; otherwise entry goes straight to D02.
- D23 Yes with every system already CNI goes to D26; removing the last CNI system on D26 returns
  to D23.
- D05 → D06 when no assurer is assigned (new councils); D05 → D09 when one is.
- D07 with no feedback skips D08.
- After D07/D08: Approver uses the service → D27 (then the Approver uses D11 → D28a/D28b);
  Approver recorded only → D12 → D13.
- "Start this cycle"/"Continue" on the dashboard resumes Decide where the plan is (D06, D09, D08,
  D27, D13 or D14).

DASHBOARD (Readiness and dashboard page; R04 node 209:175, R05 node 209:200 — duplicate to v8 the
same way)
- R04: the Decide task shows blue "In progress" and the button reads "Continue" once anything has
  been answered in Decide. "Last assessment" row is omitted for a council with no previous
  assessment (first cycle).
- R05: a council in its first cycle shows each assessment as "Not started"
  ("Objectives A and D. Not started.", "Objectives B and C. Not started."). The reminder
  "Your pre self-assessment call is not booked yet." disappears once it is booked.
- Service navigation on dashboard, Setup and Decide: "Assessments" → Decide, "People" → People
  (access management).

SECOND ROUND (also on v8)
NEW FRAMES
8. D07a — The council's setup (ASSURER view, minimal navigation). Reached from the three "View"
   links on D07 (each jumps to its section). Read-only, no Change links.
   - Caption "ASSURER VIEW · Westborough Borough Council"; H1 "The council’s setup"
   - H2 "Organisation context": summary list — Sector context (Confirmed / Not confirmed),
     Council context (Provided / Not provided), CNI sector (e.g. Transport; omitted if not provided),
     How they identify services and systems (GovAssure Five Lens Model / Their own methodology /
     Not provided)
   - H2 "Essential services": bulleted list of service names ("No essential services added." if none)
   - H2 "Critical systems": summary list, key = system name, value e.g.
     "Business critical · CNI · Not yet assessed" / "Not yet rated · Not yet assessed" /
     "Mission critical · Assessed before" ("No critical systems added." if none)
   - Link "Back to the plan"
9. D26 error — nothing selected for "Are any other critical systems part of CNI?":
   "Select yes if any other critical systems are part of CNI"
10. D04 error variants (GOV.UK month-year pattern), per assessment fieldset:
   - "Enter the month and year for the organisation assessment" (both empty)
   - "The date for Revenues and benefits must include a month" / "...must include a year"
   - "Month must be a number from 1 to 12" / "Year must include 4 numbers"
   - "The date for the organisation assessment must be this month or in the future"
11. D12 error variants (GOV.UK date input):
   - "Enter the date the plan was approved"
   - "The date the plan was approved must include a day" / "...a month" / "...a year"
   - "The date the plan was approved must be a real date"
   - "The date the plan was approved must be today or in the past"

CHANGED FRAMES
- D12: "When was the plan approved?" is a GOV.UK date input (Day / Month / Year), hint
  "For example, 18 3 2027" (was a single text field). "Change" on the Approver row goes to the
  People › Approver step and returns to D12.
- D11: "View feedback" is a Details component under the assurer row that reveals the assurer's
  feedback in place (was a link away).
- D02 / D22: in the unrated warning each system name is a link to that system in Setup.
- D07: the three "View" links go to D07a sections.
- R04 (dashboard state switcher frame): the drawn R04 shows nothing chosen in Decide yet
  ("Not yet started", "Start this cycle") — keep as drawn.

FLOW ANNOTATIONS
- Once the plan is approved it is locked: every plan screen (D02–D12, D27) goes to D13.
  Only D13, D28 and D21 (plan summary) stay available. Changes are made by speaking to the
  assurer (as D13 says).

THIRD ROUND
SETUP (page "Set up your council"; duplicate it to a v8 page the same way)
12. S03a — NEW, task 2 "Organisational context", after S03 Your council context, before S04.
   - Caption "Organisational context"; H1 (radio legend as page heading)
     "Has your council completed a CAF organisation assessment before?"
   - Hint "The organisation assessment covers objectives A and D. Include assessments done before
     this service existed."
   - Radios: Yes / No / I don't know. Button "Continue" (→ S04).
   - Error: "Select yes if your council has completed a CAF organisation assessment before"
   - S30 Check your setup: new row under "Your organisational context":
     "Organisation assessment done before" — Yes / No / I don't know / Not answered — Change → S03a.
   - Task 2 on S01 is "Completed" only when S02, S03 and S03a are all done.
   - "I don't know" is treated as No (the organisation assessment is included this cycle).

DECIDE
13. D27 variant — "Your Approver has changed" (Approver who uses the service was replaced by another
    who does): Important notification banner above the panel, heading "Your Approver has changed",
    body "We have sent your plan to Priya Kaur instead. Cllr M Devlin no longer needs to approve it."
14. D12 variant — "Your Approver has changed" (replaced by an Approver who does not use the
    service): Important notification banner at the top, heading "Your Approver has changed", body
    "Sam Rivers is now your Approver. Cllr M Devlin no longer needs to approve your plan. Record
    Sam Rivers’s decision here when they have made it."
    Both banners show once.
15. D02 when the organisation assessment was done before: no "organisation assessment is included"
    inset, no "None this cycle" option, and "Already assessed" lists "Organisation assessment —
    Assessed before" first. D20 is shown when, in addition, every critical system was assessed before.
16. "Non-critical" (all three impact ratings Low) appears as a criticality value wherever levels
    show (D02 labels, plan summary, D07a), ranked after Business supporting and before "not yet rated".
17. D07a: add the row "Organisation assessment done before" (Yes / No / I don't know / Not answered).

FLOW ANNOTATIONS
- "Assessments" (navigation) after approval → "This part is not built in this prototype".
- Approver changed while the plan waits for a decision → the plan goes to the new Approver: D27 if
  they use the service, otherwise D12. No change to an approved plan.

When finished, list every frame you added or changed with its node ID so the prototype's template
comments can be updated to reference them.
```
