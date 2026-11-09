# Figma v8: Decide what to assess, changes from the prototype

Prompt for updating Figma so it matches the coded prototype (branch `beta-1`, commits
`f985686` → `f2653c4`, 9 November 2026). Paste the prompt below into an agent with Figma access.

Screens the journey still needs but that are **not built yet** (design first):

- an Assessments landing page for after the plan is approved (the "Assessments" link currently lands on D13)
- a locked plan after approval (D02 can still be opened by URL)
- what happens if the Approver changes during a cycle

## Prompt

```
You are updating the Figma file mnOq3QRhTdiliuSuzQoNsX so it matches the coded GOV.UK prototype
(lg-webcaf-prototype, branch beta-1, commits f985686 → f2653c4). Figma is the design source of
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

When finished, list every frame you added or changed with its node ID so the prototype's template
comments can be updated to reference them.
```
