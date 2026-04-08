# Vacuum Heat Treatment ERP - Workflow State Machine

## 1) Canonical Process Flow

1. Incoming Job  
2. Information Sign from MKT  
3. Incoming Inspection  
4. Job Planning  
5. Job Cleaning  
6. Stress Relieving / Final Stress Relieving  
7. Loading and Masking  
8. Heat Treatment (Hardening / Tempering / Brazing / Annealing / Aging / Sub-Zero / Cryogenic)  
9. Multi Tempering (repeatable if required)  
10. Aging (optional, material/process dependent)  
11. Final Inspection  
12. Decision  
    - OK -> RP Oil Storage -> Dispatch  
    - Not OK -> Rework Annealing -> Reprocessing -> Inspection loop

### Job Work Management (End-to-End)

This ERP also implements the end-to-end job-work commercial flow:

Jobwork Challan → Inward/Outward Register → Job Card → Inspection + Process Log → Test Certificate → Dispatch Challan → Tax Invoice

Hard gating:

- Dispatch requires Test Certificate (when linked to a Job Card).
- Invoice is allowed only for dispatched quantity (no over-invoice).

Hardness decision rule used across Inspection/Certificate:

Let required range be \([r_{min}, r_{max}]\) and achieved range be \([a_{min}, a_{max}]\).

- PASS: \(a_{min} \ge r_{min}\) AND \(a_{max} \le r_{max}\)
- FAIL: \(a_{max} < r_{min}\) OR \(a_{min} > r_{max}\)
- CONDITIONAL: otherwise

---

## 2) State Machine (Business States)

- `NOT_STARTED`
- `IN_PROGRESS`
- `ON_HOLD`
- `COMPLETED`
- `CANCELLED`

Step-level execution states:

- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `FAILED`
- `SKIPPED`

---

## 3) Step Definitions (Template Driven)

| Seq | Step Code | Step Name | Type | Mandatory | Repeatable | Key Validation |
|---|---|---|---|---|---|---|
| 1 | `INCOMING_JOB` | Incoming Job | OPERATION | Yes | No | Job card number, party, item, qty required |
| 2 | `MKT_SIGN` | Information Sign from MKT | OPERATION | Yes | No | MKT approval/sign-off required |
| 3 | `INCOMING_INSPECTION` | Incoming Inspection | INSPECTION | Yes | No | QC result required (`PASS/FAIL/CONDITIONAL`) |
| 4 | `JOB_PLANNING` | Job Planning | OPERATION | Yes | No | Machine/furnace planning and due time required |
| 5 | `JOB_CLEANING` | Job Cleaning | OPERATION | Yes | No | Cleaning checklist required |
| 6 | `STRESS_RELIEVING` | Stress Relieving | OPERATION | Conditional | Yes | Machine + cycle params required |
| 7 | `LOADING_MASKING` | Loading and Masking | OPERATION | Yes | No | Loading operator + masking status required |
| 8 | `HEAT_TREATMENT` | Heat Treatment Process | OPERATION | Yes | Yes | Furnace, cycle, temp/time params required |
| 9 | `MULTI_TEMPERING` | Multi Tempering | LOOP | Conditional | Yes | Tempering pass count and readings required |
| 10 | `AGING_OPTIONAL` | Aging (Optional) | OPERATION | No | Yes | Execute only when required by rule |
| 11 | `FINAL_INSPECTION` | Final Inspection | INSPECTION | Yes | No | Final QC mandatory before dispatch |
| 12 | `RP_OIL_STORAGE` | Storage with RP Oil | OPERATION | Yes | No | Storage confirmation and packed qty required |
| 13 | `DISPATCH` | Dispatch | DISPATCH | Yes | No | Allowed only after final QC pass |
| 14 | `REWORK_ANNEALING` | Rework Annealing | LOOP | Conditional | Yes | Trigger only on fail path |

---

## 4) Transition Table (No Hardcoding, Config Driven)

