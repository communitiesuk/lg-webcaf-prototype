# Access management — Stage 1 inventory (no code)

Source of truth: Figma `mnOq3QRhTdiliuSuzQoNsX`, page "14 Access management — v3 (Private Beta, gap
sweep 25 Sept)", node `209:751`. Copy verbatim from the Content frames; Journey blocks = routing.
GOV.UK Frontend **5.14.0**. All copy draft, unreviewed. Signed-in user throughout: **Jo Hart ·
Westborough Borough Council** (matches the built Beta sections).

**32 screens** (A01–A25, A27–A33; there is no A26) including one email (A11). Section lives under
`/access`; the dashboard "People" nav item (today → holding) becomes `/access` (A01).

## 0. README mismatch + stale tags (brief asked to list)

- **README is stale**: it says "21 screens and 1 email. A01 to A21… 22 branches, 18 prototype links,
  3 starting points." It predates **A22–A25, A27–A33** (the CAF Lead/Approver model, Approver details,
  reassign, cancel, and the new error screens). Actual = 32 screens. Flagged; not edited in Figma.
- **Stale "PROPOSAL · CAF Lead model, awaiting Rosa" tags**: per the brief the CAF Lead model (A22–A25,
  A29, and the CAF-Lead steps in A21/A31) is **agreed with Rosa** — build as normal, **no** proposal
  label in the kit. The stale proposal wording appears as: off-frame canvas stickies (not inside the
  frames); A22 content Status "PROPOSAL, awaiting Rosa"; A23/A24/A25/A29 content Status "PROPOSAL";
  A31 Status "NEW, … PROPOSAL, with the CAF Lead model"; and the "Proposal, CAF Lead model" fields on
  A16 and A21. All listed here as stale for the CAF Lead parts.
- **Genuine proposals (keep labels)**: **A12** domain match on invitation acceptance; **A16/A17**
  what happens when the last person with full access leaves. (README banner confirms these two.)

## 1. Route map

Section layout extends `layouts/dashboard.html`; chrome via `applyFullAccessChrome` (reused from
Readiness) with the **"People"** nav item set active. Invited-person screens (A12/A13) use the
collaborator / no-council chrome.

