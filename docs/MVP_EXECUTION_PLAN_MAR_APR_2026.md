# EventFlow MVP Execution Plan (Mockup-First)
Date: 2026-03-15
Window: 4 weeks (through 2026-04-12)
Mode: Amadeus on standby, full mockup/product MVP

## Pilot Events (Design Partners)
- Evento Pirelli
- KFC RGM Meeting 2026
- Wurth Kick-Off

## Strategic Choices (Locked)
- Amadeus: standby for now (mock travel layer only).
- E-invoicing: Fatture in Cloud.
- CRM priority: Salesforce first.
- AI governance: approve-first for critical actions.
- Channel in release 1: email only.

## MVP Objectives
1. Rendere la gestione evento coerente, semplice e completa.
2. Form builder drag-and-drop per singolo gruppo con branching avanzato.
3. Email builder drag-and-drop dentro evento con colonne avanzate.
4. Generative UI + agent workflows (con approvazione umana).
5. Accessi enterprise per azienda/ruolo.

## 4-Week Delivery Plan
### Week 1 - Platform Core
- Multi-tenant organization model hardening.
- RBAC completo: Owner, Admin, Planner, Onsite, Finance, Viewer.
- Audit log + policy baseline GDPR.
- Dashboard KPI base (eventi, status, prossimi eventi, partecipanti, open rate, registration rate).

Deliverables:
- Access matrix by role.
- Tenant-safe API guardrails.
- KPI shell pages wired with mock data.

### Week 2 - Event Management + Registration Builder
- Event management information architecture finalized.
- Group-aware form builder drag-and-drop.
- Branching and invitation logic.
- Sessions plugin toggle (feature-flagged) with capacity/waitlist data model.

Deliverables:
- End-to-end event setup flow for all 3 pilot events.
- Group-level registration journey prototypes.
- Session plugin activation path.

### Week 3 - Event Email Builder + Salesforce MVP
- Email builder with advanced column layouts.
- Event branding blocks (logo, typography settings, reusable sections).
- Versioned templates and preview states.
- Salesforce connector v1 (contacts/leads sync and event metadata mapping).

Deliverables:
- One full email journey per pilot event (invite, reminder, update).
- Salesforce sync mock + integration contract.

### Week 4 - AI Workflows + Onsite + Beta Readiness
- Agent actions with approve-first for critical operations.
- Badge printing workflow and onsite check-in ops.
- QA, security/performance hardening, beta handoff.
- Business dashboard + investor-facing KPI view.

Deliverables:
- Beta checklist complete.
- Pilot onboarding package.
- Demo script per pilot event.

## Pilot Event Workstreams
### Evento Pirelli
- Focus: branding quality + executive attendee journey.
- Priority features: premium registration path, high-quality email templates, approval workflows.

### KFC RGM Meeting 2026
- Focus: multi-group flows and agenda/session logic.
- Priority features: group-specific forms, session plugin, communications cadence.

### Wurth Kick-Off
- Focus: onsite efficiency and attendance operations.
- Priority features: check-in speed, badge print flow, operational dashboards.

## Mockup Scope (No External Dependency Blockers)
- Mock connectors for travel and external APIs where needed.
- Real UX + real internal APIs + mock provider responses.
- Production-ready interfaces for provider swap-in later.

## Definition of Done (MVP)
- All critical flows testable on the three pilot events.
- No blocking lint/build/type errors.
- Role permissions validated by scenario.
- Email and registration flows demo-ready end-to-end.
- Investor demo narrative ready with KPI board.
