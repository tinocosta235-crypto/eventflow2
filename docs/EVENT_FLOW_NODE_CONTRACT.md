# Event Flow Node Contract (MVP)

Date: 2026-03-16  
Status: Active

## Scope
Defines the Event Flow JSON schema and runtime behavior used by:
- `GET/PUT /api/events/:id/flow`
- Event Flow Builder UI
- Event Flow Runtime trigger execution

## JSON Shape

```json
{
  "version": 1,
  "status": "DRAFT",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "label": "Registration Submitted",
      "x": 320,
      "y": 120,
      "active": true,
      "config": {
        "templateKey": "registration_submitted"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "label": "true"
    }
  ],
  "updatedAt": "2026-03-16T10:00:00.000Z"
}
```

## Node Types
- `trigger`
- `condition`
- `action`
- `ai_action`

## Runtime-supported Trigger Keys
- `registration_submitted`
- `guest_imported`
- `guest_status_updated`
- `checkin_completed`
- `email_sent`

## Runtime-supported Action Keys
- `send_email`
- `assign_form`
- `update_guest_status`
- `notify_team`
- `assign_hotel`
- `send_transport_request`
- `open_travel_form`
- `activate_checkin`

## Runtime-supported Condition Keys
- `if_vip`
- `if_capacity`

## Approve-first
Two layers:
- global event policy: `EVENT_FLOW_POLICY.approveFirstCritical`
- per-node override: `node.config.approveFirst = true`

When active, critical actions are queued in `AI_APPROVALS` and not executed immediately.

## Hard Limits
- max nodes: `300`
- max edges: `600`
- invalid edges (source/target missing) are dropped at save-time

## Validation Rules (UI)
- at least one trigger required
- condition node should have >= 2 outgoing edges
- non-trigger node without incoming edge => warning
- send_email action requires `subject` and `body`