| Screen | URL | Template | Linked from | Links to |
|---|---|---|---|---|
| **A01** People and governance (hub) | `/access` | `access/hub.html` | dashboard "People"; A04/A09/A13/A14/A18/A27/A28 returns | A02, A05, A10, A14/:id, A22, A27 |
| **A02** Audit trail | `/access/audit-trail` | `access/audit-trail.html` | A01 | end |
| **A03** Periodic review | `/access/review` | `access/review.html` | starting point / nudge | A04 (save), A15 (someone unticked) |
| **A04** Review confirmed | `/access/review/confirmed` | `access/review-confirmed.html` | A03 | A01 |
| **A05** Choose who to invite | `/access/invite` | `access/invite-who.html` | A01, A08, A09; (P02/P14 stand-in) | A06 / A07 / A08 / A19 / A12 / A13 |
| **A06** Assign outcomes | `/access/invite/outcomes` | `access/invite-outcomes.html` | A05, A14, A08, A19 | A08 / A20 |
| **A07** Approver need account | `/access/invite/approver-account` | `access/invite-approver-account.html` | A05 | A27 (no) / A08 (yes) |
| **A08** Check the invitation | `/access/invite/check` | `access/invite-check.html` | A05/A06/A07/A20 | A09 (send); Change → A05/A06 |
| **A09** Invitation sent | `/access/invite/sent` | `access/invite-sent.html` | A08 | A10, A05, A01 |
| **A10** Pending invitations | `/access/invitations` | `access/invitations.html` | A01, A09, A30 | A30/:id (cancel) |
| **A27** Approver details | `/access/approver-details` | `access/approver-details.html` | A07, A29, A01 | A32 (error) / A01 (save) |
| **A30** Cancel an invitation | `/access/invitations/:id/cancel` | `access/invitation-cancel.html` | A10 | A10 (cancelled) |
| **A11** Invitation email | `/access/invite/email-preview` | `access/invitation-email.html` | prototype preview | Accept → A12/A13 (One Login stand-in) |
| **A12** Email does not match | `/access/accept/email-mismatch` | `access/accept-mismatch.html` | A05 (wrong domain) / A11 accept | One Login stand-in |
| **A13** Confirm your name | `/access/accept/confirm-name` | `access/accept-confirm-name.html` | A05 (domain matches) / A11 | your tasks (collaborator dashboard) |
| **A14** Change access | `/access/people/:id/change` | `access/change.html` | A01, A15 (cancel) | A15 / A06 / A01 |
| **A15** Remove access, confirm | `/access/people/:id/remove` | `access/remove-confirm.html` | A03, A14 | A18 / A14 (cancel); A16/A21 if last/self |
| **A16** Last person with full access | `/access/people/:id/remove` (last-person state) | `access/remove-last-person.html` | self-remove when only full-access | A17 / email stand-in |
| **A17** Transfer full access | `/access/people/:id/transfer` | `access/transfer.html` | A16 | A21 |
| **A18** Access removed | `/access/people/:id/removed` | `access/removed.html` | A15, A21 | A28 / A01 |
| **A28** Reassign outcomes | `/access/people/:id/reassign` | `access/reassign.html` | A18 | A33 (error) / A01 (save) |
| **A22** Who is your CAF Lead | `/access/caf-lead` | `access/caf-lead.html` | A01, A21, Setup task 1 | A23 / A31 |
| **A23** CAF Lead confirmed | `/access/caf-lead/confirmed` | `access/caf-lead-confirmed.html` | A22, A31 | Setup (`/setup/task-list`) |
| **A24** You have been named CAF Lead | `/access/named-caf-lead` | `access/named-caf-lead.html` | prototype control (named person) | A25 |
| **A25** Not the CAF Lead | `/access/not-caf-lead` | `access/not-caf-lead.html` | A24 | dashboard / A24 (cancel) |
| **A29** Who is your Approver | `/access/approver` | `access/approver.html` | Setup task 7, D12 | A27 (will not use) / choose / Invite |
| **A19** invite details (error) | POST `/access/invite` re-render | (A05 template) | A05 submit | A06 |
| **A20** no outcomes (error) | POST `/access/invite/outcomes` re-render | (A06 template) | A06 submit | A08 |
| **A21** removing your own access (edge) | `/access/people/:id/remove` (self state) | `access/remove-self.html` | A17 | A18 / A22 / A01 |
| **A31** no CAF Lead chosen (error) | POST `/access/caf-lead` re-render | (A22 template) | A22 submit | A23 |
| **A32** Approver details missing (error) | POST `/access/approver-details` re-render | (A27 template) | A27 submit | A01 |
| **A33** no one chosen (error) | POST `/access/people/:id/reassign` re-render | (A28 template) | A28 submit | A01 |

Three capabilities, three starting points (README): **A01** (who has access), **A05** (invite),
self-remove / A03 review (change/remove). A24 is a dashboard variant (banner) for the named person.

## 2. Example data (verbatim, as drawn) — the `access` session model

**People** (A01 hub). Proposed `req.session.data.access.people[]`:
| Name | Role | Detail (as drawn) |
|---|---|---|
| Jo Hart (current user) | Full access, **CAF Lead** | "CAF Lead · Full access · Council email · Active today" |
| Marcus Webb | Full access | "Full access · Council email · Active 3 days ago" |
| Priya Shah | Collaborator | "Collaborator, 2 outcomes · Council email · Active today" (outcomes A3, A4, Northgate B2, B4) |
| A Mensah | Collaborator | "Collaborator, 2 outcomes · Managed service, checked by MHCLG · Active 2 weeks ago" |
| Cllr M Devlin | Approver | "Approver · No account, details stored only" (role: Cabinet Member for Resources) |
| K Osei, Bridewell | Assurer | "Assurer · Assigned by MHCLG · Can read and comment" — **no Change link** |

