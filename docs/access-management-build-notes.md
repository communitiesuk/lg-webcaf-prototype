# Access management — per-batch build notes + deviations

Source of truth: Figma `mnOq3QRhTdiliuSuzQoNsX`, page 209:751 (Access management v3). Stage 1 inventory
+ resolved decisions: `access-management-stage1-inventory.md`. GDS: `gds-standards.md`.
Westborough example data, as drawn. Session-only; recording updates `req.session.data.access`.

## Batch 1 — A01 hub, A02 audit trail, A03/A04 review

**Built**
- `app/data/helpers/access.js` — the `access` session model (6 people, 3 invitations, 4 audit entries,
  cafLeadId, approver, reviewDue), `ensureAccess`, `roleLabel`, `buildPersonDetail`/`buildPeopleRows`
  (A01), `buildAuditRows` (A02), `buildReviewModel`/`applyReview` (A03/A04), `addAuditEntry`.
- `app/routes/access.js` — A01 (`/access`), A02 (`/access/audit-trail`), A03 (`/access/review`
  GET+POST → A04). Registered in `routes.js` before the catch-all.
- Templates: `access/hub.html` (A01), `audit-trail.html` (A02), `review.html` (A03),
  `review-confirmed.html` (A04).
- **Repointed the "People" nav** (`applyFullAccessChrome`) and the R03 dashboard "People and
  governance" link → `/access`; "People" is active on `/access` paths.
- `/beta`: added an Access management section (A01, A02, A03).

**Recording works** — the review removes unticked people, appends an audit entry ("Jo Hart removed
[name]'s access in the access review"), and A01 + A02 reflect it (verified: A Mensah removed, audit
grows to 5 entries).

**Deviations / flags**
1. **Priya's "2 outcomes" (A01) vs her 4-outcome list (A14)** is a drawn inconsistency. Reproduced as
   drawn: `outcomeCount: 2` drives the A01/A15/A18/A28 count; `outcomes` holds the A14 list.
2. **A04 counts are computed** from the review. The drawn A04 says "4 people still need access" with
   "A Mensah has been removed", which is internally inconsistent (3 remain after removing A Mensah).
   The build shows the correct computed count (e.g. "3 people"). Flagged.
3. **Roles render as inline plain text** (as drawn), not coloured `govuk-tag`s — a `buildPersonDetail`
   helper, not a tag component.
4. **A01 actions are three stacked secondary buttons** (as drawn), not an inline button-group.
5. **A03 "Save and confirm" removes unticked people in bulk → A04.** The Journey also lists A03 → A15
   (per-person remove confirm); that individual-removal flow is the change/remove section (Batch 5).
6. **Audit-log wording for new actions is composed** to match the A02 example style (A02 draws only 4
   example entries; mutating actions need generated lines).

**Forward links (404 until their batch)**: A01 "Invite someone" → A05 (Batch 3); "Change CAF Lead" →
A22 (Batch 2); people-row "Change" → A14 (Batch 5).

**Accessibility (pa11y)**: A01, A02, A03 — footer-crown only. **Zero authored errors.**

**Verification (built vs Figma)**

| Screen | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| A01 hub | verbatim | Yes | audit-trail works; invite/caf-lead/change forward-404 | assurer row no Change; stacked buttons |
| A02 audit trail | verbatim (4 + new) | Yes | Back → A01 | reflects removals |
| A03 review | verbatim | Yes | Save → A04 | A Mensah pre-unticked; approver Yes/No |
| A04 confirmed | verbatim (computed count) | Yes | Back → A01 | removes unticked + audit |

**Not built in Batch 1**: A22–A25/A29 (Batch 2); A05–A10/A27 (Batch 3); A11–A13/A30 (Batch 4);
A14–A18/A28 (Batch 5); A19–A21/A31–A33 (Batch 6).

## Batch 2 — CAF Lead (A22–A25) + Approver (A29)

**Built** (CAF Lead model agreed with Rosa — **no proposal label** in the kit; the Figma
"PROPOSAL · awaiting Rosa" tags are stale)
- `access.js`: `buildCafLeadModel`, `setCafLead` (names the CAF Lead; a Collaborator named is **given
  full access**, as drawn), `clearCafLead` (A25 decline), `buildApproverModel`.
