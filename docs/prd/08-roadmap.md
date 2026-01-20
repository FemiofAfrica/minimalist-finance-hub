# Implementation Roadmap

## Timeline Overview

```
     2026
     ────────────────────────────────────────────────────────────────►
     
     Jan-Feb          Mar-Apr          May-Jun          Jul-Sept
     ─────────        ─────────        ─────────        ─────────
     PHASE 0          PHASE 1          PHASE 2          PHASE 3
     Foundation       MVP Launch       Growth           Scale
     
     │                │                │                │
     ├─ WhatsApp API  ├─ 100 beta      ├─ 1000 users    ├─ 10k users
     ├─ NLP Parser    ├─ Core loop     ├─ Web dashboard ├─ Bank pilot
     ├─ Database      ├─ Insights      ├─ Goals         ├─ Expansion
     └─ Scheduler     └─ Iterate       └─ Referrals     └─ Monetize
```

---

## Phase 0: Foundation (Weeks 1-4)

**Goal:** Build the technical infrastructure for MVP.

### Week 1-2: Core Backend

| Task | Owner | Status |
|------|-------|--------|
| Set up FastAPI/Node project structure | Eng | ⬜ |
| PostgreSQL database schema | Eng | ⬜ |
| WhatsApp Business API integration | Eng | ⬜ |
| Webhook receiver for incoming messages | Eng | ⬜ |
| Basic message sending capability | Eng | ⬜ |

### Week 3: AI Integration

| Task | Owner | Status |
|------|-------|--------|
| OpenAI integration for parsing | Eng | ⬜ |
| Prompt engineering & testing | Eng | ⬜ |
| Fallback regex parser | Eng | ⬜ |
| Transaction storage implementation | Eng | ⬜ |

### Week 4: Scheduler & State

| Task | Owner | Status |
|------|-------|--------|
| Celery/Bull scheduler setup | Eng | ⬜ |
| Nudge job implementation | Eng | ⬜ |
| User state management | Eng | ⬜ |
| Onboarding flow | Eng | ⬜ |

**Deliverable:** Working prototype that can onboard one user and log transactions.

---

## Phase 1: MVP Launch (Weeks 5-10)

**Goal:** Launch to 100 beta users and validate core hypothesis.

### Week 5-6: Complete Core Loop

| Task | Owner | Status |
|------|-------|--------|
| Daily nudge scheduling by preference | Eng | ⬜ |
| Message template variety | Product | ⬜ |
| Correction flow | Eng | ⬜ |
| "Nothing" and "Later" handling | Eng | ⬜ |
| Re-engagement logic | Eng | ⬜ |

### Week 7-8: Insights Engine

| Task | Owner | Status |
|------|-------|--------|
| Fortnightly insight generation | Eng | ⬜ |
| Category aggregation | Eng | ⬜ |
| Period comparison logic | Eng | ⬜ |
| Insight message templates | Product | ⬜ |
| Interactive insight replies | Eng | ⬜ |

### Week 9-10: Beta Launch

| Task | Owner | Status |
|------|-------|--------|
| Recruit 100 beta users | Growth | ⬜ |
| Landing page with WhatsApp CTA | Product | ⬜ |
| User feedback collection | Product | ⬜ |
| Bug fixes and iteration | Eng | ⬜ |
| Metrics dashboard setup | Eng | ⬜ |

**Deliverable:** 100 active users testing the full core loop.

**Success Criteria:**
- 80%+ onboarding completion
- 40%+ weekly response rate
- 90%+ parse accuracy
- Net positive feedback

---

## Phase 2: Growth (Weeks 11-18)

**Goal:** Scale to 1,000 users with enhanced features.

### Week 11-13: Web Dashboard

| Task | Owner | Status |
|------|-------|--------|
| React dashboard setup | Eng | ⬜ |
| Token-based access | Eng | ⬜ |
| Transaction history view | Eng | ⬜ |
| Spending charts | Eng | ⬜ |
| Settings management | Eng | ⬜ |

### Week 14-15: Goal Setting

| Task | Owner | Status |
|------|-------|--------|
| Goal creation via WhatsApp | Eng | ⬜ |
| Progress tracking | Eng | ⬜ |
| 50%/80% notifications | Eng | ⬜ |
| End-of-period summaries | Eng | ⬜ |

### Week 16-18: Growth Features

| Task | Owner | Status |
|------|-------|--------|
| Referral program | Growth | ⬜ |
| Adaptive nudge timing | Eng | ⬜ |
| Multi-currency support | Eng | ⬜ |
| User acquisition campaigns | Growth | ⬜ |
| PR/content marketing launch | Growth | ⬜ |

**Deliverable:** 1,000+ active users with goal setting and web dashboard.

---

## Phase 3: Scale (Weeks 19-30)

**Goal:** Scale to 10,000 users and explore monetization.

### Advanced Features

| Feature | Timeline | Priority |
|---------|----------|----------|
| Bank integration pilot (Mono/Okra) | Week 19-22 | P1 |
| Savings tracking | Week 23-25 | P1 |
| Recurring expense detection | Week 26-28 | P2 |
| Bill reminders | Week 29-30 | P2 |

### Business Development

| Initiative | Timeline |
|------------|----------|
| Premium tier definition | Week 20 |
| B2B/employer partnerships | Week 22-26 |
| Investor readiness | Week 24 |
| Expansion market research | Week 28 |

---

## Key Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| First working prototype | End Week 4 | Log 1 transaction via WhatsApp |
| Beta launch | End Week 10 | 100 active users |
| Insights v1 | End Week 8 | First fortnightly reports sent |
| 500 users | End Week 14 | Organic + referral growth |
| Web dashboard | End Week 13 | 30%+ users visit at least once |
| 1,000 users | End Week 18 | Stable metrics |
| Goal feature | End Week 15 | 20%+ adoption |
| Bank integration | End Week 22 | Pilot with 50 users |
| 10,000 users | End Week 30 | Sustainable growth |

---

## Resource Requirements

### Team (MVP Phase)

| Role | Commitment | Notes |
|------|------------|-------|
| Product/Founder | Full-time | Vision, prioritization, user research |
| Backend Engineer | Full-time | API, WhatsApp, AI integration |
| Frontend Engineer | Part-time (Phase 2) | Dashboard |
| Growth/Marketing | Part-time | User acquisition, content |

### Technology Costs (Monthly)

| Phase | Estimated Cost |
|-------|----------------|
| Phase 0-1 | $100-200 |
| Phase 2 | $300-500 |
| Phase 3 | $500-1,500 |

---

## Decision Points

### Week 10 Review (Post-Beta)
- Is 40%+ response rate achievable?
- Is NLP accuracy sufficient?
- Are users finding value?
- **Go/No-Go for Phase 2**

### Week 18 Review (Post-Growth)
- Is retention sustainable?
- Is unit economics viable?
- Is there a clear path to revenue?
- **Go/No-Go for Phase 3 investment**

---

## Dependencies & Assumptions

**Dependencies:**
- WhatsApp Business API approval
- OpenAI API access
- Meta Business verification

**Assumptions:**
- WhatsApp works for the target market
- Users will respond to nudges
- AI parsing is good enough
- Word-of-mouth will drive growth

---

*End of PRD Documentation*
