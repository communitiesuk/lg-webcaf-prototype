# CLAUDE.md — lg-webcaf-prototype

## What this project is

A GOV.UK Prototype Kit project for the Local Government WebCAF (Cyber Assessment Framework) service. It is a research and demo prototype — not production code. Built with Nunjucks templates, Express.js routes, and session-based data (no database).

## Stack and conventions

- **GOV.UK Prototype Kit** — Nunjucks templates, Express routes, session data via `req.session.data`
- **GOV.UK Frontend** — use govuk-\* classes throughout (`govuk-summary-list`, `govuk-table`, `govuk-tag`, etc.)
- **No persistent storage** — all state lives in the session. Helper functions seed and mutate `req.session.data.assessment` directly
- **Round-2 prototype variant** — `req.session.data.researchRound === "round-2"` gates the active journey. Most new work is round-2 only

## Key files

| File | Purpose |
|---|---|
| `app/routes/assessments.js` | Main route file — dashboard, journey task list, self-assessment, IIP, send-to-assurer. Very large (~265KB) |
| `app/routes/flow.js` | Step-by-step outcome flows — B2.a IGP journey, IIP stage 2, assurer flow |
| `app/routes/entry.js` | Entry/home page — `buildRoundTwoEntrySummary`, resume logic |
| `app/routes/stages.js` | Scope setup flows — context questions, services, systems, scope review |
| `app/routes/onboarding.js` | Onboarding task list and scope sub-pages |
| `app/routes/council-context.js` | Council account setup (`/council-setup`, `/council-context/restore`) |
| `app/routes/research-rounds.js` | Demo control panel routes — scene entry points |
| `app/data/helpers/research-ready.js` | Demo data seeding — `initialiseRoundTwoPostSetupResearch`, `initialiseDemoScene` |
| `app/data/content/labels.js` | User-facing label strings shared across routes |
| `app/views/components/page-header.njk` | `appPageHeader` macro — caption, H1, intro, hint, guidance box |
| `app/views/components/section-start.njk` | `appSectionStart` macro — wraps `appPageHeader` + guidance details + button group |
| `app/views/pages/assessments/dashboard.html` | Assessment dashboard template |
| `app/views/pages/assessments/journey.html` | Task list template |
| `app/views/pages/research-rounds.html` | Demo control panel page |

## Prototype scope limits

The prototype deliberately restricts to a subset of the full CAF:

```javascript
// assessments.js
const PROTOTYPE_OUTCOME_LIMITS = { AD: 2, BC: 1 };
// AD: shows A1a and A1b only
// BC: IMPORTANT — limit is positional (slice), returns B1a as first outcome
//     but prototype focuses on B2a, NOT B1a
//     Always use flattenAllOutcomes() + filter to ["B2a"] for BC, never flattenOutcomes()
```

**Critical pattern — BC outcomes must use `flattenAllOutcomes` not `flattenOutcomes`:**
```javascript
// WRONG — returns B1a (first in tree), not B2a
const outcomeList = flattenOutcomes(bcOutcomesTree);

// CORRECT
const PROTOTYPE_BC_OUTCOME_IDS = ["B2a"];
const outcomeList = flattenAllOutcomes(bcOutcomesTree).filter(o => PROTOTYPE_BC_OUTCOME_IDS.includes(o.id));
```
This bug was fixed in `buildBCSystemRows`, `buildBCOutcomeRows`, and `buildBCJourneySummary`.

## Terminology — "reason" not "rationale"

All user-facing copy uses **"reason"** (e.g. "Reason for your judgement"). The underlying session data field is still named `rationale` (e.g. `saved.rationale`, `b2aRationale` form field name) — do not rename these internal keys as it would break saved data. The distinction is: field name = `rationale`, label/heading = "reason".

## Demo data — signed-in users

- **Council (CAF lead):** Morgan Ellis, CAF Lead — West Marchshire Council
  - Session: `req.session.data.user`, `req.session.data.assessment`
  - ID: `user-west-marchshire-1`
- **Assurer:** Jordan Blake, NorthStar Assurance
  - Session: `req.session.data.assurerAlpha` (completely separate from council session)
  - Reset by `delete req.session.data.assurerAlpha` before redirect

## Demo scenes (`initialiseDemoScene`)

Each scene calls `initialiseRoundTwoPostSetupResearch` then applies overrides:

