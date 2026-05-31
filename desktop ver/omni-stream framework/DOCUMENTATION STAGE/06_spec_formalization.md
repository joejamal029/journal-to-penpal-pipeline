[PROMPT 6: SPEC FORMALIZATION]
System Instruction: Activate Spec Formalization Protocol (Research-to-Spec Translation) v5

CONTEXT:
The Implementation Atlas is complete. The research phase has resolved every Known Unknown, confirmed every library version, defined every integration contract, and mapped every data shape. This phase translates those findings into a canonical spec document suite — the single source of truth that both the build agent and Phase 7 governance documents are built on top of.

Nothing in this phase is invented. Every value, version, schema, and rule traces directly to a specific section of `implementation_atlas.md`. The Phase 6 Feed Map in the Atlas is your routing table. Use it.

If the Feed Map is missing a source route for any spec document section, STOP and flag it:
"⚠️ FEED MAP GAP: [Section] in [Document] has no identified Atlas source. Cannot generate without routing. Update the Atlas §Phase 6 Feed Map or provide direction before continuing."

---

PRE-WORK — MANDATORY, DO THIS BEFORE GENERATING ANYTHING:
Read the following artifacts in full, in this order:
  1. `implementation_atlas.md`       — primary source; read the §Phase 6 Feed Map section first to understand routing
  2. `system_design_document.md`     — capability map, UX architecture, data models, build sequence
  3. `crucible_decisions.md`         — locked architectural decisions; defines what is and is not in scope (Rank 4 Authority)
  4. `floodgate_dump.md`             — original wishes; final check for any idea not yet represented

Then silently perform the following:

1. PROJECT TYPE DETECTION
   Read `crucible_decisions.md` for platform target decisions. Classify the project:
   - Has a user-facing UI (web app, desktop app, mobile app) → generate DESIGN_SYSTEM.md + FRONTEND_GUIDELINES.md
   - Backend-only, CLI, or API service → skip DESIGN_SYSTEM.md and FRONTEND_GUIDELINES.md
   - Hybrid (frontend + backend separately deployable) → generate all docs
   State the detected project type silently. Do not ask the user to confirm unless the Crucible decisions are ambiguous.

2. FEATURE REGISTRY
   Assign FEAT-IDs to every SDD capability in build-dependency order (First capabilities = lowest IDs):
   - FEAT-001, FEAT-002, FEAT-003...
   - Post-MVP features from the Atlas §Post-MVP Backlog get IDs continuing from the last MVP ID
   This registry is the shared key across all spec documents. PRD.md defines the features. Every other doc references them by ID.

3. RESIDUAL CHECK
   Scan the Atlas for any SPIKE_REQUIRED items without a fallback. If found, flag and resolve before generating docs. A spec document cannot document what the implementation does if a critical unknown is unresolved.

---

GENERATION ORDER:
Generate documents in this order. Each document is complete before the next begins. Do not interleave.

  1. TECH_STACK.md         — establishes the version-locked dependency baseline all other docs reference
  2. BACKEND_STRUCTURE.md  — establishes schemas and contracts that APP_FLOW and PRD reference
  3. PRD.md                — establishes FEAT-IDs that FRONTEND_GUIDELINES and plan.md reference
  4. APP_FLOW.md           — references features from PRD and schemas from BACKEND_STRUCTURE
  5. DESIGN_SYSTEM.md      — (if UI) establishes tokens that FRONTEND_GUIDELINES references
  6. FRONTEND_GUIDELINES.md— (if frontend) references tokens from DESIGN_SYSTEM and features from PRD

---

### DOCUMENT 1: TECH_STACK.md

**Source in Atlas:** Each capability's "Libraries & versions" fields (aggregate all) + §Hard Constraints Discovered by Research + §Architectural Pivots Detected

**Purpose:** Every dependency the project uses, version-locked, with its purpose, license, and any constraint. No library appears in any other document without appearing here first. This is the single point of version truth.

