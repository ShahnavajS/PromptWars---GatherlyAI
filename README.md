# Gatherly AI

> **Plan smarter. Spend wisely. Bring everyone together.**

Gatherly AI is a GenAI-powered event planning and coordination platform designed from an India-first perspective with an internationally extensible architecture. It transforms natural language event concepts into editable, mathematically grounded, and culturally intelligent workspaces for weddings, birthdays, milestone celebrations, and community gatherings.

---

## 🌟 Key Differentiators

- **Explainable Change-Impact Intelligence:** Understands ripple effects when guest counts, dates, or budgets shift (e.g. venue capacity alerts, catering cost scaling, invitation printing deadlines) without silently breaking confirmed commitments.
- **Deterministic Financial Engine:** 100% exact math in integer minor-units (paise/cents). No floating-point errors. Native Indian numbering system formatting (`₹12,50,000`).
- **Human-in-the-Loop AI Review:** AI proposals remain uncommitted suggestions until the user explicitly accepts or modifies them. Zero silent overwrites.
- **Culturally & Operationally Nuanced:** Native support for multi-day Indian ceremonies (Sangeet, Mehendi, Haldi, Shaadi, Reception), dietary restrictions (Pure Veg, Jain, Halal), and accessibility requirements (elderly seating, wheelchair access).

---

## 🏗️ Architecture & Documentation

Comprehensive architectural and design documentation is maintained in [`docs/`](./docs/):

- [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md): Full product specification, target personas, use cases, and non-goals.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): System architecture, component layout, and Mermaid sequence diagrams.
- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md): Entity relationship diagram, table schemas, and financial invariants.
- [`docs/SECURITY_AND_PRIVACY.md`](./docs/SECURITY_AND_PRIVACY.md): Threat model, prompt injection defenses, IDOR mitigations, and PII protection.
- [`docs/EVALUATION_RUBRIC.md`](./docs/EVALUATION_RUBRIC.md): 14 measurable quality standards and acceptance criteria.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md): Six-phase implementation roadmap from blueprint to production readiness.

---

## 🛠️ Tech Stack (Proposed for Phase 2+)

- **Frontend & App Framework:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS
- **Database & ORM:** SQLite / PostgreSQL with Drizzle ORM
- **GenAI Orchestration:** Google Gemini 2.5 Flash / 2.0 via official `@google/genai` SDK
- **Validation:** Zod for runtime schema validation
- **Testing:** Vitest for deterministic unit and integration test suites

---

## 🚀 Development Status

Currently at **Phase 1: Product Understanding, Repository Inspection & Implementation Blueprint** (Complete).  
Ready for **Phase 2: Project Scaffold & First Functional Vertical Slice**.
