# Setup v7 — Stage 1 inventory (no code yet)

Figma page "07 Set up your council — v7" (node 481:2290), file mnOq3QRhTdiliuSuzQoNsX.
Incremental change on the built v6. Scope: S02, S02a (new), S02b (new), S03, S05. Nothing else.

**Copy-source note:** for S02 / S02a / S02b the "Content" frames hold only the H1, the journey
routing and change-notes — **not** the body copy, labels, hints, button or banner text. That copy
is taken verbatim from the screen frames. Flagging because the brief said the Content frames hold
the verbatim copy; here they do not, so I read body copy from the screens. No screen-vs-Content
disagreement was found.

---

## S02 Your sector context — node 481:2362 (Content 481:2375)
Built: `pages/setup/sector-context.html`, routes GET/POST `/setup/sector-context`.

| Item | v6 (built) | v7 (Figma) | Change |
|---|---|---|---|
| Caption | Organisational context | Organisational context | none |
| H1 | Your sector context | Your sector context | none |
| Intro | "MHCLG has filled this in for all metropolitan borough councils. You cannot change it. Read it, then confirm you have." | "MHCLG has filled this in for all metropolitan borough councils. You cannot change it here. Read it, then confirm it looks right, or tell us if it does not." | **reworded** |
| Inset text | (sector description) | identical | none |
| New link | — | "Tell us if this is wrong" link, above the Confirm button, → S02a | **add** |
| Button | Confirm and continue → S03 | Confirm and continue → S03 | none |

**Components:** add one link (`govuk-link`) before the submit button. **Routes:** POST unchanged
(→ `/setup/council-context`). New: the link points to a new GET route for S02a (proposed
`/setup/sector-context/wrong`).

## S02a Tell us what looks wrong — node 482:2291 (Content 483:2407) — NEW
Proposed route: GET/POST `/setup/sector-context/wrong`. New template `pages/setup/sector-context-wrong.html`.

- Back link → S02 (`/setup/sector-context`).
- Caption "Organisational context"; H1 "Tell us what looks wrong".
- Body: "MHCLG fills in your sector context, so you cannot change it here. We will review what you tell us. You can still confirm your sector context and carry on."
- `govukTextarea` — label "What looks wrong?", hint "For example, a service your council does not deliver, or one that is missing."
- Button "Send" → S02b.
- Does **not** change the sector context. The comment is stored in session only (proposed key
  `setup.sectorContextComment`) and does not block setup. User can go Back and still confirm.

## S02b Comment received — node 482:2340 (Content 483:2425) — NEW
Proposed: same `sector-context.html` rendered with a `commentReceived` flag (S02 + banner), via a
redirect to `/setup/sector-context?comment=received` (kit-idiomatic, as used for other banners).
If you prefer a separate template/route I can do that instead.

- GOV.UK **success** notification banner at the top: heading "We have received your comment", body
  "We will review what you told us about your sector context. You can still confirm it and carry on."
- Below the banner, S02 exactly (same caption, H1, reworded intro, inset, "Tell us if this is wrong"
  link, Confirm and continue button).
- "Confirm and continue" → S03 (existing POST `/setup/sector-context`).
- Note from Content frame: this screen is a prototype addition, not in the wireframe comments.

## S03 Your council context — node 481:3415 (Content 481:3449)
Built: `pages/setup/council-context.html`, routes GET/POST `/setup/council-context`.

| Item | v6 (built) | v7 (Figma) | Change |
|---|---|---|---|
| Caption / H1 / intro | Organisational context / Your council context / "Tell us anything that would help…" | same | none |
| CNI | **checkbox** "Services in a critical national infrastructure (CNI) sector" + sector-list hint + reveal (inset about expecting CNI) | **select (dropdown)** labelled "Critical national infrastructure (CNI) sector", hint "Choose the sector, if any. Option list not yet agreed.", first option "Select a sector", placeholder options; **reveal removed** | **replace** |
| Operational Technology | **checkbox** "Operational Technology" + reveal with free-text "What operational technology does your council have?" + hint | **select (dropdown)** labelled "Operational Technology (OT)", hint "Choose the type, if any. Option list not yet agreed.", first option "Select a type", placeholder options; **reveal and free text removed** | **replace** |
| Position | CNI + OT were in the checkbox group | both dropdowns **above** the checkboxes, CNI first then OT | **move** |
| Group legend | "Do any of these apply to your council?" | "Do any of these **also** apply to your council?" | **reworded** |
| Checkboxes | cni, ot, recent-it, upcoming-it, lgr, (or) none | recent-it, upcoming-it, lgr, (or) none | **cni + ot removed from group** |
| Reveals (recent/upcoming/LGR) | present | unchanged | none |
| Free text | "Anything else your assurer or MHCLG should know? (optional)" | identical | none |
| Button | Save and continue → S04/methodology | same | none |

