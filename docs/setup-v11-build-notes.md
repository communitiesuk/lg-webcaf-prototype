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
- **Task 2 "Your council's context"** is Completed once S02 is confirmed, S03 is saved and S03a is answered. S03 has no required questions and no error states in Figma, so leaving a question blank no longer holds the task at In progress. Stored as `councilContext.answered`.