```markdown
# Tech Stack: [Project Name]
**Last updated by:** Phase 6 Spec Formalization
**Source:** implementation_atlas.md — all capabilities §Libraries & versions

## Runtime Environment
| Component | Version | Notes |
|-----------|---------|-------|
[OS, runtime, interpreter/engine — whatever the project runs on]

## Core Dependencies
| Library | Version | License | Purpose | Atlas Source |
|---------|---------|---------|---------|-------------|
[One row per dependency. Version must be pinned (e.g., 3.11.4 not 3.x). Atlas Source = which capability's research confirmed this version.]

## Dev Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
[Test frameworks, linters, build tools, type checkers]

## Infrastructure & Hosting
| Component | Choice | Version/Tier | Notes |
|-----------|--------|-------------|-------|
[Database engine, storage, auth provider, deployment target, CI/CD]

## Architectural Constraints on Dependencies
[From §Hard Constraints Discovered by Research and §Architectural Pivots in Atlas]
- [Constraint]: [What it means for dependency choices]

## Explicitly Ruled Out
[From crucible_decisions.md — libraries/approaches that were considered and rejected]
- [Library/approach]: [Why ruled out] — [Crucible Decision ref]
```

---

### DOCUMENT 2: BACKEND_STRUCTURE.md

**Source in Atlas:** All capabilities' "Integration contracts" (data shapes) + capabilities involving data persistence (implementation approach + code patterns) + §Hard Constraints affecting the data layer + SPIKE results affecting schema

**Purpose:** The complete data and API specification. Any developer or agent reading this cold knows exactly what tables exist, what every column is typed as, how every API endpoint behaves, and what the auth model is. No ambiguity.

```markdown
# Backend Structure: [Project Name]
**Last updated by:** Phase 6 Spec Formalization
**Source:** implementation_atlas.md — integration contracts + persistence capability implementations

## Database
**Engine:** [From TECH_STACK.md]
**ORM/query layer:** [From TECH_STACK.md]

### Schema

#### Table: [table_name]
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
[Every column. Types must be DB-native (e.g., TEXT, INTEGER, REAL, BLOB for SQLite; VARCHAR(n), BIGINT, JSONB for Postgres). No "string" or "number".]

**Indexes:** [Which columns are indexed and why]
**Relationships:** [Foreign keys, cascade rules]
**Atlas source:** [Which capability's integration contract defined this table]

[Repeat for every table]

### Migration Strategy
[From Atlas hard constraints on data layer]
- Initial migration: [What the first migration creates]
- Migration tooling: [Library from TECH_STACK.md]
- Rules: [What can and cannot be done in migrations]

## Authentication
**Approach:** [From Atlas auth capability implementation]
**Library:** [From TECH_STACK.md]
**Session model:** [Stateful/stateless, token type, expiry]
**Auth flow:**
  1. [Step-by-step from Atlas implementation approach]

## API Endpoints
[Only if the project exposes an API. Skip for desktop-only or CLI-only projects.]

### [Capability Name] Endpoints

#### [METHOD] /[route]
**FEAT ref:** [FEAT-XXX from Feature Registry]
**Purpose:** [What this endpoint does]
**Auth required:** [Yes / No / Role-based]
**Request:**
```json
{
  "field": "type — exact, no generics"
}
```
**Response (200):**
```json
{
  "field": "type"
}
```
**Error responses:**
| Status | Condition | Response body |
|--------|-----------|---------------|
**Atlas source:** [Capability + integration contract that defined this]

[Repeat for every endpoint]

## Storage Rules
[From Atlas hard constraints on data layer]
- [Rule]: [What it governs and why]

## Edge Cases & Data Integrity
[From Atlas failure modes and hard constraints]
- [Case]: [How it's handled at the data layer]
```

---

### DOCUMENT 3: PRD.md

**Source in Atlas:** Each capability's "What it does" + "Implementation approach" + "Hard constraints" + SPIKE "Passing result" fields + §Post-MVP Backlog

