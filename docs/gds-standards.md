# GDS component standards (all sections)

The prototype uses the **official GOV.UK Design System Nunjucks macros** for interactive
components and follows GDS patterns as intended. This applies to **every section** — Claim,
Setup, Decide — and all new work.

## Rules

1. **Use the official macros** for form/interactive components:
   `govukRadios`, `govukCheckboxes`, `govukSelect`, `govukInput`, `govukTextarea`,
   `govukDateInput`, `govukButton`, `govukErrorSummary`, `govukInsetText`, `govukWarningText`,
   `govukDetails`, `govukBackLink`, `govukSummaryList`, `govukNotificationBanner`, `govukPanel`.
   Import with `{% from "govuk/components/<name>/macro.njk" import govuk... %}`.

2. **Radios / checkboxes legend:**
   - **One question on the page** → the H1 **is** the fieldset legend (heading-as-legend):
     `fieldset.legend.html` = `<span class="govuk-caption-l">…</span><h1 class="govuk-fieldset__heading">…</h1>`,
     `classes: "govuk-fieldset__legend--l"`. Do **not** render a separate H1 plus a
     visually-hidden duplicate legend.
   - **More than one question, or a content-rich page** (inset/warning/other inputs before the
     control) → H1 is the page heading, and the control's legend is **visually hidden**
     (`fieldset.legend.classes: "govuk-visually-hidden"`). This is the GDS-intended pattern.

3. **Descriptive text that helps answer the question** is the fieldset/field **hint**
   (`hint.text`), rendered grey — not black body text.

4. **Errors** use `govukErrorSummary` (top of the page, above the heading) plus the field
   `errorMessage`; the page `<title>` carries the "Error:" prefix and matches the H1.

5. **Page `<title>`** matches the H1 (the section layout overrides the `pageTitle` block).

## Aligned so far

- **Claim** — all screens built on the macros from the start.
- **Setup/Decide — the 9 files that had a visually-hidden legend duplicating the H1** were
  converted to the macros:
  - Heading-as-legend (single question): `setup/methodology`, `setup/essential-services/choose`,
    `setup/critical-systems/supplier`, `setup/critical-systems/shared-with-councils`,
    `setup/shared-infrastructure/for-service`.
  - Page heading + hidden legend via macro (multi-field / content-rich):
    `setup/critical-systems/which-supplier`, `setup/critical-systems/hosting`,
    `decide/cni`, `decide/systems`.
  - All POST flows re-verified unchanged; the intro text on the single-question pages now
    renders as the fieldset hint (grey) per GDS.

## Remaining (GDS-valid, hand-written markup — not deviations)

Other Setup/Decide fieldset pages (`council-context`, `critical-systems/impact`,
`corporate-services`, `add`, `councils`, `shared-infrastructure/platform`, `decide/cni-added`,
`decide/approve`, `decide/record-approval`, `decide/timing`) use **visible** `--m`/`--s`
legends — the correct GDS "page heading + question legend" pattern for multi-field and
add-another pages. Their markup matches the component output. They can be migrated to the
macros for source consistency, but they are not pattern deviations.
