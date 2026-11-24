# Setup v11 build notes (pass 1), 24 November 2026

Branch `beta-3` (from `beta-2`). Source: Figma "07 Set up your council · v11 (content review)".
Not built: S43 (Parked), S14b and S52b (alternative row), anything dimmed.

## Decisions agreed on 24 November

1. New branch `beta-3`; research page "Round 3".
2. Field names Decide reads are kept; contents follow the v11 model.
3. Each link is stored once (see `docs/setup-session-keys.md`).
4. Where the prompt and a panel disagreed, the panel was followed:
   - S36: a service with nothing added starts the guided sequence (S10, S38, then S37); otherwise the row opens S37.
   - S24: "Add the missing details" opens S52 for the first system; "Go to the first missing detail" opens S27.
   - S24: a service with no system links to its service page (S37b), with "Record why none is needed" (S42) as a second action.
   - S24: no "scope" issue (S15 v11 note).
   - S47/S48: removal is also blocked for a system assessed before.
   - S02: the intro still ends "or let us know what looks different" (labelled in Figma).
5. S01 tasks 4 to 6 are Completed when every row on their list is Completed:
   - a service has a function, its infrastructure is linked or marked "link later", and it has a system or a reason;
   - a platform is linked to something;
   - a system has an owner, all three ratings and a link to a service.
6. Decide counts only "Yes - within the last 3 years" as already assessed (S03a hint).
7. Council type comes from the council register:
   - Metropolitan → metropolitan borough, and so on.
   - The made-up "Borough" councils count as metropolitan boroughs.
   - Combined Authorities count as single tier until decided.
   - City of London and the Isles of Scilly are recognised by name.

## Other disagreements and choices

- **S37d "Add a critical system".** The prompt said it returns to S37d. The S37d panel (Rosa) and S37c say it returns to the service page, with the banner. The panel was followed.
- **S37c banner.** The wording follows what was done: added, changed, linked or updated. Only the "linked" wording is drawn: "[System] is now linked to [Service]" with "Check its details in the Critical systems section." The others are written in the same style:
  - "[Function] has been added to [Service]"
  - "The function has been changed to [name]"
  - "Core infrastructure for [Service] has been updated"
  - "Critical systems for [Service] updated: …"
- **S35.** Unticking a listed service on a return visit removes it only if nothing is added to it yet. Services with anything added stay, and are removed on S46.
- **S35/S09 type wording.** City of London and Isles of Scilly read "single-tier councils" (no wording in Figma).
- **S10b "Change".** The prototype adds a "Change a function" heading and "Save and continue". Only "Add a function" is drawn.
- **Three error messages not drawn in Figma:**
  - S10b: "Enter the name of the function"
  - S12c: "Enter the name of the platform"
  - S14: "Enter the name of the system"
- **S03 "Upcoming IT transformation".** Its text box is labelled "What is planned, and roughly when?" Figma only draws the "Recent" box.
- **S03 CNI list.** The national CNI sectors without Government (Chemicals, Civil nuclear, Communications, Defence, Emergency services, Energy, Finance, Food, Health, Space, Transport, Water), plus "Not applicable". Data infrastructure (designated in 2024) is not in the list. Q26 (multi-select) is still open, so the select stores one sector.
- **S23 hint.** The drawn hint on the Completed Northgate row ("Who is accountable for your council's CAF") looks like a Figma error. The row shows the owner and criticality instead.
- **S27.** Goes on to S28 when the system has no ratings yet, otherwise back to S52. The S27 and S28 panels disagree on this.
- **S48.** The paragraph follows the reason: in the approved plan, or assessed before. Figma draws both.
- **S47.** Suppliers nothing else uses are removed. A removed system also leaves this cycle's unapproved plan.
- **S03ae.** The frame shows three radios. It is built with S03a's four, as the v11 panel says.
- **Figma copy kept as drawn:** "Revenues and benefits" (S35 list) and "Revenue and benefits" (S09 hint, S37 example).
- **AS01** lists tasks 4 to 6 as "Identify your …". Task 2 keeps its new name, "Your council's context".

## Labelled copy built as drafted (FOR CONTENT REVIEW / DRAFT LIST)

- S02 intro (sector context).
- S03:
  - CNI hint;
  - the OT list and hint (Chris to confirm, Q19);
  - the IT transformation intro and "Examples of IT transformation".
- S35, S35b and S40: the tiered lists (DRAFT LIST, Q36), the definition and the guidance link.
- S37, S37b and S37c: layout, copy and banner.
- S37d: the screen and the "Add a critical system" button.
- S14: the "Add or change your essential services" link.
- S36, S39 and S23: task list rows.
- S39a: layout and copy.

## End-to-end usability pass, 24 November 2026

Fixed before research. Each was checked by following the journey in the prototype.

- **The S24 walk** ("Go to the first missing detail") skips pages already opened in the same walk. A question saved without an answer moves on instead of opening again.
- **S12c "Add a supplier that is not listed"** keeps what was typed: name, type, who manages it. The new supplier is selected on return.
- **S14 "Add or change your essential services"** keeps what was typed. Save and continue on S36 then returns to the form, with the answers still there.
- **Changing an existing system (S14) or platform (S12c).** The heading is the system or platform name, not "Add a critical system" or "Add a core infrastructure platform". **Not in Figma; needs a frame.**
- **S36 "Add an essential service"** opens S35, with the services already added ticked. The S36 panel says S09, but then nothing leads back to the full list once any service exists. S35 still has "Add an essential service not listed" (S09). **Deviation from the S36 panel.**
- **S35 on a return visit.** A listed service that has something added is kept if unticked. A hint under it says to remove it from its own page. **Not in Figma.**
- **S09** never adds a service twice. A name from the tier list counts as a listed service.
- **S30 Change links to S36, S39 and S23.** These lists remember S30. Their back link and main button go back there ("Back to check your setup", **not in Figma**). This is cleared on the task list and on S30.
- **Back links:**
  - S04 goes back to S03a when reached from it.
  - S09 goes back to S35 when opened from S35.
  - S16 keeps where S52 returns to.