**Purpose:** Every feature the product has, with acceptance criteria grounded in what the research confirmed is achievable. FEAT-IDs link every downstream document (APP_FLOW.md, plan.md, CLAUDE.md) back to a defined requirement.

```markdown
# Product Requirements Document: [Project Name]
**Last updated by:** Phase 6 Spec Formalization
**Source:** implementation_atlas.md — capability implementations + hard constraints + SPIKE passing results

## Product Overview
[Two sentences: what this product does and who it's for. Cold-start readable.]

## Feature Index
| ID | Feature | Priority | Status | Phase |
|----|---------|---------|--------|-------|
| FEAT-001 | [Name] | P0 | MVP | 1 |
...
| FEAT-0XX | [Name] | P3 | Post-MVP | — |

Priority mapping: P0 = First (must exist before anything else), P1 = Early, P2 = Mid, P3 = Late

## MVP Features

### FEAT-[ID]: [Feature Name]
**Capability origin:** [SDD Capability number and name]
**Atlas source:** [implementation_atlas.md §Capability Name]
**Priority:** [P0 / P1 / P2 / P3]
**Build phase:** [First / Early / Mid / Late]

**Description:**
[What this feature does from the user's perspective. One paragraph.]

**User stories:**
- As a [user type], I can [action], so that [value].
[One story per distinct user interaction this feature enables]

**Acceptance criteria:**
- [ ] [Specific, testable criterion — derived from Atlas "Hard constraints" and SPIKE "Passing result" fields]
- [ ] [Observable behavior — not "it works" but "user sees X when Y happens"]
- [ ] [Performance criterion if Atlas found one: "completes in under Z ms for inputs of size N"]
[If a SPIKE governs this feature: "SPIKE [Name] must pass before this criterion applies. Fallback: [fallback behavior]."]

**Projected code footprint:**
[Which architectural layers and files this feature is expected to touch. Seeds the Phase 9 Feature Registry. Must define the 'Causality Chain' for Proof of Life.]
| Layer | Expected file(s) | Role |
|-------|------------------|------|
| Schema | [table names from BACKEND_STRUCTURE.md] | Data definition |
| Service | [service files that will implement business logic] | CRUD + business rules |
| Engine | [engine files for pure computation, if any] | Constraint validation, math |
| Store | [state management files, if any] | Client-side state |
| Screen | [screen/page components] | User interface |
| Component | [reusable sub-components, if any] | UI building blocks |

**Out of scope for this feature:**
[What explicitly does not belong here — prevents scope creep during build]

---
[Repeat for every MVP feature in FEAT-ID order]

## Post-MVP Features

### FEAT-[ID]: [Feature Name]
**Floodgate origin:** [Original idea from floodgate_dump.md]
**Atlas source:** §Post-MVP Backlog
**Depends on:** [FEAT-XXX — which MVP capability must exist first]
**Why deferred:** [Complexity, dependency, or scope reason from Atlas]

---

## Constraints Affecting All Features
[From §Hard Constraints Discovered by Research in Atlas]
- [Constraint]: [Which features it affects and how]
```

---

### DOCUMENT 4: APP_FLOW.md

**Source in Atlas:** §Integration Map + each capability's "Receives from / Sends to" contracts + each capability's "UX states" field + SDD "What it does" (user-facing) per capability

**Purpose:** Every screen, state, and user journey documented. A developer reading this knows what the app looks like in motion — not just what it does, but what appears when, what data it needs, and what happens when things go wrong.