| Scene key | What it sets up | Entry URL |
|---|---|---|
| `"dashboard"` | 3 systems: sys-1 in progress, sys-2 ready_for_internal_review, sys-3 not started | `/assessments/current/dashboard?lens=bc&view=all` |
| `"context"` | Same as dashboard | `/self-assess/bc/sys-1/outcomes/B2a/b2a-context` |
| `"final-judgement"` | Same as dashboard | `/self-assess/bc/sys-1/outcomes/B2a/b2a-final-judgement` |
| `"completed"` | sys-1 B2a fully judged (Partially achieved) with reason + evidence | `/self-assess/bc/sys-1/outcomes/B2a/b2a-ready-for-internal-review` |
| `"review"` | All 3 systems judged, adReview/bcReview complete, collaborationWorkflow.status = "in_review" | `/assessments/current/complete-self-assessment` |
| `"send-to-assurer"` | All 3 systems judged, collaborationWorkflow.status = "approved" | `/assessments/current/send-to-assurer` |
| `"post-assurance"` | All 3 systems judged, approved, assurerSubmission.submitted = true, assurance.recordOfAudit submitted, stage1Report finalised with 3 recommendations (A1a high, A1b medium, B1a medium), assurer IGP reviews for A1a and A1b | `/assessments/current/assurance-report` |
| `"carried-forward-task-list"` | A&D outcomes carried forward from previous cycle (carriedForward + reviewRequired), B&C not started | `/assessments/current/journey` |
| `"collaborator"` | Collaborator view state | `/assessments/current/collaborator-view` |
| `"onboarding-task-list"` | Onboarding task list state | `/onboarding` |

## IGP data — scope and constraints

**Only B2a has an IGP-level self-assessment journey.** AD outcomes (A1a, A1b) are assessed at outcome level only — `selfAssess.ad[id]` stores `judgement`, `rationale`, `updatedAt` with no `igpAssessments` array. Do not assume council IGP data exists for AD outcomes.

`buildAssuranceComparison` iterates the full CAF outcome tree but skips any outcome where neither the council has a judgement nor the assurer has a rating — so only actually-assessed outcomes appear. IGPs are derived from actual reviewed data, not a hardcoded list; the IGP section is hidden if no IGP data exists.

`buildBCAssuranceComparison` handles critical systems: for each selected system it looks up council B2a judgement from `selfAssess.bc[systemId].outcomes.B2a` and assurer data from `record.outcomes` using composite IDs (`"B2a:sys-1"`, `"B2a:sys-2"` etc.). Returns a single BC group folded into the same `outcomeGroups` array as AD. The `stage1` recommendation lookup uses `outcomeId === "B2a"` (not per-system).

## B2.a IGP journey structure

The B2.a contributing outcome uses a bespoke IGP (Indicators of Good Practice) journey stored in `selfAssess.bc[systemId].outcomes.B2a.b2aJourney`:

```javascript
b2aJourney: {
  achieved: { [igpId]: { response, explanation, note } },     // 6 IGPs
  notAchieved: { [igpId]: { response, explanation, note } },  // 3 IGPs
  partiallyAchieved: { [igpId]: { response, explanation, note } }, // 4 IGPs
  indicativeJudgement: "Partially achieved", // auto-calculated after all IGPs answered
  reviewDeclaration: true, // set when user confirms the journey
}
```

The final judgement and reason are combined on one page (`b2a-final-judgement`). The old `b2a-rationale` route redirects to `b2a-final-judgement`.

`buildB2aIndicativeJudgement` returns `{ judgement, strengths, weaknesses, uncertainties }` — no `reflections` property. The template renders the judgement as a govuk-tag (green/yellow/red).

## Carry-forward A&D outcomes

When `selfAssess.ad[id].carriedForward === true && selfAssess.ad[id].reviewRequired === true`, the outcome is carried forward from a previous cycle and needs review. `countADJudged` excludes these from the judged count. `buildADJourneySummary` shows:

- `"Needs review"` (yellow) — when `annualSetup.completed` is true and there are unreviewed carried-forward outcomes
- `"Carried forward"` (yellow) — when `annualSetup.completed` is false but carry-forward data exists

Once the user reviews and saves a judgement for a carried-forward outcome, `reviewRequired` should be cleared.

## Assessment status values

