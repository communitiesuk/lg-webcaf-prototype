# Setup v6 — Stage 3 summary

Build of the "Set up your council" section from Figma file `mnOq3QRhTdiliuSuzQoNsX`, page 393:2 (Setup v6). Branch `beta-1`. All 40 screens built and verified (S43 parked/excluded). This is the list of deviations, "not verified" items, and the decisions still needed.

## 1. Full-journey check

- **39 Setup GET routes swept — 0 dead ends** (no 404/500).
- End-to-end flow works: task list → sector/council context → methodology → essential services (+functions, +remove) → shared infrastructure (+add/link/remove platform) → critical systems (add → corporate services → platforms → supplier → sharing → councils → hosting → hub → owner → ratings → recovery) → coverage check → check your setup → **setup complete**.
- Branching verified: S15 "Yes" → S16 vs "No" → S17; S47 (removable) vs S48 (blocked); S42 clears its coverage warning; S30 → S31 marks setup complete.

## 2. Accessibility — pa11y run (WCAG2AA, axe + HTML_CodeSniffer)

Ran pa11y 10 across **37 Setup pages** (every GET-reachable screen), both the axe and HTML_CodeSniffer runners, errors only. **43 errors total — all framework/library/chrome-level; none in the hand-written Setup form markup.** Three clusters:

