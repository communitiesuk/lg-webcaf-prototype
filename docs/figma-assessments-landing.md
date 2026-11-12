# Figma prompt: Assessments section landing page (replaces D01)

Prepared 12 November 2026 on branch `beta-2`. Paste the prompt below into an agent with Figma access.
Not built in the prototype yet: the prototype follows once this is in Figma.

Why: "Assessments" in the service navigation currently drops people into the middle of the Decide
journey (D23, D02, D27, D14 or D01, depending on the plan). In the product, Assessments will be the
largest section (this cycle's assessments, progress, previous cycles), so the navigation item needs a
section landing page that always exists. D01 only covered one case (no Approver) that, because S30
will not finish setup without an Approver, can only be reached from the navigation during setup.
Removing navigation items until setup is finished was rejected (GDS assessors flagged items
disappearing and reappearing in alpha).

## Prompt

```
You are updating the Figma file SxhsROJ8jrpAETpQ5Grvyr ("LG WebCAF – Work in progress"). Figma is
the design source of truth for the coded GOV.UK prototype (lg-webcaf-prototype, branch beta-2).

TASK
Add a new section landing page, AS01 Assessments, in four states, and replace D01. Do not change any
other screen except where listed under CHANGES TO EXISTING SCREENS.

CONVENTIONS (match the file exactly)
- Work on the page "08 Decide what to assess · v8". Add a new row at the top of the page, above
  "Row · Which systems are CNI", using the existing "Row header" instance. Row title:
  "Assessments section (proposal)". Row description: "AS01: the landing page for Assessments in the
  service navigation. Replaces D01. New in v8, 12 November 2026."
- Each screen is a "Screen · <ID>" frame containing the screen frame ("<ID> council / <slug>") and a
  "Content panel", built exactly like the existing D-screens: same width, header (service
  navigation from "🧩 Shell: header, navigation, footer"), phase banner, footer, spacing and text
  styles. Use components from "15 GOV.UK Design System components" and "🧱 Template parts".
- Content panel sections, in this order, as on every other screen: tag (PROPOSAL), WHO SEES THIS,
  JOURNEY (FROM, NEXT, EMAILS where relevant), PURPOSE, CONTENT, RULES AND LOGIC, OPEN QUESTIONS,
  CHANGED IN THIS VERSION, DECISION LOG.
- Use the "Decide tile" component (page "05 Readiness and dashboard · v5", component set 100:327)
  as an instance. Do not redraw it.
- Example data, as used elsewhere on the page: Westborough Borough Council, CAF Lead Jo Hart,
  Approver Cllr M Devlin (Cabinet Member for Resources), assurer K Osei, Bridewell. Systems:
  Northgate Revenues and Benefits, Social care case management.
- Service navigation on every AS01 state: Dashboard, Your council, Assessments (current), People,
  Switch council, Sign out, with "Jo Hart · Westborough Borough Council".
- Copy below is a PROPOSAL for content design. Put it on the screens as written.

NEW SCREENS

1. AS01 council / assessments, setup not finished
   - H1: Assessments
   - Body: You need to finish setting up your council before you can choose what to assess.
   - Body: Still to do in Set up your council:
   - Bulleted list of the unfinished Setup tasks, each a link to that task. Example:
     "Confirm your Approver", "Your critical systems".
   - Button: Continue setting up
   - H2: Previous assessments (only when the council has one; leave it out of this example)
   Content panel:
   - WHO SEES THIS: Anyone with full access, before setup is finished.
   - JOURNEY: FROM ← Assessments in the service navigation, any page. NEXT → S01 Set up your council
     (Continue setting up), or the task linked in the list. → S30 Check your setup when only
     "Check and confirm" is left.
   - PURPOSE: Explain why a cycle cannot be planned yet and what is left to do, instead of a silent
     redirect. Replaces D01, which covered only a missing Approver.
   - RULES AND LOGIC: The list comes from the Setup task list (S01): every task not Completed, in
     task-list order, using the task names. A missing Approver appears as "Confirm your Approver".
     Shown until setup is finished (S30 Confirm and continue).
   - OPEN QUESTIONS: Q(new) overlap with the dashboard (see below).

2. AS01b council / assessments, this cycle not approved yet
   - H1: Assessments
   - H2: This cycle
   - Decide tile instance, State=Not started ("Start this cycle").
   - H2: Previous assessments
   - Link: View previous CAF results (→ R07)
   Content panel:
   - WHO SEES THIS: Anyone with full access, from setup finished until the plan is approved.
   - JOURNEY: FROM ← Assessments in the service navigation. NEXT → Decide (the tile's button: D23 if
     a CNI sector was chosen in Setup, otherwise D02, or wherever the plan is) → R07 Previous CAF
     results.
   - PURPOSE: The section's home while the cycle is being planned.
   - RULES AND LOGIC: The tile shows the same state as on the dashboard and follows the R04 state
     table (Not started, In progress, Waiting, Action needed). Previous assessments is shown only
     when the council has a previous assessment (same rule as the R04 Last assessment row).

3. AS01c council / assessments, plan approved
   - H1: Assessments
   - H2: This cycle
   - Body: Your plan was approved on 9 November 2026 by Cllr M Devlin.
   - Link: View your plan (→ D21)
   - Task list (as R05b "This cycle"), each row a link:
     "Organisation assessment" · hint "Objectives A and D." · tag NOT STARTED
     "Northgate Revenues and Benefits" · hint "Objectives B and C." · tag NOT STARTED
     "Social care case management" · hint "Objectives B and C." · tag NOT STARTED
   - H2: Previous assessments
   - Link: View previous CAF results (→ R07)
   Content panel:
   - WHO SEES THIS: Anyone with full access, once the plan is approved.
   - JOURNEY: FROM ← Assessments in the service navigation ← D13 Cycle approved. NEXT → each
     assessment: Prepare and start v4 (P01), then the assessment journeys when designed → D21 →
     R07.
   - PURPOSE: The way into this cycle's assessments. This is where the assessment journeys will
     start, so it is designed now to avoid reworking the navigation later.
   - RULES AND LOGIC: One row per assessment in the approved plan, in plan order. Tags follow R05.
     Changing an approved plan is out of scope (D-2026-137).

4. AS01d council / assessments, collaborator
   Do not draw. Add a note frame in the row: "Collaborator view of Assessments: not designed.
   Collaborators see R06 Your tasks. See open question." (OPEN QUESTIONS below.)

CHANGES TO EXISTING SCREENS
- D01: do not delete. Tag it "REPLACED BY AS01" and dim the frame (50% opacity). In its Content
  panel, CHANGED IN THIS VERSION: "12 November 2026: replaced by AS01 Assessments (setup not
  finished state). Setup cannot be finished without an Approver (S30), and an Approver can only be
  replaced, not removed, so D01 could only be reached from the navigation during setup."
- R04 Content panel, JOURNEY NEXT: remove "D01 if no Approver is confirmed". RULES AND LOGIC, state
  table row 2: remove "D01 if no Approver,".
- D23 and D02 Content panels, JOURNEY FROM: add "← AS01b Assessments (Decide tile)". Back on the first
  Decide screen returns to the page the person came from (dashboard or Assessments).
- D13 Content panel, JOURNEY NEXT: add "→ AS01c Assessments".
- Flow notes (page README / "Flow notes — v8"): "Assessments in the service navigation always opens
  AS01. It never opens a Decide screen directly. Decide starts from the Decide tile on the dashboard
  or on AS01."
- Every page whose service navigation shows Assessments: no visual change; note in the page README
  that Assessments → AS01.

OPEN QUESTIONS (add to the open questions list on the page, next free number)
- Overlap with the dashboard: the dashboard (R04/R05) and AS01 both show the Decide tile and this
  cycle's assessments. Proposed split: the dashboard is "what to do next" across the service; AS01 is
  everything about assessments (full list, previous cycles, and later outcome progress). Content
  design and research to confirm.
- Collaborator view of Assessments (AS01d).
- Should Previous assessments become its own list on AS01 instead of linking to R07?

DECISION LOG (proposed, next free D-2026 number)
- "Assessments in the service navigation opens a section landing page (AS01) in every state. Items
  are not hidden or shown by state (GDS alpha assessment feedback). Replaces D01."

When finished, list every frame you added or changed with its node ID.
```
