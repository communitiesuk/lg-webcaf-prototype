# Decide ("Decide what to assess") — Stage 3 summary

Verification of the Decide v6 build (Figma `mnOq3QRhTdiliuSuzQoNsX`, page 393:2311).
Build decisions and per-batch notes live in `decide-stage-notes.md`; this is the Stage 3 pass:
end-to-end click-through (both CNI branches + alternative paths), pa11y, and the consolidated
deviations / not-verified / open-question list.

## 1. End-to-end click-through

All journeys walked live (curl, following each redirect). Every step landed where the design's
FROM/NEXT routing says it should.

**Scenario A — CNI flagged in Setup (`councilContext.cni = true`, default seed)**
- D23 shows the CNI reminder inset. "No" → **D24** (consistency check) → "none are CNI" → **D02**.
- D23 "Yes" → **D25** → add a system → **D26** → "No more" → **D02**.
- Council tail: D02 → D03 → D04 → D05 → **D09** (assurer assigned) → D07 (assurer) → D08 →
  **D11** (approver has account) → **D13** (approved). ✓

**Scenario B — CNI not flagged (`councilContext.cni = false`)**
- D23 shows **no** inset. "No" → **D02 directly** (D24 correctly skipped). ✓
- D05 → **D06** (no assurer, `assurer.assigned = false`) — the waiting state. ✓

**Alternative approval branch — approver has no account (`approver.hasAccount = false`)**
- D08 "Carry on" → **D12** (record offline decision) → **D13** (approved). ✓

(The flag flips above were temporary; the seed is back to its canonical state:
`cni = true`, `assurer.assigned = true`, `approver.hasAccount = true`, Housing = Mission critical,
selected systems = Northgate + Social care.)

## 2. Accessibility — pa11y (WCAG2AA, axe + HTML_CodeSniffer)

Ran pa11y 10 across **19 GET-reachable Decide screens**, both runners, errors only.
**25 errors total — all framework / library / chrome-level; none in the hand-written Decide markup.**
The same three clusters documented for Setup:

| # | Count | Source | Real issue? |
|---|---|---|---|
| 1 | **19** (every page) | GOV.UK **footer crown SVG** — `role="presentation"` with semantic children (F92/ARIA4). | Framework/chrome, prototype-wide. Decorative; not introduced by Decide. |
| 2 | **4** (D04 timing ×3, D11 approve ×1) | `aria-allowed-attr` (axe) — govuk-frontend's radios conditional reveal adds `aria-expanded` to the controlling radio. | Standard govuk-frontend radios-with-reveal behaviour. Low impact; AT ignores the attribute. |
| 3 | **2** (D25) | `H91.Select.Name` / `F68` — accessible-autocomplete's hidden fallback `<select>` seen as unlabelled by static analysis. | **axe did not flag it** (hidden from the a11y tree) — GDS-component false positive, identical to Setup S18. |

Labels, fieldsets/legends, hints, the error-summary + inline-error pattern, headings, page titles and
the plan-summary/summary-list markup all pass. **Nothing to fix in Decide content.**

Error-state screens (D15 no-selection, D16 timing error, D17 return-without-reason, D22 unrated) are
POST-only re-renders not reachable by a GET sweep. They were verified structurally during the batches
(error summary + `govuk-error-message` + `govuk-form-group--error` present, correct summary→field
links, reveal kept visible) and reuse the identical GDS error components that pass on the base pages.

## 3. Consolidated deviations (build differs from the mock — intentional, each flagged)

1. **5th critical system added — "Housing management system" (Mission critical).** The design's own
   example in D02/D19/D22; added to the shared Setup seed so Decide renders faithfully. Setup counts
   are derived, re-verified (S23 lists 5, S24 "5 of your 5"). → `decide-stage-notes.md`.
2. **D02 "Showing 5 highest-ranked / 104 systems / Show all 104" hint + link — omitted.** Large-directory
   assumption; the coherent seed shows all 4 unassessed systems. Cap logic built, inactive with the seed.
3. **D02 duplicate lead-in reproduced as drawn** (ranking inset ≈ body paragraph). Faithful; a content
   question — recommend removing one.
4. **D03 "Not included" lists all not-included systems** (Housing + Urban traffic); the mock omitted
   Housing. Coherence fix so D03 agrees with D05's plan summary.
5. **D05 duplicate line reproduced** ("Your assurer will look at this…" appears in the warning and as a
   plain paragraph). Faithful; content question.
6. **D07 setup summary reads "5 systems, all in scope, all rated"** (mock said 4). Coherent with the seed.
7. **D12 date format mismatch reproduced** (hint "18 3 2027" vs value "18 March 2027"). Faithful; no validation.
8. **Cross-frame criticality for Housing** differs across mocks (Mission in D02, Business supporting in
   D19, unrated in D22). Seed rates it Mission; live screens use the real ranking.
9. **Proposal notes added** (removable, shared Setup partial): D23/D24 (CNI wording), D02/D19 (ranking +
   "up to three" guidance), D04 ("To be confirmed" option).
10. **Accessibility improvements over the mock:** visually-hidden `<legend>` on the D02/D22 checkbox group.

## 4. Open questions (design implies a rule but does not state it)

- **CNI ranking into D02** — resolved by the user: CNI is a **within-tier tie-breaker** (not an
  outright override). Implemented accordingly.
- **D02 duplicate lead-in** and **D05 duplicate line** — which copy stays (content decision).
- **"Up to three" is guidance, not a limit** — confirmed not enforced (D19 lets you continue).

## 5. Not built (design defers these to proposal/other pages — all link to the holding page)

- AV02 / AV03 — assurer read-only views (D07 "View").
- AA03 / AA04 — onboarding-call bookings (D09 "Book" / "Update").
- P01 — Prepare for assessment (D13).
- A29 — access management / change Approver (D12 "Change").

## 6. Where things live

- Routes: `app/routes/decide.js` (registered in `app/routes.js` after Setup).
- Helpers: `app/data/helpers/decide.js` (chrome, CNI, ranking, plan summary, priority warning).
- Seed: `app/data/seed/setup.js` → `buildDecideSeed()` + Decide fields on the Setup seed.
- Templates: `app/views/pages/decide/*.html`; base layout `app/views/layouts/decide.html`.
- Shared partials: `components/plan-summary.njk`, `components/setup-proposal.njk`.
- Print handler + system autocomplete: `app/assets/javascripts/application.js`.
