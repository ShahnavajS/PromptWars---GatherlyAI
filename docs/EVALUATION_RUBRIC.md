# Evaluation rubric

This is an internal checklist for the PromptWars challenge, not an external score or WCAG certification.

| Criterion | Evidence to inspect |
| --- | --- |
| Code quality | Clear route/service/domain boundaries, readable TypeScript, ownership checks, one known SQLite runtime DDL path, limited duplicated logic |
| Security | Password verification before token issuance, explicit production demo setting, event scoping, Origin checks, input and upload limits, no secret or model-content logs |
| Efficiency | Fixed-query event listing, bounded request bodies, per-user generation limits, no stored abandoned PDFs |
| Testing | Unit and route integration tests for budgets, identity, partial acceptance, dates, timeline, vendors, and change impacts; passing production build |
| Accessibility | Programmatic form names, selected navigation state, keyboard focus and Escape in quote dialog, live errors and status; manual screen-reader and contrast review still required |
| Challenge fit | Wedding, birthday, and community plans show budgets, timelines, vendor requirements, preparation tasks, and personalized ideas with review before writing |

A release claim should include the exact commands and results observed on that release. Do not claim live Gemini quality, mobile usability, or WCAG conformance from code inspection alone.
