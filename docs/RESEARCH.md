# Independent problem research

Status: research complete on 30 October 2026. This section started from the challenge statement before evaluating the repository, so existing features did not set the research agenda.

## Problem definition

A useful planning assistant turns a loose event brief into a realistic plan that a person can inspect and change. It should track cost, deadlines, responsibilities, vendors, and event-specific constraints. Generative suggestions need to be grounded in the person's inputs, clearly editable, and safe to reject.

## Blank-slate product model

1. Capture event type, date or date range, location, headcount, budget and currency, priorities, cultural/access needs, and planning stage.
2. Create a budget with category allocations, contingency, committed amounts, paid amounts, and remaining cash need. Surface inconsistencies.
3. Build a dated task plan with dependencies, owners, deadlines, and reminders or exports.
4. Track vendor requirements, quotes, contacts, decision status, deposits, and contract dates.
5. Generate ideas and a first plan, explaining assumptions and allowing review before any persistent change.
6. Show how a date, guest-count, or budget change affects costs, tasks, and vendors.
7. Provide practical paths for weddings, birthdays, and community events without forcing one event type's workflow onto the others.

## Research questions

- Which workflows and constraints are repeatedly useful across the three event types?
- Which comparable projects offer useful patterns, and what limits do their examples have?
- What official standards and guidance apply to identity, file uploads, LLM output, accessibility, and data protection?
- Which ideas can be delivered with a small, coherent code change instead of a broad new subsystem?

## What the independent research suggests

### Essential workflows by event type

| Event | Planning needs that should shape the product |
| --- | --- |
| Wedding | Budget and guest count shape the venue and vendor search; planning dates run backward from the event date; contracts, deposits, invitations, RSVPs, and a day-of schedule become important over a long timeline. [The Knot](https://www.theknot.com/content/12-month-wedding-planning-countdown) |
| Birthday | A shorter timeline typically centers on the person, theme or activity, guest list, invitations, venue, food and cake, entertainment, and a day-of schedule. The product should not require a wedding-scale vendor process. [GiftList](https://giftlist.com/blog/birthday-party-checklist-timeline) |
| Community event | Planning may need volunteers, permits, insurance, accessibility, safety, funding, site logistics, and weather contingencies. These are jurisdiction-dependent prompts for organizer review, never universal legal conclusions. [Wyndham City Council](https://www.wyndham.vic.gov.au/events-experiences/events-and-filming-wyndham/community-event-planning-guide), [NSW Government](https://www.nsw.gov.au/departments-and-agencies/premiers-department/community-engagement/event-starter-guide/volunteers) |

Event accessibility belongs in the plan itself: venue routes, seating, toilets, communications, support services, and budget. It is distinct from accessibility of the software interface. [Ontario accessible events guide](https://www.ontario.ca/page/guide-accessible-events), [Australian Government cost guidance](https://www.disabilitygateway.gov.au/ads/strategy/good-practice-guidelines/consider-time-and-cost)

### Comparable open-source projects

| Project | Relevant idea | Boundary for this challenge |
| --- | --- | --- |
| [VowSuite Wedding Planning Studio](https://github.com/Gab8511/wedding-planning-studio) | Cash-flow and payment tracking, vendor contract status, task dependencies, event-day operations | Wedding-specific scope and many features; borrow workflow clarity, not its full breadth. |
| [Fiancé](https://github.com/Drakkar-Software/Fiance) | Guest, invitation, vendor, task, and budget views; offline and privacy emphasis | Wedding-specific; privacy and data portability are more reusable than the feature count. |
| [FOSSASIA Open Event](https://github.com/fossasia/open-event) | Community event schedules, organizer roles, and portable event data | Ticketing, public pages, and conference operations are outside the core planning brief unless evidence shows demand. |
| [Eventyay](https://github.com/fossasia/eventyay) | Registration, check-in, volunteer and operations patterns for larger public events | Its platform breadth would overcomplicate a concise planning assistant. |

These repositories are design references, not proof that any feature is needed or safe to copy. No code or data was copied.

### Responsible AI and software baseline

- Treat documents, event notes, and model output as untrusted. Keep model output in a review step and validate it in application code; provider-side structured JSON alone does not enforce all value constraints. [OWASP GenAI](https://genai.owasp.org/initiatives/top-10-for-llm-and-genai/), [Gemini structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output)
- Authorize every event read and write for the current user; bound requests and file uploads, validate file content rather than trusting filename or MIME header, and store uploads under generated names outside public serving paths. [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [OWASP input validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- Make form labels, error text, keyboard reachability, visible focus, and status announcements work throughout the planner. Assess against [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Blank-slate implementation priority

1. **Reliable core:** event brief, editable budget, task plan, vendor checklist, and event-specific starter templates.
2. **Useful AI:** generate a bounded proposal from the brief; show assumptions and uncertainty; validate and review before applying it.
3. **Decision support:** show budget/guest/date change effects, quote comparisons, and the next few actions.
4. **Trust:** per-user access, upload protections, clear data handling, keyboard and screen-reader flows, and meaningful tests.
5. **Optional expansions after the core works:** collaborator roles, RSVP/guest lists, calendar export, cash-flow tracking, and community-event operations. Each adds data and access complexity, so prioritize against observed gaps.

The source research above was completed before reading this repository's product and architecture documents. The next section of the review will test these hypotheses against the implementation.

## Ideas evaluated after comparison with the source

| Opportunity | Why it could matter | Smallest useful version | Priority |
| --- | --- | --- | --- |
| Reviewable vendor checklist from AI | The brief explicitly names vendor checklists, and the model already returns requirements that the UI currently hides. | Display each requirement and let the organizer adopt it into the existing requirement table. | High |
| Event-type-specific planning prompts | Birthday and community users need different next actions from a wedding planner. | Separate short templates and examples for the three named types; keep neutral defaults. | High |
| Event accessibility checklist | Physical event access affects venue, budget, and communications, especially community gatherings. | Ask a few optional access questions and add reviewable tasks for venue route, seating, toilets, and communications. | Medium |
| Budget decision ledger | An allocation alone does not show what is quoted, committed, paid, or still due. | Add only the minimum fields needed to show committed and paid against the budget, with clear currency rules. | Medium |
| Calendar export and portable plan | Dates and contacts need to leave the app for actual coordination; open projects emphasize data portability. | Download an `.ics`/CSV or printable plan using existing data; no calendar OAuth required. | Medium |
| Community event readiness | Public events can require volunteers, local approvals, contingency, and safety checks. | Offer a configurable review checklist with jurisdiction-dependent wording, not legal conclusions. | Medium |
| Real-time vendor marketplace or autonomous negotiation | Could look novel in a demo but creates unverifiable pricing, consent, quality, and security issues. | Defer until a real provider integration and explicit authorization model exist. | Low |
| Ticketing, seating charts, and public event pages | Valuable in specialized products, but they add large data and access surfaces outside the core brief. | Defer unless user research or evaluator feedback shows these are necessary. | Low |

The LawGuide AI PromptWars reference showed a useful submission discipline: fix measured defects, validate AI output at both provider and application boundaries, keep modules readable, verify accessibility states, and report test/build results honestly. Gatherly's priorities differ because event budgets and user identity are its most immediate integrity risks. See `REVIEW.md` for the repository-specific findings.
