# Claim your council — Stage 3 summary

Final check of the Claim v3 build (Figma `mnOq3QRhTdiliuSuzQoNsX`, page 209:2382).
Stage 1 inventory: `claim-stage1-inventory.md`. Session keys: `claim-session-keys.md`.
Per-batch build notes + deviations: `claim-build-notes.md`. GDS standards: `gds-standards.md`.

## 1. Accessibility — pa11y (WCAG 2.2 AA, axe + HTML_CodeSniffer)

Ran pa11y across **18 Claim screens** (every GET-reachable service screen + the 2 prototype
controls), both runners, errors only. **22 errors total — all framework / component-level;
none in authored content.** Two clusters, identical to Setup/Decide:

| # | Count | Source | Real issue? |
|---|---|---|---|
| 1 | **18** (every page) | GOV.UK **footer crown SVG** — `role="presentation"` with semantic children. | Framework/chrome, prototype-wide. Not introduced by Claim. |
| 2 | **4** (02 find, 09 which-organisation) | accessible-autocomplete's **hidden fallback `<select>`** seen as unlabelled by HTML_CodeSniffer. | GDS-component false positive; **axe does not flag it**. Same as Setup S18 / Decide D25. |

Everything built with the official GDS component macros, so labels, fieldsets/legends,
hints, the error-summary + inline-error pattern, headings, page titles and summary lists pass.

Error-state screens **12 / 14 / 15** are POST-only re-renders not in the GET sweep. They were
verified structurally during the batches (error summary + `govuk-error-message` + correct
summary→field links) and reuse the identical GDS error components that pass on the base pages.

## 2. End-to-end walk — every scenario, no dead ends

| Scenario | Path | Ends at |
|---|---|---|
| First to join | 01 → 03 → 04 → 06 → approve | **07** (access granted) |
| First to join (reject) | … 06 → reject | **16** → "Claim a different council" → 02 |
| First to join (sign in again) | … 06 → still-checking | **18** (waiting) |
| Joining others | 02 → 03 → 05 | **07b** (joined, instant) |
| Unrecognised, shared/managed | 02 → 03 → 08 → 09 → 11 → 06 | pending → 07/16/18 |
| Unrecognised, direct | 02 → 03 → 08 → 11 → 06 | pending → 07/16/18 |
| Unrecognised, something else | 08 → 10 | **10** (contact, back to 02) |
| Council not in list | 02 → 13 | **13** (back to 02) |
| Already have access | 02 → 17 | **17** (dashboard / 02) |
| Domain matches >1 | 02 → 19 → 03 | continues the journey |
| Errors | 02→12, 03→14, 08→15, 09 empty, 19 empty | re-render with error |

Terminal / boundary pages: success (07, 07b, 17) and the waiting states (06, 18) exit to the
**holding page** (`/setup/not-in-this-prototype`) for the dashboard, guidance and "Prepare" —
the edge of this prototype. The dead-end-by-design pages (10, 13, 16) loop back to 02. No 404s
or 500s anywhere in the built journey.

## 3. Consolidated deviations (intentional, each flagged)

1. **"Claim" not "Register"** throughout (your decision) — full before/after mapping in the
   per-batch notes. "registered your email domain" (16) kept, as that is domain registration.
2. **Built with the official GDS component macros**; single-question radio pages use
   **heading-as-legend** (01, 08, 19 content-rich = page-heading + hidden legend). Descriptive
   text under a question renders as the fieldset **hint** (grey).
3. **Page `<title>` wired to match the H1** (the kit never set it — setup/decide/beta still
   render "GOV.UK"); error pages carry the "Error:" prefix.
4. **Added required validation** on 01, 09 and 19 (no error frames drawn; required questions).
5. **No "Change" link on the Email row** (04/05/11) — One Login identity; you confirmed this
   over the rendered 04/05 frames (which drew a Change link).
6. **Unrecognised + "directly" routes to 11** (not the drawn 08→03 loop); unrecognised is
   **always reviewed** — your Stage 1 decision 4. No instant path for an unrecognised email.
7. **"My council is not in the list" is a link** to the separate page 13 (mock drew a triangle).
8. **12/14 error re-renders keep the inset + email line** the error mocks omitted (same screen).
9. **"Read the guidance" / "Go to your dashboard" → the holding page** (external guidance and the
   dashboard are not in this prototype).
10. **19 pre-selects the council picked on 02**; "I support all of these councils" records the
    first matching council (`claimsAllCouncils` flag), per the proposal's "once" assumption.
11. Chrome: "Sign out" renders inline via the standard `govukServiceNavigation`; 07/07b/17 use
    the granted chrome (full nav + "Name · Council").
12. Example data: fictional `.gov.uk`-style domains (your decision), labelled "Example data, not real".

## 4. Not verified / simulated (prototype limits)

- **No real approval, email or admin.** MHCLG review is simulated by the prototype-only control
  on 06 (approve / not approved / still checking). No oversight dashboard is built.
- **12 / 14 / 15 error states** not in the automated pa11y sweep (POST-only); verified structurally.
- **"All councils" claim** (19 "I support all of these councils") records one council as the
  record — a prototype stand-in for an undecided model.

## 5. Rules the design does not state (listed, not invented)

- **No review SLA** — 06 and 18 cannot say how long the check takes.
- **Rejection reason wording and challengeability** (16) — open (flagged on-screen as a Proposal).
- **Approve/reject email** — promised on 06/16, not designed.
- **Who approves and how** — MHCLG on an oversight dashboard; not built here.
- **Merged / split councils** — not designed (out of scope).
- **No revoke-access** once granted — out of scope.

## 6. Decisions still needed from you

1. **Frame 19 (open question):** does a shared-service person claim **once** for several councils
   (current build) or **separately** for each? If separately, 19 changes or is removed.
2. **Rejection (16):** how MHCLG words reasons, and whether a decision can be challenged.
3. **Review SLA** — so 06/18 can state a timeframe (or confirm they stay silent on it).
4. **Approve/reject email** content (not designed).
5. Final content-design sign-off on the **"Claim" wording** mapping across all screens.