```markdown
# App Flow: [Project Name]
**Last updated by:** Phase 6 Spec Formalization
**Source:** implementation_atlas.md — §Integration Map + capability UX states + integration contracts

## Navigation Architecture
**Pattern:** [From Crucible decisions — tab-based, stack-based, sidebar, single-page, etc.]
**Entry point:** [First screen/state on cold launch]
**Auth gate:** [Which screens require auth, what happens if unauthed user reaches them]

## Screens / States

### [Screen/State Name]
**FEAT ref:** [FEAT-XXX]
**Route:** [URL path, navigation stack position, or "modal"]
**Trigger:** [What causes this screen to appear]

**Data requirements:**
| Data | Source | Loaded when |
|------|--------|-------------|
[What data this screen needs and where it comes from — Atlas integration contract source]

**States:**
- **Loading:** [What the user sees while data fetches]
- **Success:** [What the user sees with data]
- **Empty:** [What the user sees with no data]
- **Error:** [What the user sees if load fails — from Atlas UX states field]

**User actions available:**
| Action | Result | FEAT ref |
|--------|--------|---------|
[Every interactive element and what it does]

**Navigation from here:**
| Destination | Trigger |
|-------------|---------|
[Every screen this one can navigate to and what causes the transition]

---
[Repeat for every screen/state in the app]

## User Journeys

### [Journey Name — e.g., "First-time setup", "Core use case", "Error recovery"]
**FEAT refs:** [FEAT-XXX, FEAT-YYY]
1. [Step]: [Screen/state] → [User action] → [Result]
2. [Step]: ...
[Complete walkthrough of the journey from start to finish]

## Data Flow Diagram
[From §Integration Map in Atlas — reproduce or adapt as Mermaid or ASCII]
```

---

### DOCUMENT 5: DESIGN_SYSTEM.md *(UI projects only — skip if non-UI)*

**Source in Atlas:** UI-facing capabilities' implementation approaches + Crucible platform/visual decisions + confirmed component library from research

**Purpose:** Every visual token in the product defined with exact values. No designer or developer invents a color, spacing value, or border radius. If it's not here, it doesn't get used.

```markdown
# Design System: [Project Name]
**Last updated by:** Phase 6 Spec Formalization
**Source:** implementation_atlas.md — UI capability implementations + Crucible visual decisions

## Component Library
**Base library:** [From Atlas — e.g., shadcn/ui, Material UI, or "custom"] [Version from TECH_STACK.md]
**Customization approach:** [How project-specific tokens override base library defaults]

## Color System
| Token name | Hex | Usage |
|-----------|-----|-------|
| color-primary | #XXXXXX | Primary actions, CTAs |
| color-primary-hover | #XXXXXX | Hover state for primary |
| color-surface | #XXXXXX | Card and panel backgrounds |
| color-background | #XXXXXX | Page background |
| color-text-primary | #XXXXXX | Body text |
| color-text-secondary | #XXXXXX | Labels, captions |
| color-text-disabled | #XXXXXX | Disabled state text |
| color-border | #XXXXXX | Dividers, input borders |
| color-error | #XXXXXX | Error states |
| color-success | #XXXXXX | Success states |
| color-warning | #XXXXXX | Warning states |
[Add any project-specific semantic tokens]

**Dark mode:** [Yes / No / Future] — [If yes, dark variants of all tokens above]

## Typography
**Font family:** [From Atlas or Crucible — exact font name + fallback stack]
**Font loading:** [From TECH_STACK.md — local, CDN, system]

| Scale name | Size | Weight | Line height | Usage |
|-----------|------|--------|-------------|-------|
| text-xs | Xpx | XXX | X.X | Captions, labels |
| text-sm | Xpx | XXX | X.X | Secondary body |
| text-base | Xpx | XXX | X.X | Primary body |
| text-lg | Xpx | XXX | X.X | Large body, subtitles |
| text-xl | Xpx | XXX | X.X | Section headings |
| text-2xl | Xpx | XXX | X.X | Page headings |
| text-3xl | Xpx | XXX | X.X | Hero text |

## Spacing System
**Base unit:** Xpx
| Token | Value | Usage |
|-------|-------|-------|
| space-1 | Xpx | Tight internal padding |
| space-2 | Xpx | |
| space-4 | Xpx | Default component padding |
| space-8 | Xpx | Section gaps |
[Continue scale to project's maximum]

## Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | Xpx | Chips, tags |
| radius-md | Xpx | Cards, inputs |
| radius-lg | Xpx | Modals, panels |
| radius-full | 9999px | Pills, avatars |

## Shadows
| Token | Value | Usage |
|-------|-------|-------|
| shadow-sm | [CSS value] | Subtle elevation |
| shadow-md | [CSS value] | Cards, dropdowns |
| shadow-lg | [CSS value] | Modals |

## Breakpoints
| Name | Min-width | Target |
|------|-----------|--------|
| sm | Xpx | Large phone |
| md | Xpx | Tablet |
| lg | Xpx | Desktop |
| xl | Xpx | Large desktop |

**Mobile-first mandate:** All components are styled for mobile first. Desktop is the enhancement.

## Animation
| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| transition-fast | Xms | ease-out | Micro-interactions |
| transition-base | Xms | ease-in-out | Component state changes |
| transition-slow | Xms | ease-in-out | Page transitions |

## Icon System
**Library:** [From Atlas] [Version from TECH_STACK.md]
**Size scale:** [Sizes used and their token names]
```

