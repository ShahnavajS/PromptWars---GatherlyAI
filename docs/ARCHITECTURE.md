# Gatherly AI — System Architecture

This document defines the structural blueprint, technical boundaries, security perimeter, and data flows for **Gatherly AI**.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    User["👤 User (Browser Client)"]

    subgraph PresentationLayer["Presentation Layer (Next.js 15+ App Router)"]
        Landing["Landing Page & Onboarding"]
        Dashboard["Event Command Center"]
        Intake["Natural-Language Intake Wizard"]
        PlanReview["AI Plan Review & Diff Viewer"]
        BudgetManager["Deterministic Budget & Expense Tracker"]
        TimelineView["Multi-Day Ceremony & Task Timeline"]
        ChangeImpactUI["Explainable Change-Impact Alerts"]
        VendorHub["Vendor RFP & Quotation Tracker"]
    end

    subgraph APILayer["API & Server Action Layer (Next.js Server Side)"]
        AuthMiddleware["Auth & Session Guard"]
        EventRoutes["/api/events (CRUD & Context)"]
        AIPlannerRoute["/api/ai/generate-plan"]
        ChangeImpactRoute["/api/events/change-impact"]
        BudgetRoutes["/api/budget (Allocations & Expenses)"]
        VendorRoutes["/api/vendors (Quotes & Status)"]
    end

    subgraph CoreServices["Domain Services (Deterministic Business Logic)"]
        PlanGeneratorService["AI Orchestration Service"]
        ChangeImpactEngine["Rule-Based Change Impact Engine"]
        BudgetCalculator["Deterministic Financial Math Engine"]
        TimelineScheduler["Timezone & Dependency Scheduler"]
        AuditLogger["Event Activity & Change Logger"]
    end

    subgraph SecurityAndValidation["Validation & Security Perimeter"]
        ZodValidator["Runtime Zod Schema Validation"]
        PromptSanitizer["Prompt Injection Defense & Redaction"]
        RateLimiter["Server-side Rate Limiting"]
    end

    subgraph ExternalGenAI["External AI Layer"]
        GeminiClient["Google GenAI SDK (@google/genai)"]
        GeminiModel["Gemini 2.5 Flash / 2.0"]
    end

    subgraph PersistenceLayer["Persistence & Storage Layer"]
        DrizzleORM["Drizzle ORM (Type-Safe Query Layer)"]
        Database[("SQLite / PostgreSQL Database")]
        FileStorage["Secure Local / Cloud Document Storage (/uploads)"]
    end

    %% Connections
    User --> PresentationLayer
    PresentationLayer --> AuthMiddleware
    AuthMiddleware --> APILayer
    APILayer --> SecurityAndValidation
    SecurityAndValidation --> CoreServices
    PlanGeneratorService --> PromptSanitizer
    PromptSanitizer --> GeminiClient
    GeminiClient --> GeminiModel
    GeminiModel --> ZodValidator
    ZodValidator --> PlanGeneratorService
    CoreServices --> DrizzleORM
    DrizzleORM --> Database
    VendorRoutes --> FileStorage