- `routes/access.js`: A22 (`/access/caf-lead` GET+POST, **A31 error** inline), A23
  (`/access/caf-lead/confirmed`), A24 (`/access/named-caf-lead`), A25 (`/access/not-caf-lead`
  GET+POST), A29 (`/access/approver` GET+POST).
- Templates: `caf-lead.html`, `caf-lead-confirmed.html`, `named-caf-lead.html`, `not-caf-lead.html`,
  `approver.html`.
- **Setup tasks 1 & 7 wired → A22 / A29** (decision 3). `/beta` Access section extended (A22, A24, A29).

**Flow**
- A22: "Me, Jo Hart" selected by default; "Someone else who already has access" reveals Marcus / Priya
  (+ the "A Collaborator named as CAF Lead is given full access" hint); "Someone who does not have
  access yet" → invite (A05, Batch 3).
- Save "Me" → A23 **self** ("You are your council's CAF Lead"). Save someone else → sets them (Priya
  → promoted to full access), A23 adapts the heading; the named person is told via **A24** (reached by
  a prototype control, named person = Marcus Webb). A24 "This is not me" → **A25** → decline clears the
  CAF Lead (→ dashboard, audited). Verified end-to-end.
- A29: three routes (already has access / will not use → A27 / needs an invitation → invite).

**Deviations / flags**
1. **A31 built as A22's error state** (ahead of its nominal Batch 6), so the form is complete. Built
   with **no pre-selection** on error — the drawn mock showed "Me" selected despite the error. Flagged.
2. **A23 for "someone else"** is adapted copy (heading + "we have told them" note) — only the **self**
   A23 is drawn verbatim. The named person sees A24 (drawn).
3. **A24 is a dashboard-variant page** reached via a prototype control (named person = Marcus Webb, the
   drawn alt example); not a banner wired into the live `/dashboard`.
4. **A22 non-crown pa11y finding** = the govuk-frontend **conditional-reveal `aria-expanded`** on the
   "someone-with-access" radio — framework-level (same as AA04 / `/decide/timing`). **Not authored.**

**Accessibility (pa11y)**: A22 crown + conditional-reveal framework finding; A23/A24/A25/A29 crown
only. **Zero authored errors.**

**Verification (built vs Figma)**

| Screen | Text | Layout | Routes | Notes |
|---|---|---|---|---|
| A22 | verbatim (no stale proposal label) | Yes | Save → A23 / A31; Me→self, others→named | reveal + full-access-on-promote |
| A23 | verbatim (self) | Yes | Continue → Setup | other-case adapted |
| A24 | verbatim | Yes | This is not me → A25 | Important banner; Marcus view |
| A25 | verbatim | Yes | Yes → dashboard (clears); Cancel → A24 | |
| A29 | verbatim | Yes | → A27 / invite (forward-404 til B3) | will-not-use default |

**Not built in Batch 2**: A05–A10/A27 (Batch 3); A11–A13/A30 (Batch 4); A14–A18/A28 (Batch 5);
A19–A21/A31(full)/A32/A33 (Batch 6). A01 "Change CAF Lead" now reaches A22.

## Batch 3 — Invite journey (A05–A10) + Approver details (A27)

**Built**
- `access.js`: the invite draft (`ensureInvite`), `buildOutcomeGroups` (A06, **live** org + each
  selected system), `outcomeLabel`/`roleVerb`, `addInvitation`, `buildInvitationRows` (A10),
  `setApprover` (A27).
- `routes/access.js`: A05 (`/access/invite` + **A19** error), A06 (`/access/invite/outcomes` + **A20**
  error), A07 (`/access/invite/approver-account`), A08 (`/access/invite/check`), A09
  (`/access/invite/sent`), A10 (`/access/invitations` + resend), A27 (`/access/approver-details` +
  **A32** error).
- Templates: `invite-who`, `invite-outcomes`, `invite-approver-account`, `invite-check`, `invite-sent`,
  `invitations`, `approver-details`.
