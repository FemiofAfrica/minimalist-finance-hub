# Feature Specifications

## Feature Hierarchy

```
CORE (MVP)           ENHANCED (Phase 2)       ADVANCED (Phase 3)
─────────────────    ────────────────────     ─────────────────────
• WhatsApp Onboard   • Goal Setting           • Bank Integration
• Proactive Nudges   • Web Dashboard          • Savings Goals
• NLP Parsing        • Adaptive Timing        • Recurring Detection
• Transaction Log    • Multi-Currency         • Bill Reminders
• Insights Engine                             • Family Tracking
```

---

## Core Features (MVP)

### F1: WhatsApp Onboarding

**Purpose:** Zero to first transaction in <2 minutes, entirely in WhatsApp.

| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | Start via link, QR, or direct message | P0 |
| F1.2 | Collect: name, preferred nudge time | P0 |
| F1.3 | ≤5 messages to complete | P0 |
| F1.4 | Practice transaction before completion | P0 |
| F1.5 | Phone number = unique ID (no passwords) | P0 |

---

### F2: Proactive Nudge System

**Purpose:** Reach users at optimal times with simple prompts.

| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | Automated nudges at user's preferred time | P0 |
| F2.2 | Exactly 2 actions: log or defer | P0 |
| F2.3 | Varied nudge copy (not repetitive) | P1 |
| F2.4 | Skip nudge if user already logged today | P1 |
| F2.5 | Respect "pause" requests immediately | P0 |
| F2.6 | Friendly tone, never guilt-inducing | P0 |

**Re-engagement Cadence:**
- 1 day missed → Normal nudge
- 2-3 days → Softer, acknowledge gap
- 4-7 days → Every-other-day, "fresh start"
- 7+ days → Weekly only
- 14+ days → Monthly ping

---

### F3: Natural Language Parser

**Purpose:** Extract structured data from human-written spending descriptions.

| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | Parse "lunch 2000" format | P0 |
| F3.2 | Parse multi-item: "lunch 2k, uber 1500" | P0 |
| F3.3 | Handle Nigerian formats: "15k", "N5000", "₦5,000" | P0 |
| F3.4 | Auto-categorize from description | P0 |
| F3.5 | Handle unstructured sentences | P0 |
| F3.6 | Confirm parsed data, allow corrections | P0 |

**Default Categories:** Food, Transport, Utilities, Shopping, Transfers, Bills, Health, Education, Other

---

### F4: Transaction Storage

**Data Model:**
```
Transaction {
  id, user_phone, amount, description, category,
  logged_at, transaction_date, source, raw_input, currency
}
```

---

### F5: Fortnightly Insights

**Purpose:** Generate and deliver meaningful spending insights every 14 days.

**Insight Components:**
1. **Summary:** Total spent, transaction count, streak
2. **Breakdown:** Top 3 categories with %
3. **Observation:** One notable pattern
4. **CTA:** More details / Set goal / Acknowledge

---

## Phase 2 Features

### F6: Goal Setting & Tracking
- Category-specific or overall spending targets
- Progress notifications at 50%, 80%
- End-of-period summary

### F7: Web Dashboard
- Unique URL (no login required)
- Transaction history, charts, trends
- Edit/delete transactions, CSV export

### F8: Adaptive Nudge Timing
- Learn from response patterns
- Optimize nudge timing automatically

### F9: Multi-Currency Support
- Log in USD, GBP, EUR
- Aggregate in primary currency

---

## Phase 3 Features

- **F10: Bank Integration** (Mono/Okra)
- **F11: Savings Goals**
- **F12: Recurring Expense Detection**
- **F13: Bill Reminders**
- **F14: Family/Group Tracking**

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| WhatsApp Onboarding | High | Low | P0 |
| Proactive Nudges | High | Medium | P0 |
| NLP Parser | High | High | P0 |
| Transaction Logging | High | Low | P0 |
| Fortnightly Insights | High | Medium | P0 |
| Goal Setting | Medium | Medium | P1 |
| Web Dashboard | Medium | High | P1 |
| Bank Integration | High | Very High | P3 |

---

*Next: [05-technical-architecture.md](./05-technical-architecture.md)*
