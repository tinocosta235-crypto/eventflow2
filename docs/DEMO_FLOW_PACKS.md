# Demo Flow Packs

Date: 2026-03-16

## Purpose
Provide ready-to-run Event Flow templates for pilot events:
- Pirelli
- KFC RGM 2026
- Wurth Kick-Off

## API
`POST /api/events/:id/flow/demo-pack`

Body:
```json
{ "pack": "AUTO" }
```

Accepted values:
- `AUTO`
- `PIRELLI`
- `KFC_RGM_2026`
- `WURTH_KICKOFF`

## AUTO mode
The route selects pack by event title:
- title includes `pirelli` -> `PIRELLI`
- title includes `kfc` or `rgm` -> `KFC_RGM_2026`
- title includes `wurth` or `kick-off` -> `WURTH_KICKOFF`

## Side effects
- Overwrites current `EVENT_FLOW` config for the event
- Sets flow status to `PUBLISHED`
- Enables `EVENT_FLOW_POLICY.approveFirstCritical = true`

## Builder UX
Flow Builder top bar includes:
- pack selector
- `Load Demo Pack` action
