# Product specification

## Challenge fit

Gatherly helps an organizer plan a wedding, birthday, community event, or other celebration. The core flow is: create an event with date, place, guest count, and budget; choose cultural and dietary preferences; request a structured plan; review and accept any proposed changes; manage tasks, timeline, vendors, and quotes; preview the effect of major requirement changes.

The product treats AI as a proposal engine. The organizer owns budget allocations and quote commitments. The system computes money in integer paise and identifies over-budget states.

## Current user journey

1. Sign in or use a clearly enabled demo workspace.
2. Create an event. Type-specific starter categories and task deadlines are created together.
3. Enter planning notes and generate a Gemini plan, or use the labelled starter template if no key is configured.
4. Review the concept, personalized ideas, categories, tasks, agenda, and vendor requirements. Accept all, accept selected items, or dismiss.
5. Edit budget allocations, mark tasks done, add schedule items, track vendor requirements, and compare quotes.
6. Preview changes to guest count, event date, city, or total budget, then confirm selected effects. The app records confirmed requirement changes in event activities.

## Event-type coverage

- Wedding: ceremony planning, guest care, venue/catering/decor/photography budget, multi-day schedule when specified. Regional presets are optional.
- Birthday: party-specific catering, cake, venue, decor, invitations, and entertainment.
- Community: permits, volunteer roles, accessibility, hydration, sound, and safety in the starter and offline plan.

## Scope

The app supports one organizer per account, multiple events, budgets, tasks, schedules, vendor requirements, vendor records, quotes, preferences, and a change-impact history. It uses INR and Asia/Kolkata defaults. It does not manage guest RSVPs, payments, email invitations, vendor communication, confirmed market prices, or bookings.

## Acceptance evidence

TypeScript, lint, automated tests, and production build are required. Browser keyboard, screen-reader, mobile, real PDF, and live Gemini checks are separate manual release gates. Passing unit tests alone is not a WCAG claim.
