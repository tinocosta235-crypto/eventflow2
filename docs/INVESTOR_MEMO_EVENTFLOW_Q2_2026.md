# EventFlow Investor Memo (McKinsey Style)
Date: 2026-03-15
Author: Product & Strategy

## 1) Executive Summary
- EventFlow is building a GDPR-first, AI-native event operations platform for EU organizers.
- We target the gap between low-end ticketing tools and enterprise suites with opaque pricing.
- 4-week MVP scope is focused on:
  - Event management UX (Cvent-like hierarchy, simplified execution).
  - Group-level registration form builder (drag-and-drop + branching).
  - Event email builder (advanced columns, brand blocks, Google Fonts).
  - Advanced Generative UI + agents (approve-first governance).
  - Enterprise access control by organization and role.
- Recommended GTM: land with mid-market organizers, expand via seats, automations, and onsite modules.

## 2) Market Attractiveness
- Event management software market is large and growing:
  - Grand View Research estimates USD 8.40B (2024) to USD 17.33B (2030), CAGR 13.2%.
- Competitive pricing signals room for premium SaaS:
  - Swoogo public plan: USD 11,800/year.
  - Accelevents public plans: USD 7,500 (single event) and USD 13,500 (multi-event).
  - Eventbrite public fee model: ticket-transaction based; suitable for smaller/transactional organizers.
- Strategic implication:
  - There is headroom for a vertical EU-focused platform with compliance + workflow depth + AI ops.

## 3) Product Strategy (MVP in 4 weeks)
### Week 1: Platform Core
- Multi-tenant org model and strict data isolation.
- Roles: Owner, Admin, Planner, Onsite, Finance, Viewer.
- Audit logs, consent capture, retention policy hooks.
- Stripe billing foundation (seat-based subscriptions).

### Week 2: Registration Excellence
- Event management section hardening and UX simplification.
- Drag-and-drop form builder per group.
- Complex branching and invitation flows.
- Plugin architecture with `sessions` feature flag.

### Week 3: Communications & CRM
- Event-level drag-and-drop email builder with advanced columns.
- Brand blocks: event logo, typography presets, Google Fonts support.
- Automations (email-only in v1, GDPR-safe defaults).
- Native CRM connectors: HubSpot + Salesforce sync profiles.
- Amadeus integration foundation (travel search layer for flights/hotels).

### Week 4: Onsite + AI + Hardening
- Badge printing and onsite check-in flow.
- Session capacity + waitlist (only when plugin enabled).
- Amadeus production-readiness (quota control, caching, retry/rate-limit handling).
- AI agents in approve-first mode for sensitive operations.
- QA, security, performance, beta onboarding.

## 4) Commercial Model (Recommended)
Pricing must be above SMB ticketing tools and below high-friction enterprise contracts.

### Proposed Packaging (EUR, ex VAT)
- Launch: EUR 790/month, includes 5 seats, core registration/email/check-in.
- Growth: EUR 1,490/month, includes 10 seats, advanced form logic, sessions plugin, CRM sync.
- Scale: EUR 2,990/month, includes 20 seats, SSO, advanced governance, premium support.
- Additional seats:
  - Launch/Growth: EUR 89 per seat/month.
  - Scale: EUR 119 per seat/month.
- Usage add-ons:
  - Email overage pack (tiered).
  - Onsite hardware/support package.

### Why this is sensible
- Anchored below public enterprise-style annual spend from Swoogo/Accelevents.
- High enough to sustain support, compliance, and AI features.
- Keeps a clear expansion path through seats and premium modules.

## 5) 24-Month Business Plan (Base Case)
### Assumptions
- Go-live commercial: May 2026.
- Average sales cycle: 45-75 days.
- Logo growth: 45 paying orgs by month 12; 140 by month 24.
- Plan mix (M12): 60% Launch, 30% Growth, 10% Scale.
- Net revenue retention target: 108-115% (seat expansion + add-ons).
- Gross margin target: 78-82% by month 18.

