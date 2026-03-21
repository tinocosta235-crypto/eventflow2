# Beta Readiness Checklist (Phase E)

Date: 2026-03-16

## 1) Platform Stability
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Core API routes compile in production build

## 2) Event Flow Core
- [x] Flow Builder canvas available per event
- [x] Save/Publish flow JSON
- [x] Validation state visible
- [x] Undo/Redo + zoom + minimap
- [x] Manual trigger test endpoint + UI control

## 3) Runtime Integrations
- [x] `registration_submitted` trigger wired
- [x] `guest_status_updated` trigger wired
- [x] `checkin_completed` trigger wired
- [x] `email_sent` trigger wired
- [x] runtime run logs stored and retrievable

## 4) Approve-first Governance
- [x] Global policy `approveFirstCritical`
- [x] Per-node `Require approval` toggle
- [x] Approval queue supports `EMAIL_SEND` and `FLOW_ACTION`
- [x] Approve/reject actions available

## 5) Logistics / Onsite
- [x] Hotel assignment action available in flow runtime
- [x] Travel request action available in flow runtime
- [x] Check-in activation action available in flow runtime
- [x] Badge printing route + UI action in check-in

## 6) Email System
- [x] Predefined event templates auto-provisioned
- [x] Manual + conditional send modes
- [x] Event email builder with branding + block layout + versions

## 7) Known Gaps (next sprint)
- [ ] Full visual edge routing/branch labels editor in canvas
- [ ] Advanced condition builder with multi-rule AND/OR in runtime
- [ ] End-to-end deterministic test suite for flow execution
- [ ] Replay/backfill tooling for historical registrations
- [ ] Native connector execution (non-mock) for travel/CRM providers
