# QA Runbook — Event Flow

Date: 2026-03-16

## Preconditions
1. Start app: `npm run dev`
2. Login with planner/admin role
3. Open an event and go to `/events/:id/flow`

## Scenario A — Base flow publish
1. Drag `Registration Submitted` trigger
2. Drag `Send Email` action
3. Connect trigger -> action
4. Configure subject/body on action node
5. Click `Test`, then `Publish`
Expected:
- no blocking errors
- flow status becomes `PUBLISHED`

## Scenario B — Runtime trigger from real registration
1. Ensure flow above is published
2. Open public registration page and submit a participant
3. Return to flow page and check `Execution state sync`
Expected:
- new run appears with trigger `registration_submitted`
- at least one node executed

## Scenario C — Approve-first critical
1. In flow page set `Approve-first critical = ON`
2. Keep `send_email` action in flow
3. Trigger a new registration
4. Open AI approvals queue panel (event analytics agents area)
Expected:
- approval item is `PENDING`
- email not sent until approval

## Scenario D — Manual trigger test
1. In flow inspector use `Manual trigger test`
2. Select `guest_status_updated`
3. Optionally pass registrationId
4. Run test
Expected:
- success toast
- run appears in execution sync panel

## Scenario E — Logistics action
1. Add action `Assign Hotel Offer`
2. Publish flow
3. Trigger registration with available allotment
Expected:
- room assignment created (or approval queued if approve-first is active)

## Failure triage
- If run not visible: check `/api/events/:id/flow/runs`
- If action not executed: verify node is active and connected
- If no trigger fired: verify flow status is `PUBLISHED`
- If approval queued unexpectedly: check global policy and node `Require approval`
