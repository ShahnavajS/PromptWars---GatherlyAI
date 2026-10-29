# Gatherly AI — Product Specification

**Working Tagline:** *Plan smarter. Spend wisely. Bring everyone together.*  
**Product Category:** GenAI-Powered Event Planning & Coordination Platform  
**Target Market:** India-first, designed with an architecture that seamlessly scales internationally.

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Planning personal, family, and community events—especially large-scale Indian weddings, milestone celebrations, and community gatherings—is notoriously chaotic, fragmented, and stressful:
- **Fragmented Tools:** Planners and families juggle disconnected Excel spreadsheets, WhatsApp group chats, physical diaries, vendor PDFs, and scattered notes.
- **Unpredictable Budgets:** Budget overruns are standard because cost estimates are detached from guest counts, actual vendor quotations, and payment milestones.
- **Cascading Chaos Upon Changes:** When a core assumption changes (e.g., guest count expands from 200 to 280, or the wedding date shifts by two weeks), planners lack visibility into what breaks across catering, venue capacity, vendor deadlines, advance payments, and seating.
- **Generic AI Fallacy:** Standard chatbots emit generic checklists without understanding cultural nuance, financial constraints, mathematical relationships, or the distinction between speculative estimates and confirmed commitments.

### 1.2 The Gatherly Solution
Gatherly AI transforms an event concept into an **editable, mathematically grounded, and culturally intelligent event workspace**. Rather than a one-time checklist generator, Gatherly operates as an interactive co-pilot that helps organizers answer five foundational questions:
1. **What should we plan?** (Intake & structured multi-day itinerary with cultural preferences)
2. **How much will it cost?** (Deterministic budget breakdown with explicit estimate vs. actual tracking)
3. **What needs to happen, and by when?** (Chronological preparation timeline, dependencies, and ownership)
4. **Which vendors and people are involved?** (Vendor requirements, quotation summarization, and team delegations)
5. **What changes when our requirements change?** (Connected change-impact intelligence with explainable suggestions)

---

## 2. Target Audience & Personas

| Persona | Primary Goals | Key Pain Points | Core Feature Needs |
| :--- | :--- | :--- | :--- |
| **Priya & Rohan**<br>*(Couple planning a 2-day wedding)* | Coordinate Sangeet, Wedding, and Reception with 300 guests across 2 venues within a ₹15 Lakh budget. | Juggling caterer quotes, decor changes, guest dietary needs (Jain/Veg), and timeline clashes. | Multi-day schedule, budget allocation by ceremony, vendor quote comparisons, change impact on guest scaling. |
| **Anita Sharma**<br>*(Parent organizing a milestone 50th birthday)* | Host a vibrant 80-guest dinner celebration with memorable entertainment, AV setup, and dietary accommodations. | Forgetting advance booking milestones; unexpected surprise expenses; coordinating family tasks. | Single-day celebration template, clear payment deadlines, family task delegation, RSVPs. |
| **Vikram Patel**<br>*(Community Festival Coordinator)* | Organize a 500-attendee Diwali Mela or society sports day with volunteer task forces. | Volunteer accountability, venue permit deadlines, vendor logistics, tracking contributions. | Community event mode, volunteer task assignment, milestone checklist, contingency buffer. |
| **Meera Sen**<br>*(Independent Professional Event Planner)* | Manage 3–5 client events concurrently with distinct client preferences and vendor pools. | Keeping client budgets transparent; preventing scope creep; audit logging of client approvals. | Workspace event isolation, client-facing reviewable suggestions, vendor contract tracking, change logs. |

---

## 3. Core Use Cases & User Journeys

### User Journey 1: Natural-Language Intake to Structured Plan
1. **Intake:** User describes event: *"Plan a 2-day Gujarati wedding in Ahmedabad for 250 guests with a ₹12 Lakh budget. We need pure vegetarian and Jain food, a colorful modern theme, and elderly-friendly seating."*
2. **AI Co-Pilot Processing:** Gatherly passes the requirements to Gemini 2.5 Flash via `@google/genai` with a strict JSON schema.
3. **Runtime Schema Validation:** The system validates the output against a Zod schema before database ingestion.
4. **Interactive Review:** The user is presented with a **Reviewable Suggestion Workspace**:
   - Proposed ceremonies (Mehendi, Sangeet, Wedding Ceremony, Reception).
   - Recommended budget breakdown with category limits.
   - Recommended timeline with milestone deadlines.
   - Initial vendor checklist.
5. **Acceptance & Deterministic Storage:** User accepts/modifies the suggestion. The application calculates exact totals in minor units (paise) and creates persistent records.

### User Journey 2: Connected Change-Impact Intelligence
1. **Trigger:** User updates the guest count from 250 to 320.
2. **Domain Rules Engine Execution:** The deterministic rules engine checks:
   - *Catering Impact:* Per-plate catering cost escalates proportionally.
   - *Venue Capacity:* Alerts user if the selected hall capacity is exceeded.
   - *Budget Deviation:* Shows projected total budget deficit.
   - *Invitations & Seating:* Flags task for printing extra invitation cards and seating cards.
