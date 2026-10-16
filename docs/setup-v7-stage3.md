# Setup v7 — Stage 3 verification

Figma page "07 Set up your council — v7" (481:2290), file mnOq3QRhTdiliuSuzQoNsX.
All copy verified live against the Figma screen/Content frames. Not committed.

**Copy-source note:** for S02 / S02a / S02b the Content frames hold only the H1, journey routing and
change-notes. Body copy, labels, hints, buttons and banner text were taken verbatim from the **screen**
frames. "Copy matches" below means: H1 + routing match the Content frame, and body copy matches the
screen frame. No screen-vs-Content disagreement was found.

## Verification table

| Screen | Figma node | Built route | Copy matches | Differences / notes |
|---|---|---|---|---|
| S02 Your sector context | 481:2362 (Content 481:2375) | GET/POST `/setup/sector-context` | **Yes** | Intro reworded verbatim; new "Tell us if this is wrong" link → S02a; Confirm and continue → S03. Inset text unchanged. |
| S02a Tell us what looks wrong | 482:2291 (Content 483:2407) | GET/POST `/setup/sector-context/wrong` | **Yes** | New screen. Textarea "What looks wrong?" + hint; Send → S02b; Back → S02. Comment stored in session; does not change the sector context. |
| S02b Comment received | 482:2340 (Content 483:2425) | `/setup/sector-context?comment=received` | **Yes** | S02 + GOV.UK success banner (verbatim). Built as the S02 template with a `commentReceived` flag (one template). Confirm and continue → S03. |
| S03 Your council context | 481:3415 (Content 481:3449) | GET/POST `/setup/council-context` | **Yes** | CNI + OT now `govukSelect` dropdowns above the checkboxes (CNI first), placeholder options, hints "…Option list not yet agreed."; CNI/OT reveals + OT free text removed; legend "Do any of these **also** apply…"; proposal banner removed. |
| S05 Tell us about your methodology | 481:2429 (Content 481:2443) | GET/POST `/setup/methodology-detail` | **Yes** | Link hint → "A link your assurer can open"; example value → `https://westborough.example/methodology`. |

**Route walk** S01 → S02 → S02a → S02b → S03 → S04 → S05: every step HTTP 200 with correct redirects.
**pa11y** (axe + htmlcs, WCAG 2.2 AA) on all five pages: footer-crown framework finding only —
**zero authored errors**. No em-dashes in user-facing copy (the only em-dash is the `{# … #}` Nunjucks
comment header, matching the existing v6 convention; not rendered).

## Decisions as applied (your answers 1–4)
1. **"None of these"** — clears the checkboxes only; **does not reset** the CNI/OT dropdowns (they are
   separate "if any" questions above the group). Verified: after ticking None with a sector selected,
   the sector is kept and the checkboxes clear.
2. **Keys** — revised from "rename" to the **logical fix: reuse the existing keys as strings**.
   `cni` and `operationalTechnology` now hold the selected dropdown value; `operationalTechnologyDetail`
   removed. Reason: `decide.js` reads `setup.councilContext.cni` as a boolean flag (D24 CNI check), and
   `Boolean("placeholder-sector-1")` stays true — so Decide needed **no change** and the brief's "store
   under the existing keys" is honoured. Verified: POST `/decide/cni` "no" still routes to
   `/decide/cni/check` (D24).
3. **Proposal banner** — removed from S03 (the dropdown hint now carries "Option list not yet agreed").
4. **S05 example value** — the completed demo seed was `https://westborough.sharepoint.com/bc-plan`
   (implied a secure link); changed to the neutral `https://westborough.example/methodology`.

## Open question (per brief)
- **"None of these" vs the dropdowns** — resolved per decision 1 (does not reset the dropdowns). Noting
  it here as the brief asked; raise it again if research suggests otherwise.

## Flags / could not verify
- **Dropdown option lists are placeholders**, not agreed (`Placeholder sector/type 1/2`), with a code
  comment. Cannot be verified against a real list — by design. The CNI sector list from Ray was never
  checked against an official source (Content note); moot while placeholders are used.
- **Seed vs mock (CNI):** the v7 mock drew both dropdowns unselected. The completed demo seed sets
  `cni: "placeholder-sector-1"` so the council stays CNI-flagged and **Decide's D24 demo path still
  fires**; `operationalTechnology` is seeded `""` (matches the mock). Flag if you'd rather the seed
  match the mock exactly (CNI empty) and accept the Decide demo no longer triggering.
- **S02a has no validation** — the Figma has no error state for it ("free text only"), so none was
  invented; the "What looks wrong?" field is neither required nor marked optional, matching the design.
- **Data tracker** (as the brief asked to flag): it still has one council context text field and needs
  updating; the OT free-text detail is now dropped; a single dropdown cannot capture a council in more
  than one CNI sector or with more than one OT type. To resolve when the lists are agreed.
- **S02b** built as the S02 template + banner flag rather than a separate template — say if you want it
  split out.

## Files changed
- `app/views/pages/setup/sector-context.html` (S02 + S02b banner)
- `app/views/pages/setup/sector-context-wrong.html` (S02a, new)
- `app/views/pages/setup/council-context.html` (S03)
- `app/views/pages/setup/methodology-detail.html` (S05)
- `app/routes/setup.js` (S02a routes; S02 banner flag; S03 GET/POST; comment)
- `app/data/seed/setup.js` (councilContext keys ×2 seeds; methodology link)
- `app/routes/decide.js` — **unchanged** (key-reuse avoided it)
- Docs: `setup-v7-stage1-inventory.md`, `setup-v7-stage3.md`