| From | To | Condition Type | Condition |
|---|---|---|---|
| `INCOMING_JOB` | `MKT_SIGN` | `ALWAYS` | Initial progression |
| `MKT_SIGN` | `INCOMING_INSPECTION` | `ALWAYS` | Sign complete |
| `INCOMING_INSPECTION` | `JOB_PLANNING` | `QC_PASS` | Incoming QC pass/conditional |
| `INCOMING_INSPECTION` | `REWORK_ANNEALING` | `QC_FAIL` | Incoming QC fail |
| `JOB_PLANNING` | `JOB_CLEANING` | `ALWAYS` | Planning complete |
| `JOB_CLEANING` | `STRESS_RELIEVING` | `FIELD_EQUALS` | `needsStressRelieving = true` |
| `JOB_CLEANING` | `LOADING_MASKING` | `FIELD_EQUALS` | `needsStressRelieving = false` |
| `STRESS_RELIEVING` | `LOADING_MASKING` | `ALWAYS` | Step complete |
| `LOADING_MASKING` | `HEAT_TREATMENT` | `ALWAYS` | Ready for furnace |
| `HEAT_TREATMENT` | `MULTI_TEMPERING` | `FIELD_EQUALS` | `needsTempering = true` |
| `HEAT_TREATMENT` | `FINAL_INSPECTION` | `FIELD_EQUALS` | `needsTempering = false` |
| `MULTI_TEMPERING` | `MULTI_TEMPERING` | `FIELD_EQUALS` | `temperingCyclesRemaining > 0` |
| `MULTI_TEMPERING` | `AGING_OPTIONAL` | `FIELD_EQUALS` | `needsAging = true` |
| `MULTI_TEMPERING` | `FINAL_INSPECTION` | `FIELD_EQUALS` | `needsAging = false` |
| `AGING_OPTIONAL` | `FINAL_INSPECTION` | `ALWAYS` | Optional aging done |
| `FINAL_INSPECTION` | `RP_OIL_STORAGE` | `QC_PASS` | Final pass/conditional pass |
| `FINAL_INSPECTION` | `REWORK_ANNEALING` | `QC_FAIL` | Final fail |
| `REWORK_ANNEALING` | `HEAT_TREATMENT` | `ALWAYS` | Reprocess loop |
| `RP_OIL_STORAGE` | `DISPATCH` | `ALWAYS` | Final pre-dispatch done |

---

## 5) Guard Rules (Must Enforce)

1. No skipping steps: only `currentStep` can start/complete.  
2. Mandatory QC for inspection-type steps.  
3. Dispatch blocked unless `FINAL_INSPECTION` is pass/conditional pass.  
4. Rework loop only through configured rework transitions.  
5. Repeatable steps must increment run count (`runNo`).  
6. Machine-required steps cannot start without machine selection.  
7. Every state change must write audit logs and timestamp metadata.

---

## 6) Execution Payload Model (Per Step)

For each step execution, capture:

- `jobWorkflowId`
- `workflowStepId`
- `runNo`
- `status`
- `startedAt`, `endedAt`, `durationSec`
- `operatorName`, `executedById`
- `machineId` (if required)
- `qcResult`, `observations`
- `remarks`
- `inputData` (JSON)
- `outputData` (JSON)
- `attachments` (JSON array)

---

## 7) Example Runtime Path

`INCOMING_JOB` -> `MKT_SIGN` -> `INCOMING_INSPECTION(PASS)` -> `JOB_PLANNING` -> `JOB_CLEANING` -> `STRESS_RELIEVING` -> `LOADING_MASKING` -> `HEAT_TREATMENT` -> `MULTI_TEMPERING x2` -> `FINAL_INSPECTION(FAIL)` -> `REWORK_ANNEALING` -> `HEAT_TREATMENT` -> `MULTI_TEMPERING` -> `FINAL_INSPECTION(PASS)` -> `RP_OIL_STORAGE` -> `DISPATCH`

---

## 8) API Mapping (Implemented/Planned)

- `POST /api/workflows/jobs/:jobCardId/start`
- `POST /api/workflows/jobs/:jobCardId/steps/:stepId/start`
- `POST /api/workflows/jobs/:jobCardId/steps/:stepId/complete`
- `POST /api/workflows/jobs/:jobCardId/rework`
- `GET /api/workflows/jobs/:jobCardId/timeline`
- `GET /api/workflows/jobs/:jobCardId/allowed-actions`

---

## 9) Notes for Scalability

- Keep template + transition engine industry-agnostic.
- Use condition expressions in JSON to avoid code-level hardcoding.
- Version templates (`code + version`) to preserve historical job behavior.
- Support tenant-specific defaults in future SaaS mode.