```

---

## 2. Component & Module Layout

The codebase follows a clean, modular monolith design inside `src/`:

```
src/
├── app/                              # Next.js App Router (Pages, Layouts, API Routes)
│   ├── (auth)/                       # Login, Register, Profile
│   ├── (dashboard)/                  # Authenticated Workspace
│   │   ├── events/                   # Event List & Creation
│   │   ├── events/[eventId]/         # Event Command Center
│   │   │   ├── budget/               # Budget & Expense Management
│   │   │   ├── timeline/             # Multi-Day Timeline & Tasks
│   │   │   ├── vendors/              # Vendor RFP & Quotations
│   │   │   ├── guests/               # Guest & Dietary Management
│   │   │   ├── impact/               # Change Impact Intelligence
│   │   │   └── settings/             # Cultural, Timezone, Currency Config
│   │   └── layout.tsx                # Dashboard Layout with Navigation
│   ├── api/                          # REST / JSON API Endpoints
│   │   ├── events/                   # Event CRUD
│   │   ├── ai/plan/                  # AI Intake & Structured Plan Generation
│   │   ├── ai/impact/                # AI Change Impact Explanations
│   │   └── vendors/quotes/           # Quote Upload & Processing
│   ├── globals.css                   # Tailwind CSS Theme & Styling
│   └── layout.tsx                    # Root HTML Layout
│
├── components/                       # UI Components (Accessible & Modular)
│   ├── ui/                           # Base design primitives (Button, Card, Modal, Input, Badge, Table)
│   ├── event/                        # Event creation wizards, summaries, preference selectors
│   ├── budget/                       # Category bars, expense forms, currency formatters
│   ├── timeline/                     # Ceremony cards, task checklists, dependency indicators
│   ├── impact/                       # Impact diff callouts, warning banners, actionable suggestions
│   └── vendors/                      # Quote comparison tables, status pills, RFP builders
│
├── lib/                              # Core Infrastructure & Cross-Cutting Concerns
│   ├── db/                           # Database Schema & Migrations
│   │   ├── schema.ts                 # Drizzle Schema Definitions
│   │   ├── index.ts                  # Database Connection Instance
│   │   └── migrations/               # Versioned SQL Migrations
│   ├── ai/                           # GenAI Service Layer
│   │   ├── gemini.ts                 # Google GenAI SDK Client Initialization
│   │   ├── prompts.ts                # Structured Prompts & System Instructions
│   │   └── schemas.ts                # Zod Schemas for Structured AI Outputs
│   ├── domain/                       # Pure Deterministic Business Logic
│   │   ├── budget.ts                 # Integer-paise budget arithmetic & allocations
│   │   ├── impact-engine.ts          # Rule-based change impact detection
│   │   ├── timeline.ts               # Date math, relative offsets, dependency resolution
│   │   └── formatting.ts             # Currency (INR ₹, Lakhs/Crores, USD, EUR), Date (Asia/Kolkata)
│   ├── auth/                         # Authentication & Event-Level Access Control
│   │   ├── session.ts                # Session retrieval & identity validation
│   │   └── permissions.ts            # RBAC & Event-Ownership authorization guards
│   └── utils/                        # Sanitizers, error handlers, string helpers
│
└── tests/                            # Comprehensive Automated Test Suites
    ├── unit/                         # Unit tests (Budget math, impact rules, date calculations)
    ├── integration/                  # DB query tests, schema constraints, migration checks
    └── security/                     # Injection defenses, cross-user isolation tests
```

---

## 3. Data Flow & Request Lifecycles

### 3.1 AI Plan Generation Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as /api/ai/plan
    participant Sanitizer as Input Sanitizer
    participant Gemini as Google GenAI SDK (@google/genai)
    participant Validator as Zod Schema Validator
    participant DB as Database (Draft Table)

    User->>API: POST { eventTitle, eventType, budget, guestCount, location, culturalPreferences, notes }
    API->>Sanitizer: Sanitize input & detect prompt injection markers
    Sanitizer-->>API: Clean sanitized payload
    API->>Gemini: generateContent({ model: 'gemini-2.5-flash', responseSchema: ZodPlanSchema, prompt })
    Gemini-->>API: Raw JSON Output
    API->>Validator: Validate against ZodPlanSchema
    alt Validation Fails
        Validator-->>API: Validation Errors
        API-->>User: 422 Unprocessable Entity (with retry fallback)
    else Validation Succeeds
        Validator-->>API: Valid Typed Event Plan
        API->>DB: Save as `ai_plan_generations` (status: 'PENDING_REVIEW')
        DB-->>API: Saved Suggestion Record
        API-->>User: 200 OK { suggestionId, planPreview }
    end
    Note over User, DB: User reviews proposal in UI, clicks "Accept Plan"
    User->>API: POST /api/events/{id}/accept-plan { suggestionId }
    API->>DB: Atomic Transaction: Convert suggestions into confirmed Budget, Timeline, Tasks
    DB-->>User: Event Workspace Ready
```

---

