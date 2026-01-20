# Success Metrics & KPIs

## North Star Metric

> **Weekly Active Responders (WAR)**
> 
> Users who respond to at least one nudge per week.

This metric captures the essence of Kpege 2.0: users who are building the habit of financial awareness through consistent, low-effort engagement.

---

## Primary Metrics

### 1. Onboarding Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Completion Rate** | % of users who finish onboarding flow | >80% |
| **Time to First Log** | Time from start to first real transaction | <5 minutes |
| **Day 1 Response Rate** | % who respond to first scheduled nudge | >50% |

### 2. Engagement Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Weekly Response Rate** | % of nudges responded to per week | >40% |
| **Transactions Logged/Week** | Avg transactions per active user | 5-10 |
| **Insight Open Rate** | % who read fortnightly insights (blue ticks) | >70% |
| **Insight Interaction Rate** | % who reply to insights | >30% |

### 3. Retention Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Week 1 Retention** | % still responding after 7 days | >60% |
| **Month 1 Retention** | % still responding after 30 days | >40% |
| **Month 3 Retention** | % still responding after 90 days | >25% |
| **Reactivation Rate** | % of dormant users who return | >15% |

### 4. Value Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Goal Adoption** | % of 30-day users who set a goal | >20% |
| **Goal Achievement** | % of goals met or within 10% | >50% |
| **Behavioral Change** | Users who reduce a category by >10% after insight | 15%+ |

---

## Cohort Analysis Framework

Track user cohorts by signup week:

```
Week 0: Signed up
Week 1: First nudge responses
Week 2: Consistency check
Week 4: First insight delivered
Week 8: Goal adoption window
Week 12: Long-term habit formation
```

---

## Health Indicators

### Green (Healthy)

| Indicator | Threshold |
|-----------|-----------|
| Response rate this week | ≥40% |
| New user D1 response | ≥50% |
| Insight delivery success | ≥95% |
| Parse accuracy | ≥90% |

### Yellow (Warning)

| Indicator | Threshold |
|-----------|-----------|
| Response rate drop WoW | >15% decline |
| Growing dormant segment | >30% of base |
| Increased "pause" requests | >5% of active |
| Parse errors increasing | >10% of inputs |

### Red (Critical)

| Indicator | Threshold |
|-----------|-----------|
| Response rate below | <20% |
| Week 1 retention below | <40% |
| WhatsApp API issues | Uptime <99% |
| User complaints | >2% of base |

---

## Measurement Implementation

### Data Collection Points

| Event | Captured Data |
|-------|---------------|
| `user_started_onboarding` | phone, source, timestamp |
| `user_completed_onboarding` | phone, duration, nudge_preference |
| `nudge_sent` | phone, nudge_id, timestamp, template |
| `user_responded` | phone, nudge_id, response_time, raw_text |
| `transaction_logged` | phone, amount, category, parse_success |
| `insight_sent` | phone, insight_id, period |
| `insight_opened` | phone, insight_id, timestamp |
| `goal_set` | phone, goal_type, target_amount |
| `user_paused` | phone, timestamp |

### Analytics Tools

- **Product Analytics:** Mixpanel or Amplitude (event tracking)
- **Database Queries:** Direct PostgreSQL for aggregations
- **Dashboards:** Metabase or custom admin panel
- **Alerting:** PagerDuty/Slack for health indicators

---

## Success Definitions by Phase

### MVP Success (Month 1-3)

- [ ] 100+ active users
- [ ] 40%+ weekly response rate
- [ ] 60%+ onboarding completion
- [ ] 90%+ NLP parse accuracy
- [ ] <5% negative feedback

### Growth Phase Success (Month 4-6)

- [ ] 1,000+ active users
- [ ] 30%+ month-1 retention
- [ ] 20%+ goal adoption
- [ ] Web dashboard launched
- [ ] Referral program generating 20%+ of signups

### Scale Phase Success (Month 7-12)

- [ ] 10,000+ active users
- [ ] 25%+ month-3 retention
- [ ] Positive unit economics
- [ ] Bank integration pilot
- [ ] Measurable behavioral change in 15%+ of users

---

## User Feedback Loops

### Quantitative

- Weekly NPS via WhatsApp (simple 1-10 rating)
- Feature request voting
- A/B test results

### Qualitative

- Monthly user interviews (10 users)
- Support ticket analysis
- Social media sentiment

---

*Next: [07-risks-mitigations.md](./07-risks-mitigations.md)*
