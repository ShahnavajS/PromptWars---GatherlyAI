# Frontend research and redesign decisions

Researched 30 October 2026 after inspecting the existing pages, forms, workspace components, and styles. The existing frontend is a complete working prototype, but its developer-facing copy, repeated orange utility styles, dense cards, and emoji labels weaken its consumer appeal. This redesign keeps the functional event, budget, task, AI review, timeline, vendor, and preference workflows.

## Evidence and interpretation

| Source | Observed pattern | Gatherly decision |
| --- | --- | --- |
| [Partiful](https://partiful.com/) | A friendly, occasion-first welcome with a clear create action and energetic event imagery. | Lead with the joy of gathering; keep one obvious event-creation action. Do not suggest Gatherly has RSVP or messaging features. |
| [Zola planner](https://www.zola.com/wedding-planning/app) | Inspiration is connected to concrete budget, checklist, and vendor work. | Show the planning loop immediately after the hero, then keep the workspace practical. |
| [VoltAgent DESIGN.md collection](https://github.com/VoltAgent/awesome-design-md) | Reference files document atmosphere, tokens, typography, components, layout, and responsive behavior. | Create a project-owned `DESIGN.md` instead of copying another brand identity. |
| [Airbnb design analysis](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/airbnb/DESIGN.md) | Warm photography, generous whitespace, and rounded consumer controls. | Use an original editorial photograph and approachable card shapes. |
| [Oura design analysis](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/oura/DESIGN.md) | Cream paper, editorial serif, restrained earth tones, and calm reading rhythm. | Pair warm paper and serif display type with a quiet working UI. |
| [Clay design analysis](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/clay/DESIGN.md) | Art-directed color and rounded illustration create distinctiveness. | Use playful supporting color sparingly for event-type cues. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Reflow, focus visibility, contrast, target size, and reduced interaction motion affect everyday usability. | Keep keyboard and narrow-screen operation as design constraints, not cleanup tasks. |
| [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion), [web.dev animation performance](https://web.dev/articles/animations-and-performance) | User motion settings matter; transform and opacity are generally economical animation properties. | Use modest CSS motion with a full reduced-motion fallback. |

## Product-specific interface model

1. **Welcome and orientation:** explain what the planner does in one sentence, show a creation CTA, and illustrate the emotional outcome with original imagery.
2. **Event list:** make each event readable at a glance: occasion, date, city, budget, and task progress. Provide a useful empty state and a clearly labeled sample action.
3. **Event creation:** use progressive visual grouping while retaining one reliable form and native date/number controls. Set defaults that do not assume every event is a large wedding.
4. **Workspace:** keep the event identity and next action visible. Group budget, checklist, ideas, timeline, vendors, and preferences into a consistent navigation model.
5. **AI trust:** visually distinguish generated proposals from saved decisions. Preserve review-before-write and describe fallback content honestly.

## Media choice

The user invited generated photography, video, scrolling effects, and 3D. A generated editorial hero photo plus subtle CSS movement provides a meaningful visual improvement with a small loading and maintenance cost. Autoplay video and Three.js add large runtime weight and can distract from planning tasks, so this version does not add them. The choice can be revisited if user testing shows a benefit.

## Acceptance checks

- All pages share the same tokens and typography.
- Event types receive equally relevant language and visual treatment.
- Existing create, open, edit, review, schedule, and vendor actions remain reachable.
- At 320px and 200% zoom, there is no forced page-level horizontal scrolling.
- Keyboard focus is visible and motion preference is honored.
- Automated type, lint, test, and production build gates pass; browser and assistive-technology QA is recorded separately.
