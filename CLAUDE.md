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
| `app/routes/research-rounds.js` | Demo control panel routes — scene entry points |
| `app/data/helpers/research-ready.js` | Demo data seeding — `initialiseRoundTwoPostSetupResearch`, `initialiseDemoScene` |
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
| `"completed"` | sys-1 B2a fully judged (Partially achieved) with rationale + evidence | `/self-assess/bc/sys-1/outcomes/B2a/b2a-ready-for-internal-review` |
| `"review"` | All 3 systems judged, adReview/bcReview complete, collaborationWorkflow.status = "in_review" | `/assessments/current/complete-self-assessment` |
| `"send-to-assurer"` | All 3 systems judged, collaborationWorkflow.status = "approved" | `/assessments/current/send-to-assurer` |
| `"post-assurance"` | All 3 systems judged, approved, assurerSubmission.submitted = true, assurance.recordOfAudit submitted, stage1Report finalised with 3 recommendations (A1a high, A1b medium, B1a medium), assurer IGP reviews for A1a and A1b | `/assessments/current/assurance-report` |

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

The final judgement and rationale are combined on one page (`b2a-final-judgement`). The old `b2a-rationale` route redirects to `b2a-final-judgement`.

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

- **CAF lead — self-assessment** (Morgan Ellis): dashboard, B2.a overview, final judgement, completed outcome
- **CAF lead — review and submission** (Morgan Ellis): review draft, send to assurer
- **CAF lead — post-assurance** (Morgan Ellis): receive assurance report, create implementation plan, IIP ready for review
- **Assurer journey** (Jordan Blake): assessment overview, outcome review, IIP review, assurance summary

Each section clearly states the signed-in user. Assurer scenes reset `req.session.data.assurerAlpha` before redirecting.

## Things NOT to change without good reason

- `PROTOTYPE_OUTCOME_LIMITS` — changing these breaks BC outcome counting everywhere
- The `assurerAlpha` session namespace — assurer state must stay separate from council state
- `ensurePrototypeRecommendationSeed` / `ensureIipStage2Data` — these are idempotent guards, always called before IIP pages render
