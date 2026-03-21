# EventFlow

EventFlow is an AI-powered event operating system with a visual orchestration layer called **Event Flow**.

## Core concept
Users do not only configure events.  
Users define how events behave through a visual workflow builder (trigger -> conditions -> actions -> AI actions).

## Tech stack
- Next.js App Router
- TypeScript
- Prisma + PostgreSQL
- NextAuth
- Tailwind + shadcn-style UI components

## Local development
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Quality gates
```bash
npm run lint
npm run build
```

## Key implemented modules
- Multi-tenant org + role model
- Event management + registration paths/forms
- Event email studio with templates and conditional send
- AI agents with approve-first queue
- Onsite check-in + badge printing
- Event Flow canvas (save/publish/test, runtime execution, run logs)

## Event Flow APIs
- `GET/PUT /api/events/:id/flow`
- `POST /api/events/:id/flow/demo-pack`
- `POST /api/events/:id/flow/test`
- `GET /api/events/:id/flow/runs`
- `GET/PUT /api/events/:id/flow/policy`

## Documentation
- [Event Flow Node Contract](docs/EVENT_FLOW_NODE_CONTRACT.md)
- [QA Runbook Event Flow](docs/QA_RUNBOOK_EVENT_FLOW.md)
- [Beta Readiness Checklist](docs/BETA_READINESS_CHECKLIST_PHASE_E.md)
- [Salesforce Integration Contract v1 Mock](docs/SALESFORCE_INTEGRATION_CONTRACT_V1_MOCK.md)
- [MVP Execution Plan](docs/MVP_EXECUTION_PLAN_MAR_APR_2026.md)