- `/beta` Access section extended (A05, A10, A27).

**Flow verified end-to-end**: A05 (role → A06 collaborator / A07 approver / A08 full) → A06 outcomes →
A08 check → A09 sent **adds the invitation to A10 and an audit entry** (invited Dana Lowe → appears in
pending). A07 "No" → A27; A27 Save → A01 + updates the Approver + audit. Resend re-activates an
expired/near-expiry invitation.

**Live / recording**
- A06 outcomes are **live-driven**: organisation assessment + each selected system (Northgate expanded,
  Social care in a `govukDetails`, as drawn). Default pre-checks A3, A4, Northgate B2, B4.
- A08 shows the selected outcome labels (dynamic); A09/A10 reflect the sent invitation.

**Deviations / flags**
1. **A19 / A20 / A32 built as inline error states** (ahead of their nominal Batch 6), so each form is
   complete and the error is reachable from its own submit. Email + role required (A19, name is not);
   ≥1 outcome (A20); full name + role (A32).
2. **A06 pre-checks 4 outcomes (A3, A4, B2, B4) as drawn, but the drawn A08 lists only 2** (A3, A4) —
   a design inconsistency. A08 shows the **actual** selection (dynamic). Flagged.
3. **30-day expiry (A09)** reproduced as drawn — unconfirmed placeholder.
4. **Quality Assurer / System Mapper** are inset-only on A05 (unconfirmed, Private Beta scope) — code
   comment, not built as roles.
5. A05 is **pre-filled** with the drawn example (Sam Okoro / s.okoro@westborough.gov.uk), as drawn.

**Forward links (404 until their batch)**: A10 "Cancel" → A30 (Batch 4); A05 "Approver → invitation"
and A22 "someone new" route into this invite journey (now built).

**Accessibility (pa11y)**: A05, A06, A08, A09, A10, A27 — footer-crown only. **Zero authored errors.**

**Verification (built vs Figma)**: A05/A06/A08/A09/A10/A27 text verbatim, layout matches; A06 live
systems confirmed; errors A19/A20/A32 fire with verbatim wording.

**Not built in Batch 3**: A11–A13/A30 (Batch 4); A14–A18/A28 (Batch 5); A19–A21 full/A31/A32/A33
confirm (Batch 6 — A19/A20/A32 already built as inline states).

## Batch 4 — Invited person (A11–A13) + cancel (A30)

**Built**
- `access.js`: `cancelInvitation` (A30).
- `routes/access.js`: A11 (`/access/invite/email-preview`), the **accept sign-in stand-in**
  (`/access/accept`, mocks the domain check), A12 (`/access/accept/email-mismatch`), A13
  (`/access/accept/confirm-name` GET+POST), A30 (`/access/invitations/:id/cancel` GET+POST).
- Templates: `invitation-email` (A11), `accept-signin` (prototype), `accept-mismatch` (A12),
  `accept-confirm-name` (A13), `invitation-cancel` (A30); A10 gains a cancel success banner.
- `/beta` Access section extended (A11, Accept A12/A13).

**Flow**
- A11 email "Accept this invitation" → the **accept sign-in stand-in**, which offers the two mocked
  paths: **matching** council email → A13; **non-matching** email → A12 (decision: the domain check is
  mocked by example emails).
- A12 uses the **"signed in, no council"** chrome (Sign out only); carries a **"Proposal, not agreed"**
  note (domain match still a proposal). A13 uses the **collaborator** chrome (identity = Sam Okoro) and
  "Continue to your tasks" → the **collaborator dashboard** (`/dashboard`, R06 — decision 2), verified.
- A30: A10 "Cancel" → confirm → removes the invitation, shows an A10 success banner, and appends an
  audit entry. Verified (Sam removed, banner shown, "cancelled the invitation to Sam Okoro" logged).

**Deviations / flags**
1. **A11 is a prototype email preview** (not a real send), reusing the Get started G04 card pattern.
2. **Accept sign-in stand-in** added (`/access/accept`) to mock the One Login + domain check with two
   example emails — the design assumes One Login; this is the prototype's reachable control.