3. **Explainable AI Summary:** The AI generates a concise, human-readable impact card explaining:
   - *What changed:* 70 additional guests (+28%).
   - *Estimated cost shift:* ₹1,40,000 estimated addition based on ₹2,000/plate catering estimate.
   - *Action required:* "Review catering quotation", "Confirm hall seating capacity with Grand Bhagwati venue".
4. **User Control:** The user decides whether to reallocate budget from decoration, increase the total budget cap, or modify the guest list.

### User Journey 3: Vendor Quotation Analysis & Tracking
1. **Requirement Generation:** System generates structured vendor RFP criteria (e.g., sound system, 500W generators, photography team with drone).
2. **Quotation Ingestion:** User inputs quotes received from 2–3 caterers or decorators.
3. **Side-by-Side Comparison:** Gatherly extracts inclusions, exclusions, tax terms, cancellation policies, and cost per head.
4. **Conversion to Confirmed Commitment:** When a vendor is awarded, the quote is marked `CONFIRMED`. Confirmed expenses are locked against accidental AI overwrite.

---

## 4. MVP Scope vs. Future Roadmap

### In Scope for MVP (Phases 1–6)
- **Multi-Event Workspace:** User can create, view, switch, and manage multiple events.
- **Natural-Language AI Intake:** Guided intake wizard + conversational prompt generation.
- **Deterministic Budget Engine:** Real-time calculation of planned, allocated, estimated, quoted, confirmed, and paid amounts. Multi-currency architecture with INR (`₹`, Lakhs/Crores) default.
- **Multi-Day Timeline & Milestones:** Day-by-day ceremony scheduling with timezone-aware datetime handling (`Asia/Kolkata` default).
- **Task Management & Dependencies:** Task statuses (`TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`), assignees, and deadlines.
- **Explainable Change-Impact Engine:** Rule-based detection of capacity, budget, catering, and deadline disruptions when key parameters change.
- **Vendor Requirement & Quotation Tracker:** Vendor requirements checklist, quote logger, status workflow (`PROSPECT`, `QUOTED`, `CONFIRMED`, `DECLINED`).
- **Cultural & Dietary Customization:** Support for Indian regional wedding customs, dietary categorizations (Pure Veg, Jain, Non-Veg, Halal, Vegan), accessibility flags.
- **Zero-AI Overwrite Safety:** Strict distinction between AI suggestions and confirmed user records. All AI updates require explicit acceptance.
- **Comprehensive Verification Suite:** Unit tests for budget math and change-impact rules; integration tests for DB operations; schema validations.

### Explicit Non-Goals for Initial Release
- **No Direct Financial Transactions:** Gatherly tracks payments, deposits, and due dates; it does not process live UPI or credit card payments.
- **No Live Vendor Scraping:** Gatherly does not scrape Justdial, WedMeGood, or Google Maps to fabricate live vendor pricing or claim fake live availability.
- **No Autonomous Booking:** Gatherly will never automatically contact vendors or book venues on behalf of the user without explicit human action.
- **No Distributed Enterprise Microservices:** Kept as a robust, single-process modular monolith for optimal hackathon velocity, zero network partitioning bugs, and instant local deployment.

---

## 5. Main Differentiator: Explainable Connected Intelligence

| Traditional Planning Tools | Gatherly AI |
| :--- | :--- |
| Static to-do list / spreadsheet | Relational workspace connecting guests, budget, timeline, and vendors. |
| Changing one cell breaks spreadsheet formulas or goes unnoticed. | **Change-Impact Engine** analyzes ripple effects and explains exactly what needs review. |
| Chatbots hallucinate random numbers and fake pricing. | **Deterministic Math Engine** computes exact sums; AI only generates suggestions and explanations. |
| AI modifies data silently behind the scenes. | **Reviewable Suggestions:** Every AI proposal is an uncommitted draft until user clicks "Accept". |
| Western-centric single-day planning templates. | Built from the ground up for **multi-day, multi-ceremony, multi-dietary, and multi-generational** Indian and international events. |

---

## 6. Functional Acceptance Criteria

1. **Deterministic Accuracy:** Total budget allocations and spent sums must compute to the exact paisa/cent without floating-point error.
2. **Schema Invariant:** No AI-generated plan may be saved to the database unless it passes 100% of runtime Zod schema validations.
3. **Change Impact Transparency:** Changing event date, guest count, or budget must produce a structured Change Impact Report highlighting affected dependencies.
4. **State Isolation:** User A must never read, modify, or leak User B's events, budgets, or guest lists.
5. **Accessibility Standards:** Meets WCAG 2.2 AA contrast standards, keyboard navigability, and clear assistive labels across all interactive elements.