For BC outcomes (`selfAssess.bc[systemId].outcomes[outcomeId].status`):
- `"not_started"` — grey tag
- `"in_progress"` — blue tag
- `"ready_for_internal_review"` — purple tag
- `"complete"` — green tag

System-level status (used in dashboard Critical systems table, `buildBCSystemRows`):
- Derived from `saved.judgement` (complete if all outcomes judged) and `saved.status` (in progress if any not not_started and not all judged)

## Collaboration workflow

Stored at `assessment.collaborationWorkflow.status`:
- `"draft"` → `"in_review"` → `"ready_for_approval"` → `"approved"`
- Also: `"needs_changes"` (reviewer sends back)

Gates:
- `complete-self-assessment` page: requires `selfAssess.adReview.completed && selfAssess.bcReview.completed`
- `send-to-assurer` page: requires `collaborationWorkflow.status === "approved"`

## Entry page (`/entry`) — round-2 status ladder

`buildRoundTwoEntrySummary` in `entry.js` drives the "What to do next" box. Status labels (in priority order):

1. `"Sent to assurer"` — `assurerSubmission.submitted === true`
2. `"Ready to send to assurer"` — `collaborationWorkflow.status === "approved"`
3. `"Onboarding in progress"` — `!isRoundTwoOnboardingComplete`
4. `"Ready to set up assessment"` — onboarding done, `!annualSetup.completed`
5. `"Ready to start self-assessment"` — `annualSetup.completed && !selfAssessStarted`
6. `"In progress"` — catch-all

**Do not** use `selfAssessmentReview.completed` for readyForReview — that field is never set. Use `assurerSubmission.submitted || collaborationWorkflow.status === "approved"`.

## `redirectIfScopeNotReady` guard (`flow.js`)

Round-2 check comes FIRST — before the `prepare.guidanceRead` round-1 check. If round-2 and `!annualSetup.completed`, redirects to `/assessments/current/journey`. This prevents round-2 users hitting the round-1 `/prepare` → `/onboarding` chain.

## IIP (Improvement & Implementation Plan)

- Seeded on first visit by `ensurePrototypeRecommendationSeed` (3 recommendations: A1a, A1b, B1a)
- Stage 2 rows seeded by `seedPrototypeStage2RowData` in `assessments.js`
- Row completion uses two different functions — keep them consistent:
  - `isStage2RowComplete` (assessments.js) — checks `quarter1 && quarter2`
  - `validateStage2Row` (flow.js) — checks ALL fields including `quarter3`, `quarter4`, `nextYearStarts` as MM/YY
  - The template `iip-stage2-review.html` uses the stricter inline check (all quarters)
  - Seed data: A1a and A1b have all 5 quarter fields set (complete), B1a has quarter1 empty (incomplete) → "2 of 3 complete" story

## Task list (`/assessments/current/journey`) — round-2 wiring

**Before you assess section:**
1. Add people → `buildOnboardingRolesSummary` → `/assessments/current/annual-setup/roles`
2. Review services/systems → `buildScopeReviewSummary` → locked until scopeReview done

**Complete the assessment section (in order, each unlocks the next):**
1. Choose what to assess → `buildAnnualSetupSummary` → Complete in demo
2. Assign outcome owners → `buildWhoInvolvedSummary` → based on progressTracker ownership
3. Organisation self-assessment (A&D) → `buildADJourneySummary` → counts `selfAssess.ad[id].judgement`
4. Critical systems (B&C) → `buildBCJourneySummary` → counts `selfAssess.bc[systemId].outcomes.B2a.judgement`
5. Send for review → `buildCompleteSelfAssessmentSummary` → locked until adReview + bcReview complete flags set
6. Review submitted → `buildReviewSelfAssessmentSummary` → locked until `in_review` status
7. Approve reviewed → `buildApproveSelfAssessmentSummary` → locked until `ready_for_approval`
8. Send to assurer → `buildSendToAssurerSummary` → locked until `approved`
9. Review assurance report → `buildAssuranceReportJourneySummary` → locked until `assurerSubmission.submitted`; complete when `stage1Report.finalisedAt` set
10. Complete your Improvement and Implementation Plan → `buildRecommendationsJourneySummary` → locked until `stage1Report.finalisedAt` set
11. Finalise record → `buildFinaliseJourneySummary` → locked until assurance report finalised

## Research rounds demo panel structure