---

### DOCUMENT 6: FRONTEND_GUIDELINES.md *(frontend projects only — skip if non-frontend)*

**Source in Atlas:** All frontend capabilities' "Implementation approach" and "Key code patterns" fields + integration contracts between frontend capabilities + Crucible decisions on UI architecture

**Purpose:** The engineering rules for building the frontend. Every component follows these patterns. No developer improvises component structure, state management, or file naming. This doc and DESIGN_SYSTEM.md together make "hallucinated design" impossible.

```markdown
# Frontend Guidelines: [Project Name]
**Last updated by:** Phase 6 Spec Formalization
**Source:** implementation_atlas.md — frontend capability implementations + Crucible UI architecture decisions
**Design tokens reference:** DESIGN_SYSTEM.md (read before creating any component)

## Framework & Rendering
**Framework:** [From TECH_STACK.md]
**Rendering model:** [SSR / CSR / SSG / hybrid — from Crucible decisions]
**Router:** [From TECH_STACK.md — exact library and version]

## Directory Structure
```
[project root]/
├── [src or app directory]/
│   ├── [components]/      — [what lives here]
│   │   ├── [ui]/          — [primitive/design-system components]
│   │   └── [feature]/     — [feature-specific components]
│   ├── [pages or routes]/ — [route-level components]
│   ├── [hooks]/           — [custom hooks]
│   ├── [stores or state]/ — [state management]
│   ├── [services]/        — [API calls, external integrations]
│   ├── [utils]/           — [pure utility functions]
│   └── [types]/           — [TypeScript interfaces and types]
```
[Adapt to the actual framework structure. Every directory gets a one-line description.]

## Component Architecture

### Hierarchy
1. **Primitive components** — single-responsibility, no business logic, styled with DESIGN_SYSTEM.md tokens only
2. **Composed components** — combine primitives, may have local state, no API calls
3. **Feature components** — connected to state/store, may call services, own a user-facing capability
4. **Page/Route components** — top-level containers, orchestrate feature components, handle routing logic

### Rules
- A primitive component never imports from stores or services
- A composed component never makes API calls
- A feature component never renders layout — it delegates to composed/primitive components
- Every component has one clearly named responsibility
- Props interfaces are defined in the component file or in `types/`

## Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| Component files | PascalCase | `UserCard.tsx` |
| Component names | PascalCase | `UserCard` |
| Hook files | camelCase with `use` prefix | `useUserData.ts` |
| Store files | camelCase | `userStore.ts` |
| Utility files | camelCase | `formatDate.ts` |
| CSS classes (if applicable) | kebab-case | `user-card__header` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_ITEMS_PER_PAGE` |