**Dropdown options (both):** NOT agreed. Use clearly-marked placeholders — empty first option
("Select a sector" / "Select a type") then "Placeholder sector 1", "Placeholder sector 2" (and
"Placeholder type 1/2" for OT). Code comment: lists are placeholders pending agreement. No real lists.

**Data keys** (`setup.councilContext`): the two dropdowns need string values, not the current
booleans. Existing keys:
- `cni` (boolean) → store the selected sector **string**. Reuse `cni` (type changes bool→string) or
  rename to `cniSector`.
- `operationalTechnology` (boolean) → store the selected OT type **string**. Reuse or rename to `otType`.
- `operationalTechnologyDetail` (string) → **remove** (OT free text gone), plus its form field `otDetail`.
- `recentItTransformation(+Detail)`, `upcomingItTransformation(+Detail)`, `lgr(+Detail)`,
  `noneOfThese`, `anythingElse` → unchanged.
- Form field `councilContextApplies` values drop `cni`/`ot`; new select fields proposed
  `councilContextCni` / `councilContextOt`.

**Data tracker flag (per Content frame + brief):** the tracker has one council context text field and
still needs updating to match these fields; OT free-text detail is being dropped; a single dropdown
cannot capture more than one CNI sector or OT type. Flagged, not resolved.

**Stale v6 proposal banner:** the page currently includes `components/setup-proposal.njk` with
"The critical national infrastructure (CNI) option wording and its sector examples are a v6 proposal,
not yet agreed." The CNI wording it refers to is being replaced by the placeholder dropdown (whose
hint already says "Option list not yet agreed"). → **Decision 3** below.

## S05 Tell us about your methodology — node 481:2429 (Content 481:2443)
Built: `pages/setup/methodology-detail.html`, routes GET/POST `/setup/methodology-detail`.

| Item | v6 (built) | v7 (Figma) | Change |
|---|---|---|---|
| Caption / H1 / inset | unchanged | unchanged | none |
| Field 1 | "How do you identify your essential services and critical systems?" + hint | unchanged | none |
| Link field label | "Link to your methodology document (optional)" | same | none |
| Link field hint | "A secure link your assurer can open, the same way you share evidence" | "A link your assurer can open" | **reworded (neutral)** |
| Example value | field empty by default (not seeded); Figma mock showed a secure-implying URL | Figma mock shows "https://westborough.example/methodology" | see Decision 4 |

**Note:** in the built v6 the link field is **empty** by default (`methodology.link` is not seeded);
the URL in Figma is an illustrative mock. Concrete code change = the hint text. See Decision 4 on the
example value.

---

## Route walk after build (per brief)
S01 (`/setup/task-list`) → S02 (`/setup/sector-context`) → S02a (`/setup/sector-context/wrong`) →
S02b (`/setup/sector-context?comment=received`) → S03 (`/setup/council-context`) →
S04 (`/setup/methodology`).

## Decisions I need before building (brief says: do not decide)
1. **"None of these" and the dropdowns.** Today "None of these" clears the checkboxes only. Should
   ticking it also **reset the CNI and OT dropdowns** to their empty first option? (Brief: ask, don't decide.)
2. **Data keys.** Reuse `cni` / `operationalTechnology` as strings (honours "existing keys", but type
   changes bool→string), or rename to `cniSector` / `otType`? Either way `operationalTechnologyDetail`
   is removed. Which do you want?
3. **Stale v6 CNI proposal banner** on S03 — remove it (the dropdown hint now carries "not yet agreed"),
   or leave it?
4. **S05 example value.** The built field is empty by default. Do you want me to seed the demo value
   `https://westborough.example/methodology` so the page shows the neutral example (matching Figma),
   or leave the field empty and only change the hint?

## Out of scope (confirmed not touched)
S35 grouping/theming/ordering, S02 update frequency/backend, S03 LGR-as-known, S18 shared-system alert.
