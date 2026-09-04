# Page structure

```text
Growth OS
├── Dashboard            /dashboard
│   ├── verified Company state
│   ├── qualified Opportunity + open sales counts
│   ├── pending Approvals
│   └── Observation → Fact → Opportunity → Approval → Delivery flow
├── Pipeline             /pipeline
│   ├── one-cell Scout trigger
│   ├── Company / evidence / qualification / sales filters
│   ├── legacy Opportunity Score + explainable components
│   ├── independent qualification and sales stages
│   └── CSV export
├── Agents               /agents
│   ├── Orchestrator
│   ├── Scout
│   ├── Audit
│   ├── Demo Generator
│   ├── Outreach Drafter
│   ├── Project Tracker
│   └── action registry + human-only boundaries
└── Projects             /projects
    ├── won Opportunity relationship
    ├── active/blocked/completed delivery state
    ├── progress
    └── blocker + next action
```

This increment intentionally keeps Agents in one subordinate operating surface. Separate specialist workbenches should be added only when real workflows require distinct controls. Company, Opportunity and Project detail drawers/pages remain later candidates.