**Pending invitations** (A10) `access.invitations[]`: "Sam Okoro" (Sent today · Expires 22 October ·
Cancel); "R Bell" (Sent 3 weeks ago · Expires in 4 days · Resend); "T Nowak" (Expired 2 days ago ·
Resend). **Audit trail** (A02) `access.auditTrail[]`: 4 entries (21 Sep A Mensah accepted invite to
a.patel@novatech-services.co.uk; 18 Sep Jo invited A Mensah; 14 Sep Priya joined by domain; 2 Sep
MHCLG approved Jo's registration). **Outcomes** (A06) are **live-driven** from the cycle: organisation
assessment (A1 Governance, A2 Risk management, A3 Asset management, A4 Supply chain, D1 Response and
recovery planning, D2 Lessons learned) + per selected system (B1–B6, C1, C2) for Northgate and Social
care. Recording any change (invite, cancel, change, remove, reassign, name CAF Lead/Approver) updates
the session; A01, A10 and A02 reflect it.

## 3. State list per screen (key states)

- **A01** derives the table from `access.people`; "Change CAF Lead" always shown; assurer row has no
  Change. (One-person vs many: table renders whatever is in session.)
- **A03** review: checkboxes per person (pre-ticked except A Mensah), + "Is Cllr M Devlin still your
  Approver?" Yes/No. Unticking someone → A15. (Review due vs not-due drives whether it is offered.)
- **A05** role radios (Collaborator [default] / full access / Approver); QA only in the inset
  ("Quality Assurer is not available yet…"), **not a radio** — unconfirmed, Private Beta scope.
- **A06** outcomes grouped by assessment (live); A3/A4 + Northgate B2/B4 pre-checked as drawn.
- **A07** "No, I will record their approval myself" [default] → A27; "Yes, send them an invitation" → A08.
- **A10** three invitation states: live (Cancel), near-expiry (Resend), expired (Resend).
- **A12/A13** domain check (mock): non-matching email (e.g. s.okoro@gmail.com) → A12; matching council
  email → A13 (confirm name + job title, prefilled "Sam Okoro").
- **A14** per role: Collaborator shows the outcomes summary row + "Change"; full access has no outcomes.
  "Remove their access" → A15 (or A16/A21 if last/self).
- **A15** warning if the person has in-progress outcomes ("…part-way through 2 outcomes…").
- **A16** shown when the signed-in user is the **only** person with full access (last-person rule).
- **A17** transfer to: Marcus (full already) / Priya (Collaborator) / someone new.
- **A21** shown when removing **your own** access **and you are the CAF Lead** — "Name a new CAF Lead"
  [primary] first, then "Remove my access", "Cancel".
- **A22–A25** (CAF Lead): A22 select (Me / someone with access [reveal Marcus, Priya] / someone new);
  A23 = **you named yourself** (Success, "Jo Hart is now…"); A24 = **you were named** (Important banner
  on the named person's dashboard, "This is not me"); A25 = decline (clears CAF Lead, Setup task 1
  reopens). The main example keeps Jo as CAF Lead; A24/A25 are the alt path (Marcus named).
- **A29** Approver: already has access / will not use (→A27) / needs an invitation (→Invite as Approver).

## 4. Shared components

- **People row** (A01): name + a details line (role · email type · last active) + "Change" link. The
  design renders roles as **inline plain text, not coloured `govuk-tag`s** — a `roleLabel` helper, not
  a tag component (noted as a deviation option). Assurer row: no Change.
- **Outcomes checkbox group** (A06/A14): grouped by assessment (org + each live system), reused on
  A06 (invite), A14 (change), and read-only on A08/A14 summaries and A28/A33.
- **Invitation row** (A10): name + "Sent … · Expires …" / "Expired …" + Cancel/Resend.
- **Confirm-destructive pattern** (A15, A30, A21, A25): body + optional warning text + destructive/
  primary button + Cancel/Go back.
- **Audit-trail list** (A02): date + event. Every mutating action appends an entry.
- **"Who is…" person selector** (A17, A22, A28, A29): radios of people + "someone who does not have
  access yet" (+ "leave unassigned" on A28).

## 5. Link-targets table (Journey link → kit route / stand-in)

| Journey link | Target |
|---|---|
| dashboard "People and governance" → A01 | **repoint** nav/dashboard link → `/access` |
| A05/A09 "Invite someone(else)", A01 "Invite someone" | `/access/invite` (A05) |
| A01 "View audit trail" | `/access/audit-trail` (A02) |
| A01/A09 "Invitations waiting" | `/access/invitations` (A10) |
| A01 "Change CAF Lead", Setup task 1, A21 "Name a new CAF Lead first" | `/access/caf-lead` (A22) |
| A23 "Continue setting up" | **Setup v6** `/setup/task-list` (S01) |
| A24/A25 → the dashboard | `/dashboard` (Readiness v3 — built) |
| A13 "Continue to your tasks" | collaborator dashboard `/dashboard` (R06) *(see §7)* |
| A16 "Email the CAF team" | **mailto / email stand-in** (outside WebCAF) |
| A29 from Setup task 7 / D12 (Decide v4) | A29 entry; Decide v6 (`/decide`) not changed — inbound design-intent |
| A05 from P02/P14 (Prepare v3) | **Prepare stand-in** (reuse `/assurance-activities/prepare-stand-in` or a new labelled one) |
| the self-assessment | `/self-assessment` **stand-in** (reused) |
| MHCLG revoking access | **not built** (deliberately not drawn) — labelled stand-in only if a link needs it |

Setup v5 refs in the Journey blocks (S01, S30) map to **Setup v6** `/setup/task-list` and
`/setup/complete`; Decide v4 (D12) → **Decide v6** `/decide`. Never link to v5/earlier.

## 6. The email (A11) — rendered preview, not a real send

`access/invitation-email.html` at `/access/invite/email-preview` (like the Get started G04 preview).
From "Assess and manage your council's cyber resilience"; Subject "Jo Hart has asked for your help
with Westborough Borough Council's CAF"; "Dear Sam,"; body naming the outcomes; "Accept this
invitation" link → the accept flow (A12/A13 via the One Login stand-in); "This invitation expires on
22 October 2026."; forwarding paragraph. No real send.

## 7. Cannot build / conflicts / flags

1. **Real MHCLG email** on A16: "cafsupport@communities.gov.uk". Per the established convention (Get
   started/Claim) I will **swap to `cafsupport@example.gov.uk`**. Confirm.
2. **A13 "Continue to your tasks"**: the Journey says → A01, but the invitee is a **Collaborator** and
   A01 is the full-access hub. I propose → the **collaborator dashboard** (`/dashboard`, R06 view).
   Confirm.
3. **A24 is a dashboard variant** (H1 "Your CAF dashboard" + Important banner). I will build a
   dedicated `/access/named-caf-lead` page that reproduces the dashboard header + banner + CAF-Lead
   body + "This is not me", reached via a prototype control (named person = Marcus Webb, the alt path).
   Flagged as a simplified dashboard view rather than wiring a banner into the live `/dashboard`.
4. **A19 inline-error placement** in the mock looks attached to the wrong fields (email error above the
   name field, role error above the email field). I will build **correct GDS placement** (error on the
   email input and on the radio group) and flag the mock.
5. **A31/A32/A33 drawn with a radio/field pre-selected despite the error** (e.g. A31 shows "Me, Jo
   Hart" selected while erroring "Select who your CAF Lead is"). I will build the **correct** error
   state (no pre-selection for "nothing chosen"; A32 role empty) and flag the mock inconsistency.
6. **Role tags are plain text, not `govuk-tag`s** in the design — I will match the design (plain text)
   via a role-label helper; if you prefer GDS tags, that is a small change. Flagged.
7. **Quality Assurer / System Mapper** — not built as roles (A05 inset only), unconfirmed (Private
   Beta scope) — marked in a code comment.
8. **Setup tasks 1 & 7** ("Confirm your CAF Lead" / "Confirm your Approver") currently point to the
   holding page. They are the natural Setup entry to A22/A29. I propose wiring them → A22/A29. Confirm
   (this touches the built Setup task list).
9. **Placeholders** reproduced as drawn: A09/A11 **30-day expiry** (no agreed period); A15 **work-in-
   progress** assumption (stays and needs reassigning — needs Gigo); A28 same (saved work stays with
   the outcome).
10. **A24/A25 nav** on A13 shows "Priya Shah" in the signed-in label while the form prefills "Sam
    Okoro" — a mock inconsistency (the invited person is Sam); I will show the invited person. Flagged.

## 7b. Decisions resolved (sign-off)

1. **A16 email swapped to `cafsupport@example.gov.uk`** (established fictional-email convention).
2. **A13 "Continue to your tasks" → the collaborator dashboard** (`/dashboard`, R06 view).
3. **Setup tasks 1 & 7 wired → A22 / A29** ("Confirm your CAF Lead" / "Confirm your Approver").

## 8. Proposed build batches (per the brief)

1. **A01–A04** (hub, audit trail, review) + the `access` session model + the dashboard "People" repoint.
2. **A22–A25, A29** (CAF Lead & Approver) — early, since the roles drive the invite/change screens.
3. **A05–A10, A27** (invite journey incl. Approver-without-account).
4. **A11–A13, A30** (invited person, cancel).
5. **A14–A18, A28** (change, remove, last-person, reassign).
6. **A19–A21, A31–A33** (errors and edges).

**Stop — awaiting your approval and the §7 confirmations (items 1, 2, 8 especially) before any code.**