| # | Count | Source | Real issue? |
|---|---|---|---|
| 1 | **37** (every page) | GOV.UK **footer crown SVG** — `role="presentation"` with semantic children (HTML_CodeSniffer F92/ARIA4). | Framework/chrome — **confirmed identical on non-Setup pages** (`/entry`, `/round-2/start`). Prototype-wide, from govuk-frontend's footer. Decorative; not introduced by Setup. |
| 2 | **4** (S12c add + edit) | `aria-allowed-attr` (axe) — govuk-frontend's radios conditional reveal adds `aria-expanded` to the controlling radio, which isn't spec-allowed on `role=radio`. | Standard govuk-frontend radios-with-reveal behaviour (any such page flags it). Low impact; AT ignores the unsupported attribute. |
| 3 | **2** (S18) | `H91.Select.Name` / `F68` (HTML_CodeSniffer) — accessible-autocomplete leaves a hidden `<select>` (its no-JS fallback) that static analysis sees as unlabelled. | **axe did not flag it** (it's hidden from the a11y tree) — static false-positive from the GDS autocomplete component. |

So: labels, fieldsets/legends, hints, error pattern, headings, focus, and page titles across all the Setup forms pass. The only flags come from the GOV.UK footer (chrome, whole prototype), the govuk radios-reveal attribute on S12c, and the GDS autocomplete's fallback select on S18.

**Nothing to fix in Setup content.** Optional follow-ups if you want a zero-error report: (a) the footer crown is a govuk-frontend/prototype-wide item to raise or accept; (b) warnings/notices (e.g. contrast) weren't included — can re-run with them. pa11y was installed transiently (not in package.json).

## 3. Deviations (build differs from the design — intentional, each flagged)

### Applied per your decisions
- **Seed reconciliation (decision 2)** — the design's per-screen counts are mutually inconsistent, so platforms are the single source of truth and every count is derived. One coherent dataset: **3 essential services, 5 platforms, 4 critical systems**. Consequences:
  - Hub shows 3 services (design's 4th "Highways and transport" dropped).
  - "Waste collection and recycling" (the S35 pick-list name) used everywhere; the design abbreviates to "Waste collection" on the hub/remove/why-no-system.
  - S39 platform counts derived (e.g. Entra "1 service and 3 systems" vs design "3 services and 4 systems").
  - S45 pre-ticks derived (Entra not linked to Adult social care in the coherent model).
  - S23 "Council website and forms" shows "Not linked to a service yet" vs design "Details to do".
  - S14 "Adult social care" splits into its 2 functions vs the design's single service-level option.
  - S21 inset names the derived hosting platform "Azure landing zone" vs design "Microsoft Azure".
  - S27 progress counter "2 of 4 systems" vs design "2 of 3".
  - S47 remove consequences derived (traffic: 1 platform, no supplier) vs design's 3-platform/supplier example.
  - S24 warnings derived (website unlinked instead of the removed "not sure yet"; "1 critical system" vs "2").
  - S24 concentration inset names the actual top platform "Council network and VPN" vs design's "Entra ID".
  - S30 shows the real mid-journey state ("4 added"; "1 Mission critical · 3 not yet rated") vs the design frame's fully-complete example.
- **Persona + service name (decision 3)** — Jo Hart · Westborough Borough Council; service navigation name overridden to "Assess and manage your council's cyber resilience" for /setup (the global config is "CAF for Local Government").
- **Holding page (decision 4)** — out-of-scope links (CAF Lead, Approver, Decide, Dashboard, footer) go to one `/setup/not-in-this-prototype` page.
- **Normalisations (decision 5)** — S04/S15/S17 "Continue" → "Save and continue"; S20/S45 link-later checkbox wording unified to "Nothing yet, I'll link this later" (S38's deliberate secondary button kept).
- **Obvious-fix copy (decision 6)** — S24 stale "not sure yet" warning dropped; S48 "mark as no longer in use" clause dropped; S31 repeated sentences de-duplicated.
- **Proposal partial (decision 7)** — removable "Proposal" note on S03, S12c, S15, S16, S24 (toggle in `components/setup-proposal.njk`).

### Design-fidelity / framework calls
- **Phase banner = "Beta"** to match the design (the Figma canvas is "Private Beta"); the rest of the prototype uses "Alpha". **Open decision.**
- **Status tags** all one blue (matched the design, not green/blue/grey). Tag **case** is GDS sentence-case (govuk-frontend 5 dropped uppercase); the design shows uppercase — kept the framework default.
- **Field question-labels bolded** (`govuk-label--s`) to match the design.
- **S12c** built with nothing pre-selected and the "Which supplier?" reveal collapsed (per your instruction — not copying the two-radios-selected quirk). The reveal is implemented as two conditional reveals (one each for "fully"/"partly") because GOV.UK conditional reveals allow one controlling input each. Edit-mode button is "Save and continue" (the single design frame only shows "Add").
- **Add-mode forms render blank**; the design frames show illustrative prefilled/edit states (including edit-only "Remove" links).
- **S30** uses H2 section headings + a "Confirm and finish setup" button — this diverges from the project's own check-answers convention (CLAUDE.md: no H2s, "Confirm and continue"), but matches the design.
- **S47/S48 reachability** — added an S14 edit mode (reached from the hub's "Change"/"Link it") because the design has no hub→edit→remove path.
- **S18 autocomplete** — real GDS `accessible-autocomplete` (progressive enhancement of a `<select>`). Loaded as a UMD global via a vendored script because the prototype kit serves `application.js` unbundled. Uses an **example council register** (8 fictional councils) as the search source.

## 4. Not verified / needs confirmation

- **Phase banner Alpha vs Beta** (see open decisions).
- **S03 "Upcoming IT transformation" reveal label** — "What is planned, and roughly when?" is inferred from the content sheet (the design never renders this reveal). Confirm wording.
- **S04 "What is the five-lens approach?"** and **S38 "What counts as core infrastructure?"** disclosure bodies — the design authored only the summaries. A minimal factual gloss is used (no fabricated detail). Needs real content.
- **S28 live criticality** — JS updates the inset as ratings change (mirrors the server formula); the server-rendered value is verified, the live update was not automated-tested.
- **S18 autocomplete append** — the enhancement is confirmed (select → autocomplete input); the full type → select → append interaction was not automated-tested.
- **Apostrophes** — straight apostrophes used (codebase convention); treated as equivalent to the design's typographic apostrophes in string diffs.

## 5. Decisions still needed (for you / Rosa / Ray)

1. **Phase banner:** Alpha (brief) or Beta (design)? One-line change in `layouts/setup.html`.
2. **Proposal screens to agree:**
   - S03 CNI wording + Ray's sector list (not checked against an official source; "Designated" not used) — **Ray**.
   - S15/S16 supplier "Yes, fully / Yes, partially" + the optional "who manages what" note — **Ray**. ("Required when partially" is parked.)
   - S12c "who manages it" fully/partly (added to match S15).
   - S24 proposal: setup can finish with unlinked items, but a system can't be chosen for assessment until linked to ≥1 service — **Rosa**.
3. **Disclosure content** for the five-lens and core-infrastructure help text.
4. **S30 state** — should it demo the design's fully-complete example (seed all systems complete), or keep showing the real mid-journey state?
5. **Council register** — replace the example councils with the real register (Claim integration).
6. **Accessibility** — run pa11y/axe (install), or a manual WCAG review?

## 6. Where things live

- Routes: `app/routes/setup.js` (+ registered in `app/routes.js`).
- Views: `app/views/pages/setup/**`, base layout `app/views/layouts/setup.html`, proposal partial `app/views/components/setup-proposal.njk`.
- Data: seed `app/data/seed/setup.js`, helpers `app/data/helpers/setup.js`, session-key contract `docs/setup-session-keys.md`.
- Autocomplete: `app/assets/javascripts/accessible-autocomplete.min.js` (vendored UMD) + CSS inlined in `app/assets/sass/application.scss`.
