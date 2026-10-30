# Data model

The authoritative typed table definitions are in src/lib/db/schema.ts. Runtime initialization is in src/lib/db/index.ts.

| Table | Purpose |
| --- | --- |
| users | Organizer email, name, salted password hash |
| request_limits | Single-node request counters and reset time |
| events | Owner ID, event type, dates, location, guest count, version |
| event_budgets | Total INR budget and contingency in paise |
| budget_categories | Named allocations and estimates, stable IDs for quote links |
| event_tasks | Preparation checklist, priority, status, due date, provenance |
| event_preferences | Cultural, dietary, decor, entertainment, and accessibility choices |
| ai_plan_suggestions | Generated plan JSON and review status |
| event_schedules | Dated timeline entries and time windows |
| vendor_requirements | Service checklist and sourcing status |
| vendors | Event-scoped provider records |
| vendor_quotes | Quotes, inclusions, exclusions, confirmation, budget category link |
| event_activities | Initial creation and confirmed change-impact history |

Each event has one owner and one budget. The owner ID is checked before event-scoped reads or writes. Budget amounts use integer paise. Plan review preserves category IDs; if selected allocations would overfill the available budget, untouched category allocations are reduced proportionally in the same transaction. A proposal that would put a category below confirmed quote commitments is rejected. A manually edited budget can still become over-budget and is surfaced as an alert.

Vendor quotes may refer to a requirement and budget category. PDF bytes are not stored; a quote stores the source document name and user-confirmed extracted fields.
