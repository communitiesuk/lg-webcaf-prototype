# Access management — Stage 3 final check

Figma: file `mnOq3QRhTdiliuSuzQoNsX`, page "14 Access management — v3", node `209:751`.
Scope: 32 screens (A01–A25, A27–A33; **no A26**), one of which is an email (A11).
Built across Batches 1–5. **Not committed** — awaiting review of this report.

## How this was verified

- **Route walk**: every GET route hit live (HTTP 200 + H1 confirmed); every form POST exercised for
  both the happy path and the error state; the remove/reassign/last-person state machine walked end to end.
- **pa11y** (axe + htmlcs, WCAG 2.2 AA) run on all 26 rendered pages.
- **Text**: transcribed verbatim from each Content frame during build (per-batch).
- **Layout**: compared against each frame screenshot at matching width during build (per-batch).
- Service works with **no JavaScript** (every interaction is a real form POST or link; no client JS relied on).

## Verification table

Legend: ✓ verified · n/a not applicable · ⚠ see note

| Screen | Template / route | Text | Layout | Routes | States | Not verified / notes |
|---|---|---|---|---|---|---|
| A01 People and governance (hub) | `hub.html` · `/access` | ✓ | ✓ | ✓ | ✓ | Priya "2 outcomes" (see Flag 1) |
| A02 Audit trail | `audit-trail.html` · `/access/audit-trail` | ✓ | ✓ | ✓ | n/a | |
| A03 Check who still needs access | `review.html` · `/access/review` | ✓ | ✓ | ✓ | ✓ | untick → A15 path |
| A04 Access review complete | `review-confirmed.html` · POST `/access/review` | ✓ | ✓ | ✓ | n/a | Count computed (see Flag 2) |
| A05 Choose who to invite | `invite-who.html` · `/access/invite` | ✓ | ✓ | ✓ | ✓ (A19) | |
| A06 Assign outcomes | `invite-outcomes.html` · `/access/invite/outcomes` | ✓ | ✓ | ✓ | ✓ (A20) | outcomes live-driven from cycle |
| A07 Approver needs account | `invite-approver-account.html` · `/access/invite/approver-account` | ✓ | ✓ | ✓ | n/a | |
| A08 Check the invitation | `invite-check.html` · `/access/invite/check` | ✓ | ✓ | ✓ | n/a | Change links → A05/A06 |
| A09 Invitation sent | `invite-sent.html` · `/access/invite/sent` | ✓ | ✓ | ✓ | n/a | |
| A10 Invitations waiting | `invitations.html` · `/access/invitations` | ✓ | ✓ | ✓ | ✓ | 3 states: live/near-expiry/expired |
| A11 Invitation email | `invitation-email.html` · `/access/invite/email-preview` | ✓ | ✓ | ✓ | n/a | prototype preview; Accept → One Login stand-in |
| A12 Email does not match | `accept-mismatch.html` · `/access/accept/email-mismatch` | ✓ | ✓ | ✓ | n/a | genuine proposal label kept |
| A13 Confirm your name | `accept-confirm-name.html` · `/access/accept/confirm-name` | ✓ | ✓ | ✓ | n/a | save → collaborator dashboard |
| A14 Change what X can do | `change.html` · `/access/people/:id/change` | ✓ | ✓ | ✓ | ✓ | first name "Priya" (Flag 3); outcomes Change → A06 (Flag 4) |
| A15 Remove access, confirm | `remove-confirm.html` · `/access/people/:id/remove` | ✓ | ✓ | ✓ | ✓ | warning when in-progress outcomes |
| A16 Last person with full access | `remove-last-person.html` · self + only full access | ✓ | ✓ | ✓ | ✓ | proposal label kept; email → stand-in (Flag 5) |
| A17 Transfer full access | `transfer.html` · `/access/people/:id/transfer` | ✓ | ✓ | ✓ | ✓ | proposal label kept; A28 pre-selects Marcus |
| A18 Access removed | `removed.html` · `/access/removed` | ✓ | ✓ | ✓ | n/a | path simplified (Flag 6) |
| A19 Invite details (error) | A05 re-render · POST `/access/invite` | ✓ | ✓ | ✓ | ✓ | inline error summary |
| A20 No outcomes (error) | A06 re-render · POST `/access/invite/outcomes` | ✓ | ✓ | ✓ | ✓ | inline error summary |
| A21 Removing your own access | `remove-self.html` · `/access/people/:id/remove` (self) | ✓ | ✓ | ✓ | ✓ | CAF-Lead guard → A22 |
| A22 Who is your CAF Lead | `caf-lead.html` · `/access/caf-lead` | ✓ | ✓ | ✓ | ✓ (A31) | stale proposal tag ignored per brief |
| A23 CAF Lead confirmed | `caf-lead-confirmed.html` · `/access/caf-lead/confirmed` | ✓ | ✓ | ✓ | n/a | → Setup task list |
| A24 You have been named CAF Lead | `named-caf-lead.html` · `/access/named-caf-lead` | ✓ | ✓ | ✓ | n/a | alt path; reached via control link |
| A25 Not the CAF Lead | `not-caf-lead.html` · `/access/not-caf-lead` | ✓ | ✓ | ✓ | n/a | clears CAF Lead; Setup task 1 reopens |
| A27 Approver details | `approver-details.html` · `/access/approver-details` | ✓ | ✓ | ✓ | ✓ (A32) | no-account approver stored only |
| A28 Reassign outcomes | `reassign.html` · `/access/reassign` | ✓ | ✓ | ✓ | ✓ (A33) | drawn Priya outcome text (Flag 7); path simplified (Flag 6) |
| A29 Who is your Approver | `approver.html` · `/access/approver` | ✓ | ✓ | ✓ | n/a | already-has / will-not-use / invite |
| A30 Cancel an invitation | `invitation-cancel.html` · `/access/invitations/:id/cancel` | ✓ | ✓ | ✓ | n/a | cancelled banner on A10 |
| A31 No CAF Lead chosen (error) | A22 re-render · POST `/access/caf-lead` | ✓ | ✓ | ✓ | ✓ | inline error summary |
| A32 Approver details missing (error) | A27 re-render · POST `/access/approver-details` | ✓ | ✓ | ✓ | ✓ | inline error summary |
| A33 No one chosen (error) | A28 re-render · POST `/access/reassign` | ✓ | ✓ | ✓ | ✓ | inline error summary |