## State Management
**Approach:** [From Atlas integration contracts between frontend capabilities — e.g., Zustand, Redux, Context, local state only]
**Library:** [From TECH_STACK.md]

### State layers
| Layer | What lives here | How accessed |
|-------|----------------|-------------|
| Local component state | UI-only ephemeral state (hover, open/closed) | useState |
| Feature store | Feature-scoped persistent state | [store hook] |
| Global store | Cross-feature shared state | [store hook] |
| Server state | Remote data with caching | [query library from TECH_STACK.md] |

### Rules
- [Rule derived from Atlas state management implementation]
- [Rule derived from Atlas state management implementation]

## Data Fetching
**Library:** [From TECH_STACK.md]
**Pattern:** [From Atlas implementation — e.g., React Query with custom hooks, SWR, direct fetch]

Standard pattern:
```[language]
[Code pattern from Atlas §Key code patterns for data-fetching capability]
```

Error handling pattern:
```[language]
[From Atlas failure modes for data-fetching capabilities]
```

## Responsive Behavior
- All components are mobile-first
- Breakpoints defined in DESIGN_SYSTEM.md — use only those breakpoints
- No component should define its own breakpoints
- Test flow: design mobile → enhance for md → enhance for lg

## TypeScript Standards
- Strict mode enabled
- No `any` types — use `unknown` and narrow
- Props interfaces are explicit — no implicit prop types
- API response types are defined in `types/` and shared across components and services

## Accessibility
- All interactive elements have keyboard navigation
- Focus states visible (use DESIGN_SYSTEM.md tokens for focus ring)
- ARIA labels on icon-only buttons
- Semantic HTML — no div-soup for structure

## Performance Rules
[From Atlas performance profiles and hard constraints for UI capabilities]
- [Rule]: [Why this matters — Atlas source]
```

---

---

SELF-CRITIQUE: THE ADVERSARIAL FORENSIC PASS (silent, before presenting documents):

The checks below are the **known baseline** — they catch the documentation defects that have been observed to cause downstream failures. They are the minimum, not the maximum. After running all baseline checks, step back and apply the **Adversarial Architecture** mindset: "Where is this spec suite most likely to facilitate a silent failure?"

### Baseline Verification:
- Does every version number in TECH_STACK.md come from a Rank 1 or Rank 0 Atlas source? No guesses.
- Does every DB column type in BACKEND_STRUCTURE.md come from an Atlas integration contract or discovered schema?
- Does every FEAT-ID in PRD.md correspond to a confirmed capability in the Atlas?
- Does every acceptance criterion in PRD.md trace to an Atlas hard constraint, SPIKE passing result, or Stage 6 Hardening Requirement?
- Does every screen in APP_FLOW.md have all required data fields populated from Atlas contracts?
- Are all doc cross-references (FEAT-IDs, table names, token names) matching exactly (case-sensitive)?

### Adversarial Probing:
- **Causality Gaps:** Do any features have acceptance criteria that are impossible to verify with the defined backend/API surface? (e.g. "User sees Y" but there is no API call that returns Y).
- **Implicit Chains:** Are there user journeys that span multiple features but aren't documented in APP_FLOW.md?
- **Data Tensions:** Feature A assumes Table X handles Y. Feature B assumes Table X handles Z. Does Table X's schema actually support the tension between Y and Z?
- **The Cold Agent Test:** Would a build agent reading these documents with ZERO history have enough information to build without assumptions? If there is any "TBD" or "Standard implementation," the spec has failed.

Correct all findings silently. Surface only what requires user direction.

DO NOT PRESENT A CHECKPOINT HERE.
Phase 6 and Phase 7 share a single combined Checkpoint E, which comes at the end of Phase 7. Proceed directly to Phase 7 after all spec documents pass self-critique.

Confirm to the user: "Phase 6 complete. [X] spec documents generated. Proceeding to Phase 7: Build Scaffold." then await the [PROMPT 7: BUILD SCAFFOLD] trigger.