- **S24a** has no inset, as drawn.
- **S03 answers are required** (MHCLG, 24 November): a CNI sector or "Not applicable", the OT types or "None of these", and "Do any of the following also apply", with text for each box ticked. "Anything else" stays optional. Task 2 is Completed once S02 is confirmed, S03 is saved without errors, and S03a is answered.
  The error copy below was written in the build. **Not in Figma yet; Michael to add:**
  - "Select a CNI sector, or select 'Not applicable'"
  - "Select the types of operational technology your council runs, or select 'None of these'"
  - "Select if any of these apply to your council, or select 'None of these'"
  - "Enter what the recent IT transformation was, and roughly when"
  - "Enter what the upcoming IT transformation is, and roughly when"

## Guidance links (security.gov.uk), checked 24 November 2026

The guidance headings have no anchor IDs, so the links use text fragments (`#:~:text=`). These scroll to and highlight the heading in Chrome, Edge, Safari 16.1+ and Firefox 131+. Other browsers open the top of the page.

| Screen | Link | Goes to |
|---|---|---|
| S04 | Read the guidance on identifying your essential services and critical systems | Prepare › Set your scope › "What setting your scope involves" (Q28) |
| S04 | What is the five lens approach? › guidance | Prepare › Use the five lens approach |
| S35, S35b, S40 | Read the guidance on essential services | Prepare › Identify your essential services › "How to identify your essential services" |
| S39 | Read the guidance on identifying core infrastructure | Prepare › Use the five lens approach › "3. Outline any core underlying infrastructure" |
| S13 | Read the guidance on identifying critical systems | Prepare › Identify your critical systems › "How to identify your critical systems" |

Not changed: Claim's "Read the guidance" buttons go to the guidance home page (pass 2).

## Adding a critical system asks every question (24 November 2026, after research)

Round 1 research: people landed on S52 straight after S14 and saw "Not answered" for questions they had never been asked. **Decision (Michael):** after "Add this system", the questions follow one page at a time, then S52 as a check-answers page.

- **Order:** S14 → S19 → S20 → S15 (→ S16 if Yes) → S17 (→ S18 if Yes) → S21 → S27 → S28 → S52. This matches the S52 panel, which has S52 reached from S28 at the end of adding. It replaces the S14 panel's "S14 → S52".
- **Back links** follow the sequence, including the branches.
- **Every question page has "Save and come back later"** (secondary button). It saves the page, then goes to S23, where the system shows In progress. **Not in Figma.**
- **Adding a system from a service page** (S37d "Add a critical system") runs the same questions, then returns to the service page with the S37c banner (S37 return rule).
- **Change links on S52** still open one question and return to S52. The S24 walk is unchanged.
- **Not built:** S52b ("complete the rest in any order"), the drawn alternative for Q33.
- **"Continue adding details" on S52** (not in Figma). Shown while any question is unanswered, as the primary button, with "Return to critical systems" as secondary.
  - It opens the first unanswered question and skips any later ones already answered.
  - It returns to S52, keeping where S52 itself returns to (service page or S24).
  - "Save and come back later" is offered on each page and returns to S52.

## Second content review (Figma page "v11 (content review) 2"), applied 24 November 2026

That page is a copy of v10 with new review edits. Only edits made since v10 and not yet in v11 were applied. Where the copy still had v10 content that v11 changed on purpose, v11 was kept: the S02b link, the OT list, the IT examples, the S15 scope inset, the S24 scope row and the example system names.

**Applied:**
- **"Core infrastructure" wording:**
  - S12c (heading, labels, buttons);
  - S38 (heading no longer lower-cased, "Add infrastructure");
  - S39 (intro reordered, guidance link in the middle);
  - S39a, S45, S49, S20;
  - S46 ("core infrastructure components").
- **S02:** the shortened statement and the new intro.
- **S03:**
  - the intro;
  - the OT hint;
  - the IT legend is now "Recent or planned IT changes", and its error now reads "Select if your council has recent or planned IT changes, or select 'None of these'".
- **S03a:** "CAF for local government" in the question, the extra hint sentence, and a comma in the inset. S14 also says "CAF for local government".
- **S28:** the impact definitions in the Details component.
- **Smaller edits:**
  - S37 family intro;
  - the S37c banner's second line;
  - S36 and S50 "linked yet";
  - S35, S35b and S40 "services that";
  - S05 full stop;
  - S19 "support";
  - S30 "System criticality".
- **Fixed rather than copied:**
  - "infrasructure" (S12c);
  - "relies on" → "rely on" (S39);
  - "more the 3 years" (S14);
  - "organisational’" (S03ae).
- **Changed for consistency:** the S12c error is now "Enter the name of the infrastructure".

**Not applied, for Michael:**
- The S28 recovery prompt and its guidance link. v11 removed the prompt.
- The S03ae hint about choosing "Yes". It does not match S03a, and its rule disagrees with the build: "more than 3 years ago" is included automatically.
- "Not Applicable" with a capital A in the S03 hint. The option label is "Not applicable".