Plus one prototype-only stand-in: `accept-signin.html` · `/access/accept` (One Login sign-in placeholder
before A12/A13 — not a numbered frame).

## Hard rules — enforced and verified live

1. **Never remove the last full-access person.** A direct POST to remove the only full-access holder
   bounces back to the remove page (→ A16), never to A18. Confirmed.
2. **Last-person routing.** Removing yourself → A16 if you are the only full-access holder, else A21;
   removing someone else → A15. Confirmed.
3. **CAF Lead cannot be left unset.** Self-remove while you are the CAF Lead redirects to `/access/caf-lead`
   (name a successor first), not to removal. Confirmed live.
4. **A16 → A17 → promote → A21**: giving someone else full access then continuing self-removal works.

## Accessibility (pa11y, WCAG 2.2 AA)

**Zero authored errors** across all 26 pages. Two findings appear, both from govuk-frontend itself, not
from authored markup:

1. **Footer crown SVG** — `WCAG2AA…F92,ARIA4` ("role=presentation contains semantic children"). Appears
   once on **every** page in the service, identically. Framework issue in `govuk-footer__crown`.
2. **Conditional-reveal `aria-expanded`** — axe `aria-allowed-attr` on `#cafLeadChoice-2` (A22 only). The
   `govukRadios` macro adds `aria-controls` + `aria-expanded` to a radio that has a conditional reveal;
   axe considers `aria-expanded` unsupported on `role="radio"`. Identical to the existing finding on
   `/decide/timing`. Framework behaviour, not authored.

Neither is unique to this section; both are pre-existing across the prototype.

## Deviations, stand-ins and flags

1. **Priya "2 outcomes"** — the design is internally inconsistent: A01/A15/A18/A28 say **2** outcomes,
   A14 lists **4**. Built with an explicit `outcomeCount: 2` and the full outcomes list on A14 as drawn.
   *Decision needed: which is canonical.*
2. **A04 "people remaining" count** — the drawn A04 is internally inconsistent (says 4 remain while also
   showing A Mensah removed). Build shows the **computed** count from live data rather than a drawn literal.
3. **First names in headings** — A14/A15/A28 use the first name only ("Priya", as drawn); A18 banner/body
   keep the full "Priya Shah" (as drawn). Implemented via a `firstName` field.
4. **A14 outcomes "Change" → A06** — reuses the invite-outcomes page (the journey's target). It does not
   deep-write edited outcomes back onto an existing person — a known prototype simplification.
5. **A16 email** — swapped the drawn real address to `cafsupport@example.gov.uk` (decision 1, no real
   emails); "Email the CAF team" points at the shared external stand-in.
6. **Path simplifications** — A18 implemented at `/access/removed` (not `/access/people/:id/removed`) and
   A28 at `/access/reassign` (not `/access/people/:id/reassign`); A04 is rendered by `POST /access/review`
   (no separate `/access/review/confirmed` GET). Behaviour and content match the frames; only the URL
   shape differs.
7. **A28 outcome description** — shows the drawn Priya example ("A3 Asset management and A4 Supply chain")
   regardless of who was removed, as drawn. A33 built with **no** pre-selection (the mock showed Marcus
   selected despite being the error state).

## Stale Figma tags ignored (per brief)

The CAF Lead model (A22–A25, A29, and the CAF-Lead parts of A21/A31) carries **"PROPOSAL … awaiting Rosa"**
status tags. The brief states this model is **agreed** — built as normal, no proposal styling.
**Genuine** proposals, kept as labelled in the UI: **A12** (domain match on acceptance), **A16/A17**
(last-person transfer). The README ("21 screens and 1 email") is stale and predates A22–A25/A27–A33.

## Open items for the team (not blockers)

- **Outcome count** Priya 2 vs 4 (Flag 1) — pick the canonical number.
- **Invitation expiry** fixed at 30 days / drawn relative dates — placeholder, no real clock.
- **Domain match** on acceptance (A12/A13) is a mock (gmail → mismatch, council email → confirm).
- **Quality Assurer** role shown read-only (K Osei, no Change link) — role still unconfirmed with MHCLG.
- **MHCLG revoking access** — described in research but not drawn; not built.
- **A14 write-back** of edited collaborator outcomes (Flag 4) — stubbed to the invite flow.

## Recommendation

All 32 screens built, routed, and state-covered; hard rules enforced; zero authored accessibility errors.
Ready to commit once you have reviewed this report and resolved the open decisions above (chiefly the
Priya outcome-count inconsistency).
