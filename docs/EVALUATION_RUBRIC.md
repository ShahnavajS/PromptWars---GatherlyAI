# Gatherly AI — Evaluation Rubric & Measurable Quality Standards

This rubric defines the 14 internal evaluation criteria, observable evidence of success, and catastrophic failure conditions for **Gatherly AI**.

---

## Evaluation Matrix

| # | Criterion | Observable Evidence of Success (Target = 10/10) | High-Impact Failure Condition (Disqualifier) |
| :--- | :--- | :--- | :--- |
| **1** | **Problem Statement Alignment** | Transforms natural language event ideas into structured, editable, connected plans for weddings, birthdays, and community events with cultural nuance. | Generates an uneditable static text response or generic to-do list without connected domain data. |
| **2** | **Core Functionality** | End-to-end operational workspace: Create event, view dashboard, allocate budget, manage multi-day tasks, compare vendor quotes, and view change impacts. | Broken buttons, non-functional forms, placeholder screens that appear complete but do nothing. |
| **3** | **AI Usefulness & Output Quality** | Gemini generates rich, culturally context-aware itineraries, budget proposals, and vendor criteria validated by Zod schemas. | Hallucinated pricing presented as verified fact; broken JSON syntax crashes the application. |
| **4** | **Budget Correctness** | 100% deterministic arithmetic in integer paise. Allocated sum, actual paid, and remaining balance calculate accurately with Lakh/Crore formatting. | Floating-point rounding errors (`₹12.00000004 Lakh`), negative balances unflagged, duplicate expense tallying. |
| **5** | **Timeline Correctness** | Multi-day ceremony timelines handle timezone boundaries (`Asia/Kolkata`) gracefully. Deadlines and dependency ordering resolve properly. | Date shifting silently overwrites completed milestones or schedules tasks after the event has concluded. |
| **6** | **Security & Privacy** | Strict server-side event ownership verification prevents IDOR. Server-side API key storage. Prompt injection defense blocks hostile overrides. | Leakage of Gemini API key to client bundle; User A reading or modifying User B's private event data. |
| **7** | **Performance & Efficiency** | Initial page load < 1.5s, client-side dashboard transitions < 150ms, AI streaming/loading states with visual feedback. | Unresponsive UI freezing during AI call; unoptimized mega-payloads exceeding memory limits. |
| **8** | **Code Quality** | Modular TypeScript with zero `any` shortcuts, strict type-checking, Drizzle schema integrity, clean separation of concerns. | Spagetti code mixing UI components with raw SQL queries; silent suppression of runtime errors. |
| **9** | **Testing** | Automated Vitest test suite covering financial calculations, change impact rules, date logic, and schema validation. | Zero automated tests; claims of passing tests without running verification commands. |
| **10** | **Accessibility (WCAG 2.2 AA)** | High contrast color palette, visible keyboard focus indicators, descriptive ARIA attributes, semantic HTML elements. | Form inputs without associated `<label>`, unnavigable with keyboard Tab key, unreadable low-contrast text. |
| **11** | **Responsive Design** | Flawless rendering from 320px mobile viewports (smartphones) to 768px (tablets) and 1440px+ (desktop workstations). | Horizontal overflow scrollbars on mobile; overlapping buttons on narrow screens. |
| **12** | **User Experience & Visual Delight** | Colorful, playful, modern aesthetic; warm cards; clear badges; thoughtful empty states; intuitive navigation. | Bland unstyled tables, chaotic clashing neon gradients, intimidating wall-of-text forms. |
| **13** | **Reliability & Resilience** | Graceful fallback templates if Gemini API fails or times out. Idempotent mutations prevent duplicate entries on retry. | White screen of death on API error; database corruption when user refreshes mid-generation. |
| **14** | **Demo Clarity** | Cohesive, compelling 3-minute demo narrative showcasing intake, reviewable plan generation, budget tracking, and change impact alert. | Demo relies on hand-waving or manual DB manipulation because frontend flow is disconnected. |

---

## Verification Checklist for Release

- [ ] `npm run type-check` exits with 0 errors.
- [ ] `npm run lint` exits with 0 warnings/errors.
- [ ] `npm test` executes and passes all test suites.
- [ ] `npm run build` completes a production Next.js build without warnings.
- [ ] Manual test: Changing guest count triggers change-impact alert without corrupting confirmed budget.
- [ ] Manual test: Refreshing browser preserves full event workspace state.
