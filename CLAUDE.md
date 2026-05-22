# Shital Vacuum Treat ERP — Project Context

## Stack
- Frontend: React+Vite, TailwindCSS, TanStack Query, React Router v6 — `frontend/src/`
- Backend: Node.js+Express, Prisma ORM, MySQL — `backend/src/`
- DB schema: `backend/prisma/schema.prisma` | Migrations: `backend/prisma/migrations/`

## Business Workflow (in order)
1. Customer brings tools → **Inward Entry** (`/jobwork/inward-entry`) → creates `JobworkChallan`
2. Challan → **Job Card** (`/jobcards`) → `JobCard`
3. Job Card → **VHT Run Sheet** (`/manufacturing/runsheet`) → `VHTRunsheet`
4. Run Sheet → **Test Certificate** (`/quality/certificates`) → `TestCertificate`
5. Certificate → **Tax Invoice** (`/invoices`) → `TaxInvoice`
6. Pending Dashboard (`/pending`) shows items stuck at each stage

## Key Models
- `Party` (partyType: CUSTOMER/VENDOR/BOTH) — BOTH = Shital itself
- `JobworkChallan` + `ChallanItem` (has processTypeId, processName, partName fields)
- `JobCard` + `IncomingInspection`
- `VHTRunsheet`
- `TestCertificate`
- `TaxInvoice` + `InvoiceItem`
- `ProcessType` — process master (Hardening, Tempering etc.) with pricePerKg, minCharge, hsnSacCode
- `DispatchChallan` — outward dispatch

## Auto-flow Endpoints (backend)
- `POST /jobwork/inward` — create challan only
- `POST /jobwork/jobcard-from-challan` — challan → job card
- `POST /jobwork/runsheet-from-jobcard` — job card → run sheet
- `POST /jobwork/inward-to-runsheet` — challan + job card + run sheet in one shot

## Print Pages (all use shared `PrintHeader` component)
- `InvoicePrint.jsx` — TAX INVOICE
- `CertPrint.jsx` — TEST CERTIFICATE
- `JobCardPrint.jsx` — JOB CARD
- `VHTRunsheetPrint.jsx` — VHT RUN SHEET
- `JobworkPrint.jsx` — JOBWORK CHALLAN

## Shared Components
- `PrintHeader.jsx` — company logo (SVT SVG) + TUV logo + title
- `COMPANY` const in PrintHeader — name, address, gstin, email, phone
- `useMasterData.ts` hooks: `useParties()`, `useItems()`, `useMachines()`, `useProcesses()`

## Auth
- JWT-based, roles: ADMIN > MANAGER > OPERATOR > VIEWER
- `middleware/auth.js` — verifyToken
- Routes: admin pages require ADMIN/MANAGER role

## Company Info
- Main company (ERP owner): **SHEETAL DIES & TOOLS PVT. LTD.**
- GSTIN: 27AANCS2087B1ZA
- Address: OM Sai Industrial Premises Co.Op.Soc., Plot No. 84/2, Sector No. 10, PCNTDA, Bhosari, Pune – 411026
- Email: info@sheetaldies.in | Phone: 09822012850
- Job worker / processor: SHITAL VACUUM TREAT PVT. LTD. (GSTIN: 27AATCS0577L1ZK) — this is toParty in challans

## Business Flow (corrected)
- Customers bring their tools/dies TO Sheetal Dies & Tools
- Sheetal sends material to Shital Vacuum Treat for heat treatment (job work)
- fromParty in InwardChallan = CUSTOMER (who brings material)
- toParty in InwardChallan = SHITAL VACUUM TREAT (VENDOR/BOTH party type = processor)

## Dev Notes
- Backend port: 5000 | Frontend port: 5173 (Vite)
- `toNum()` / `toInt()` from `backend/src/utils/normalize.js` and `frontend/src/utils/normalize.js`
- All monetary values: Decimal(12,2) in DB
- `withTransaction(prisma, async tx => {...})` pattern for multi-step DB ops
- Inward entry: fromParty = CUSTOMER, toParty = BOTH (auto-selected)
- Each ChallanItem has: partName, material, processTypeId, processName, rate, amount (auto-calc = weight × rate)

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