The demo panel at `/research-rounds` is divided by role:

- **CAF lead — self-assessment** (Morgan Ellis): dashboard, B2.a overview, final judgement, completed outcome, carried-forward task list
- **CAF lead — review and submission** (Morgan Ellis): review draft, send to assurer
- **CAF lead — post-assurance** (Morgan Ellis): receive assurance report, create implementation plan, IIP ready for review
- **Assurer journey** (Jordan Blake): assessment overview, outcome review, IIP review, assurance summary

Each section clearly states the signed-in user. Assurer scenes reset `req.session.data.assurerAlpha` before redirecting.

## Design and content conventions

### Back link placement
Back links must sit **above** the `govuk-grid-row` div — never inside a column. Placing a back link inside `govuk-grid-column-two-thirds` constrains it to column width and breaks the GDS layout pattern. Every template should follow:
```html
<a class="govuk-back-link" href="{{ backHref }}">Back</a>
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    ...
```

### pageTitle must match H1
The `pageTitle` passed from the route (used as the browser tab title) must match or be very close to the page's H1. Mismatches disorient screen reader users and fail GDS guidelines.

### No self-describing intro paragraphs
Never write "Use this page to..." or "Review the [X] before you continue." — copy that describes the page rather than helping the user. The H1 and component labels do this work. Delete these on sight.

### Inset text — correct use only
`govuk-inset-text` is for important information that stands apart from surrounding content (e.g. a policy caveat, a constraint the user must act on). Do NOT use it for:
- Record counts ("3 services listed") — use a plain `govuk-body` paragraph
- Form preamble ("Enter your name and email") — use field hint text
- Completion confirmations — use a notification banner or task tag

### Check-answers pages
- Button label: **"Confirm and continue"** — not "Save and continue" (saving happened per question)
- No secondary link in the button group — the back link handles backwards navigation; Change links handle individual edits
- No intro paragraph, no H2 above the summary list

### "for example" not "i.e."
GDS content style requires plain English. Replace all instances of "i.e." with "for example".

## `appPageHeader` component (`app/views/components/page-header.njk`)

Rendering order (top to bottom): caption → H1 → intro → save reassurance → hint → guidance box.

The guidance box (`govuk-details`) renders **last** — after the intro and hint — so users read the question and instruction before the optional supplementary help.

**`introClass` param:** defaults to `govuk-body`. Pass `introClass: "govuk-hint"` on question pages where the intro is a step counter ("Question 1 of 7") so it renders visually lighter than body content.

## Round-2 auth and account setup flow

```
/round-2/start → sign in | join council | request access
/round-2/sign-in → pages/round-2/auth (mode: sign-in)
/round-2/register → pages/round-2/auth (mode: register)
/council-setup → set council name → redirects to /assessments/current/dashboard or /onboarding
```

- Back link on `/council-setup` goes to `/round-2/sign-in` (not `/logout`)
- Register secondary links appear below the form as a paragraph, not inside the button group
- Name validation: empty check only — do NOT validate for spaces (GDS anti-pattern)
- POST `/round-2/start` was removed — the start button is an anchor, no form needed

## Onboarding and scope setup flow

**`/onboarding`** — page title and H1: "Set up your account" (not "Council onboarding and setup"). Single task in the task list (`buildOnboardingTasks` always returns one item). Completion state: conditional intro text via `appPageHeader`, no inset text.

**`/stages/2/scope/context`** — start page title/H1: "Add your council context". Context questions use `scope-context-question.html` (shared template for all steps). Step counter passed as `intro` with `introClass: "govuk-hint"`.

**`/stages/2/scope/services/review`** — two submit buttons in a single form, both POST to `/stages/2/scope/services/review`. The `servicesReviewAction` session key controls redirect:
- `"continue"` → `/stages/2/scope/systems/review`
- anything else → onboarding (via `redirectToScopeReviewReturnOr`)

## Things NOT to change without good reason

- `PROTOTYPE_OUTCOME_LIMITS` — changing these breaks BC outcome counting everywhere
- The `assurerAlpha` session namespace — assurer state must stay separate from council state
- `ensurePrototypeRecommendationSeed` / `ensureIipStage2Data` — these are idempotent guards, always called before IIP pages render
- Internal field names `rationale`, `b2aRationale` — user-facing label is "reason" but the data key stays as `rationale`