### Revenue Snapshot (Base Case)
- M12 MRR (platform + average seat expansion): ~EUR 68K-78K.
- Year 1 ARR run-rate at M12: ~EUR 0.82M-0.94M.
- M24 ARR run-rate: ~EUR 2.8M-3.4M.

### Cost Envelope (Base Case)
- COGS: infra + email + support ops = 18-22% revenue early, then 15-20%.
- Opex focus:
  - Product/Engineering.
  - Sales + partnerships.
  - Customer success and compliance operations.
- Target break-even window: months 18-24 (base), 15-18 (upside).

## 6) Compliance & Risk Controls
- GDPR-by-design:
  - Data minimization by default.
  - Tenant-scoped access.
  - Consent and lawful-basis tracking.
  - Deletion/export workflows.
- AI risk controls:
  - `approve-first` for critical actions (send, update, delete, billing-impacting operations).
  - Action logs and reversible workflows where possible.
- Financial compliance:
  - Stripe for subscription/payment.
  - E-invoicing integration provider for Italy/EU obligations.

## 7) Tech Decisions
- CRM: support both Salesforce and HubSpot from MVP.
- Travel integration priority: Amadeus first.
- Channel automation in release 1: email only.
- Agent governance: approve-first.
- Email builder: advanced column structure from day one.
- Billing stack: Stripe Billing seat-based + usage add-ons.
- E-invoicing recommendation for MVP: Fatture in Cloud API (fast implementation + Italian compliance focus); evaluate enterprise alternatives after PMF.

### Amadeus MVP Scope (recommended)
- Phase A (MVP): search + offer selection only.
  - Flights: Flight Offers Search -> Flight Offers Price.
  - Hotels: Hotel List -> Hotel Search.
- Phase B (post-MVP): booking order creation.
  - Flights: Flight Create Orders.
  - Hotels: Hotel Booking.
- Why phased:
  - Faster time-to-market in 4 weeks.
  - Lower operational and support risk while preserving user value in event logistics planning.

## 8) Approval Model Clarification
- Approve-first means:
  - Agent can draft and prepare actions autonomously.
  - No high-impact action executes without explicit user confirmation.
  - Typical guarded actions: bulk sends, participant status changes, billing/refund operations, destructive updates.
- This balances speed and governance in early release.

## 9) Key KPIs (as requested)
- Number of events.
- Events by status.
- Upcoming events.
- Participants managed.
- Average email open rate.
- Average registration rate.

## 10) Sources
- Grand View Research market data:
  - https://www.grandviewresearch.com/industry-analysis/event-management-software-market-report
  - https://www.grandviewresearch.com/press-release/global-event-management-software-market
- Swoogo pricing:
  - https://swoogo.events/pricing
- Accelevents pricing:
  - https://www.accelevents.com/pricing
- Eventbrite organizer pricing:
  - https://www.eventbrite.com/organizer/pricing/
- Salesforce pricing:
  - https://www.salesforce.com/sales/pricing/
- Stripe Billing pricing:
  - https://stripe.com/billing/pricing
- HubSpot Salesforce integration:
  - https://ecosystem.hubspot.com/marketplace/apps/salesforce
  - https://knowledge.hubspot.com/articles/kcs_article/salesforce/install-the-hubspot-salesforce-integration
- Cvent platform/integrations/onarrival references:
  - https://www.cvent.com/
  - https://www.cvent.com/en/event-marketing-management/onarrival-event-check-in-software
  - https://www.cvent.com/en/event-management-software/cvent-and-salesforce-integration
  - https://www.cvent.com/en/node/9386/
- Fatture in Cloud API and pricing references:
  - https://developers.fattureincloud.it/docs/api-reference
  - https://www.fattureincloud.it/costo/
  - https://help.fattureincloud.it/help/articolo/621-quali-sono-piani-disponibili
- Amadeus core references:
  - https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/quick-start/
  - https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/pricing/
  - https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/flights/
  - https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/hotels/
  - https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/api-rate-limits/
  - https://developers.amadeus.com/self-service/apis-docs/guides/moving-to-production-743