3. **A13 identity = Sam Okoro** (the invited person). The Figma mock showed "Priya Shah" in the nav,
   which is a mock inconsistency; corrected to the invitee.
4. **A12 proposal note** kept (domain match on acceptance — a genuine proposal per the README).
5. **Cancel success-banner wording is composed** ("[name]'s invitation has been cancelled") — A30
   content says "a success banner" but does not give the wording.

**Accessibility (pa11y)**: A11, A12, A13, A30 — footer-crown only. **Zero authored errors.**

**Verification (built vs Figma)**: A11/A12/A13/A30 text verbatim, layout matches; chrome variants
confirmed (A12 no-council, A13 collaborator); cancel + audit + banner verified.

**Not built in Batch 4**: A14–A18/A28 (Batch 5); A19–A21 full/A31/A33 confirm (Batch 6). A10 "Cancel"
→ A30 now works.

## Batch 5 — Change / remove / last-person / reassign (A14–A18, A21, A28)

**Built**
- `access.js`: `changeRole`, `removePerson`, `promoteToFull`, `fullAccessPeople`, `isOnlyFullAccess`,
  `buildTransferModel` (A17), `buildReassignModel` (A28); `firstName` added to people.
- `routes/access.js`: A14 (`/access/people/:id/change`), the remove branch
  (`/access/people/:id/remove` → A15 / A16 / A21 by self/last-full-access), A17
  (`/access/people/:id/transfer`), A21 self-removal (`/access/people/:id/remove-self`), A18
  (`/access/removed`), A28 (`/access/reassign` + **A33** error).
- Templates: `change`, `remove-confirm` (A15), `remove-last-person` (A16), `transfer` (A17),
  `removed` (A18), `remove-self` (A21), `reassign` (A28).
- `/beta` Access section extended (A14, self-remove A21/A16).

**Hard rules — all enforced and verified**
- **Never remove the last full-access person**: a direct POST to remove the only full-access person
  bounces back to the remove page (→ A16), never to A18.
- **Last-person routing**: removing **yourself** → A16 if you are the only full-access person, else A21.
  Removing **someone else** → A15.
- **CAF Lead cannot be left unset**: A21 "Remove my access" while you are the CAF Lead routes to A22
  (name a successor first), not to removal. A21 shows "Name a new CAF Lead" as the primary action.
- A16 "Give someone else full access" → A17 → promote the chosen person → A21 (now not the last).

**Flows verified**: remove Priya → A15 (warning "2 outcomes") → A18 ("2 outcomes unassigned") → A28 →
A33 error / save (Priya gone, audited); self-remove as CAF Lead → A21 → A22; remove Marcus then self →
A16 → A17.

**Deviations / flags**
1. **First names in headings** (A14/A15/A28 use "Priya"; A18 banner/body use the full "Priya Shah") —
   matched the design via a `firstName` field.
2. **A16/A17 carry a "Proposal, not agreed" note** (the last-person case is a genuine proposal).
3. **A16 email swapped to `cafsupport@example.gov.uk`** (decision 1); "Email the CAF team" → the shared
   external stand-in (`/external`).
4. **A14 outcomes "Change" → A06** (the journey's target) — reuses the invite-outcomes page; it does
   not deeply write back to the existing person (a known prototype simplification). Flagged.
5. **A28 outcome description is the drawn Priya example** (A3, A4) regardless of who was removed —
   as drawn. **A33 built with no pre-selection** (the mock showed Marcus selected despite the error).
6. **A21 "Marcus Webb and 2 others"** summary is computed from the live access holders.

**Accessibility (pa11y)**: A14, A15, A17, A18, A21, A28 — footer-crown only (A16 uses the same passing
components). **Zero authored errors.**

**Verification (built vs Figma)**: A14/A15/A16/A17/A18/A21/A28 text verbatim (first names corrected),
layout matches; all hard-rule branches exercised.

**Not built in Batch 5**: A19–A21 confirm / A31 / A33 (Batch 6 — A19/A20/A21/A31/A32/A33 already built
as inline/edge states; Batch 6 is now just a confirmation/Stage-3 pass). A01 row "Change" now works.
