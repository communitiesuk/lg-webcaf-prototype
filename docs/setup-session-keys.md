# Setup — the council record (Setup v11)

All Setup state lives in `req.session.data.setup`. It is the contract Decide, the dashboard and AS01
read. **Only answers are stored.** Every list, count, status, issue and summary is worked out from the
record in `app/data/helpers/council-record.js`; nothing stores "which screen to show" or "task
complete". The one stored fact of that kind is `setup.completed`, which records that the CAF Lead
pressed Confirm and finish setup on S30.

`ensureSetup()` (`app/data/helpers/setup.js`) creates an empty record, converts a record saved in the
old format (`migrate()`), and copies the council name and type from the council identified at Claim.

Field names Decide already read are kept (`essentialServices`, `criticalSystems`, `people.approver`,
`councilContext`); their contents follow the v11 model.

## Links are stored once

| Link | Stored on | Other direction |
|---|---|---|
| service ↔ platform | `platform.linkedServices` | `platformsForService()` |
| system ↔ platform | `platform.linkedSystems` | `platformsForSystem()` |
| system ↔ service or function | `system.serviceIds`, `system.functionIds` | `systemsForService()`, `servicesForSystem()` |

A system supports a service when it is linked to the service, or to one of the service's functions.

## The record

| Key | Shape | Set by |
|---|---|---|
| `council.name` | string | Claim (copied by ensureSetup) |
| `council.type` | `county` \| `district` \| `unitary` \| `metropolitan_borough` \| `london_borough` \| `city_of_london` \| `isles_of_scilly` | Claim, from the council register type |
| tier | worked out: county → upper, district → lower, otherwise single | `tierFor()` |
| `people.cafLead` | `{ name, confirmed, pending }` | Claim (v15) / Access A22 |
| `people.approver` | `{ name, jobTitle, confirmed, pending, hasAccount }` | Access A29 |
| `sectorContext.confirmed` | bool | S02 Continue |
| `councilContext.cniSectors` | `[sector]`; never "Government"; may be `["Not applicable"]` | S03 |
| `councilContext.otTypes` | the 11 types, or `["None of these"]` | S03 |
| `councilContext.itChanges` | string, optional ("Recent or planned IT changes"); replaced `itTransformation` on 24 November 2026, which `migrate()` converts | S03 |
| `councilContext.anythingElse` | string | S03 |
| `councilContext.answered` | bool: S03 was saved without errors (CNI and OT are required) | S03 |
| `organisationAssessment.answer` | `within_3_years` \| `more_than_3_years` \| `no` \| `dont_know` | S03a |
| `methodology` | `{ approach: five-lens \| other, notes, link }` | S04, S05 |
| `essentialServices[]` | `{ id, name, source: list \| added, functions: [{id, name}], infraLater }` (`noSystemReason` removed with S42, 24 November 2026) | S35, S09, S10b, S38 |
| `platforms[]` | `{ id, name, type (8 types), managedBy, supplierId, linkedServices, linkedSystems }` | S12c, S38, S45, S20 |
| `suppliers[]` | `{ id, name }`; removed when nothing uses them | S41 |
| `criticalSystems[]` | see below | S14 and the S52 questions |
| `completed` | bool | S30 |

A critical system:

| Key | Shape | Set by |
|---|---|---|
| `id`, `name`, `description` | string | S14 |
| `serviceIds`, `functionIds` | ids | S14, S37d |
| `servicesLater` | bool ("Not sure yet, I'll link it later") | S14 |
| `otherFunctions`, `otherFunctionsDetail`, `otherFunctionsNone` | S19 values | S19 |
| `platformsLater` | bool ("None yet, I'll link this later") | S20 |
| `supplier` | `{ managed: fully \| partially \| no, supplierId, note }` | S15, S16 |
| `shared` | `{ answer: yes \| no, councils: [name] }` | S17, S18 |
| `hosting` | `{ type, provider, secondary }` | S21 |
| `owner` | `{ name, jobTitle }` | S27 |
| `impact` | `{ confidentiality, integrity, availability }` low \| medium \| high | S28 |
| `assessedBefore` | `within_3_years` \| `more_than_3_years` \| `no` \| `dont_know` | S14 |
| `assessedDate` | string, example council only | seed |
| `cni` | bool | Decide (D23, D25, D26) |

Worked out, never stored: criticality (S28 rule), "details complete" (owner and all three ratings),
every status on S01, S23, S36 and S39, the S24 issues, and whether a system can be removed (S48 when it
is in this cycle's approved plan, or was assessed before).

## Decide reads

- `cniSectorChosen()`: a CNI sector other than "Not applicable" (D23 is asked).
- `orgAssessedRecently()` / `systemAssessedRecently()`: only "within the last 3 years" counts as
  already assessed. More than 3 years ago, No and I don't know are assessed again.