### 3.2 Change-Impact Intelligence Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant App as Event Dashboard
    participant Engine as Deterministic Change-Impact Engine
    participant Gemini as Gemini AI Explainer
    participant DB as Database

    User->>App: Updates Guest Count: 250 → 320
    App->>Engine: analyzeChange({ eventId, field: 'guestCount', oldVal: 250, newVal: 320 })
    
    rect rgb(240, 248, 255)
        Note over Engine: Deterministic Rule Checks (No LLM hallucinations)
        Engine->>DB: Fetch current venue capacity, catering per-plate, invitation counts
        Engine->>Engine: Check Venue Threshold (Capacity: 300, New: 320 -> EXCEEDED by 20)
        Engine->>Engine: Calculate Catering Delta (+70 plates * ₹1,800 = +₹1,26,000)
        Engine->>Engine: Identify Dependent Tasks (Print Invitations, Seating Arrangement)
    end

    Engine-->>App: Structured Impact Report { severity: 'WARNING', affectedItems, deltaAmount }
    App->>Gemini: generateImpactExplanation(structuredReport)
    Gemini-->>App: Natural-Language Friendly Explanation Card
    App-->>User: Displays Change Alert: "Venue capacity exceeded by 20 guests. Catering budget increases by ₹1,26,000. 2 tasks require review."
```

---

## 4. Deterministic Core vs. Generative AI Separation

To ensure rock-solid financial, legal, and operational reliability, Gatherly establishes an impermeable boundary between deterministic code and AI reasoning:

| Responsibility | Handled By | Why This Boundary Matters |
| :--- | :--- | :--- |
| **Summing Budget Allocations** | Deterministic Code | AI arithmetic is non-deterministic and hallucination-prone. |
| **Checking Venue Capacity Thresholds** | Deterministic Code | Capacity safety is a hard constraint governed by strict numerical comparison. |
| **Calculating Days Until Deadlines** | Deterministic Code | Calendar date math must handle leap years, timezones, and day boundaries accurately. |
| **Enforcing Confirmed Vendor Contracts** | Deterministic Code | Confirmed quotes and expenses are legally sensitive; cannot be overwritten by AI. |
| **Suggesting Themes, Menus, Activities** | Google Gemini (`@google/genai`) | High creative value; AI synthesizes cultural traditions and fresh ideas. |
| **Drafting Initial Itinerary & Checklist** | Google Gemini (`@google/genai`) | Rapidly bootstraps 80% of planning effort from natural language. |
| **Summarizing Vendor Quotations** | Google Gemini (`@google/genai`) | High language comprehension; extracts inclusions/exclusions from unformatted text. |
| **Explaining Change Impact in Plain English** | Google Gemini (`@google/genai`) | Translates complex relational deltas into calming, human-readable guidance. |

---

## 5. Database & Authorization Architecture

- **ORM & Dialect:** Drizzle ORM provides zero-overhead, type-safe queries with explicit migrations. Dialect supports SQLite for local lightweight development/testing and PostgreSQL for enterprise production.
- **Tenant & Event Isolation:**
  - Every resource (`Budget`, `Task`, `Expense`, `VendorQuote`, `Guest`) carries an immutable `event_id` foreign key.
  - Every API route and Server Action validates that the calling session is the owner or an authorized collaborator of `event_id` before executing any query or mutation.
  - Defense against IDOR (Insecure Direct Object Reference) is enforced at the repository and middleware layer, never solely by hiding UI buttons.
- **Audit Logging:** Every major mutation creates an entry in `event_activities` capturing `actor_id`, `action`, `entity_type`, `before_state`, and `after_state`.

---

## 6. Financial Architecture & Money Rules

1. **Integer Minor-Unit Representation:** All currency amounts are stored as integers representing the smallest currency unit (paise for INR, cents for USD/EUR):
   - Example: ₹15,00,000 is stored as `150000000` (paise).
2. **Deterministic Statuses:**
   - `PLANNED`: Total ceiling cap allocated to the event or category.
   - `ESTIMATED`: Rough initial guideline generated by AI or user prior to quotes.
   - `QUOTED`: Vendor bid received and logged into system.
   - `CONFIRMED`: Legally agreed amount with a designated vendor.
   - `PAID`: Actual funds disbursed to date.
   - `CONTINGENCY`: Dedicated buffer reserve (default 10%–15% recommended for weddings).
3. **Indian Number Formatting:** Native formatting supporting the Indian numbering system (Lakhs and Crores): `₹12,50,000` instead of Western `₹1,250,000`.

---

## 7. Error Handling & Resilience Strategy

- **Graceful Fallbacks:** If the Gemini API experiences network timeouts or rate limits, the application falls back to robust, curated static templates for standard Indian weddings, birthdays, and community gatherings.
- **Non-Destructive Failures:** A failure during AI plan generation never corrupts existing saved events.
- **Idempotent Mutations:** Plan generation and acceptance operations utilize unique suggestion tokens to prevent double-charging or duplicate task creation on client retries.
