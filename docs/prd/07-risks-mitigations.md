# Risks & Mitigations

## Risk Matrix Overview

```
           HIGH IMPACT
               │
    ┌──────────┼──────────┐
    │   R1     │    R2    │
    │WhatsApp  │  User    │
    │ Policy   │ Fatigue  │
    │          │          │
────┼──────────┼──────────┼────►
LOW │   R5     │    R3    │ HIGH
PROB│ Security │  NLP     │ PROB
    │  Breach  │ Accuracy │
    │          │          │
    └──────────┼──────────┘
               │
          LOW IMPACT
```

---

## R1: WhatsApp Policy Risk

**Risk Level:** 🔴 HIGH

**Description:** Meta can change WhatsApp Business API policies, rate limits, pricing, or approval requirements at any time. Our entire product depends on this channel.

**Impact:** Complete product failure if banned or restricted.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Compliance** | Strictly follow WhatsApp Business policies; use approved templates |
| **Rate Management** | Stay well under sending limits; implement smart throttling |
| **User Consent** | Explicit opt-in; easy opt-out; honor "stop" immediately |
| **Diversification** | Build SMS and email fallback (Phase 2) |
| **Relationship** | Apply for official WhatsApp Partner status |

**Contingency:** If WhatsApp becomes unviable, pivot to SMS + web-push model (higher cost, lower engagement, but survivable).

---

## R2: User Fatigue / Nudge Annoyance

**Risk Level:** 🟠 MEDIUM-HIGH

**Description:** Users may find nudges annoying over time, leading to blocking or unsubscribing. The line between "helpful reminder" and "spam" is thin.

**Impact:** High churn, negative word-of-mouth, brand damage.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Smart Timing** | Respect stated preferences; adapt based on response patterns |
| **Frequency Limits** | Never more than 1 nudge/day; reduce for low responders |
| **Tone Control** | Friendly, never nagging; celebrate zero-spend days |
| **Easy Escape** | "Pause" and "stop" work instantly, no friction |
| **Value First** | Every message should feel useful, not obligatory |
| **A/B Testing** | Continuously test message copy and timing |

**Monitoring:** Track block/unsubscribe rates closely. If >3% in a week, immediate review.

---

## R3: NLP Parsing Accuracy

**Risk Level:** 🟡 MEDIUM

**Description:** AI parser may misunderstand inputs, leading to wrong amounts, categories, or frustration.

**Impact:** User frustration, loss of trust, incorrect financial data.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Confirmation Loop** | Always confirm parsed data before storing |
| **Easy Corrections** | Simple reply-based correction flow |
| **Fallback Parsing** | Regex backup for simple patterns when AI fails |
| **Error Logging** | Track all parse failures for improvement |
| **Prompt Iteration** | Continuously refine prompts based on errors |
| **Nigerian Context** | Train/tune for local language patterns (Naira formats, pidgin, etc.) |

**Target:** 90%+ first-pass accuracy; 99%+ after correction.

---

## R4: Cost Scalability

**Risk Level:** 🟡 MEDIUM

**Description:** Per-message and per-parse costs could become prohibitive at scale.

**Impact:** Unsustainable unit economics; forced to cut features or raise prices.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Efficient Prompts** | Minimize token usage in OpenAI calls |
| **Model Selection** | Use GPT-3.5-turbo where GPT-4 not needed |
| **Caching** | Cache common parsing patterns |
| **Batch Processing** | Batch insight generation |
| **Revenue Model** | Premium tier for power users; potential B2B angle |
| **Cost Monitoring** | Per-user cost tracking from Day 1 |

**Break-even target:** <$0.50/active user/month by Month 6.

---

## R5: Data Security & Privacy

**Risk Level:** 🟠 MEDIUM-HIGH

**Description:** Financial data is sensitive. Breach or misuse would be catastrophic.

**Impact:** Legal liability, user harm, reputation destruction, regulatory action.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Encryption** | Encrypt all data at rest and in transit |
| **Access Control** | Minimal access; audit logs for all data access |
| **No Bank Links (MVP)** | Avoid storing actual bank credentials initially |
| **OpenAI Compliance** | Use API settings that prevent data retention for training |
| **NDPR Compliance** | Follow Nigeria Data Protection Regulation |
| **Security Audits** | Quarterly security reviews |

---

## R6: Competition

**Risk Level:** 🟡 MEDIUM

**Description:** Fintech companies or banks could copy the WhatsApp approach.

**Impact:** User acquisition becomes harder/more expensive.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Speed** | Move fast; first-mover advantage in WhatsApp-native finance |
| **UX Excellence** | Be the most delightful, least annoying option |
| **Community** | Build loyal user base that advocates |
| **Moat Building** | Personalization that improves over time (lock-in) |
| **Partnerships** | Potential bank/fintech partnerships before they compete |

---

## R7: WhatsApp API Technical Issues

**Risk Level:** 🟡 MEDIUM

**Description:** API downtime, rate limiting, or message delivery failures.

**Impact:** Missed nudges, broken user experience, data loss.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Retry Logic** | Automatic retries with exponential backoff |
| **Queue System** | Message queue for reliability |
| **Status Monitoring** | Track delivery receipts and failures |
| **Fallback Channels** | SMS backup for critical messages |
| **Graceful Degradation** | If API down, queue and send later |

---

## R8: User Acquisition Challenge

**Risk Level:** 🟡 MEDIUM

**Description:** Getting users to start the WhatsApp conversation may be harder than expected.

**Impact:** Slow growth, high CAC, unviable business.

**Mitigations:**

| Strategy | Action |
|----------|--------|
| **Referral Program** | Built-in sharing incentives |
| **Content Marketing** | Financial tips content driving awareness |
| **Influencer Partnerships** | Finance/lifestyle influencers |
| **Community Building** | WhatsApp groups, Twitter/X presence |
| **Viral Mechanics** | Shareable insights ("I saved X this month!") |

---

## Risk Ownership

| Risk | Owner | Review Cadence |
|------|-------|----------------|
| R1: WhatsApp Policy | Founder/Product | Weekly |
| R2: User Fatigue | Product/Growth | Weekly |
| R3: NLP Accuracy | Engineering | Daily (automated) |
| R4: Cost Scalability | Finance/Engineering | Monthly |
| R5: Security | Engineering/Legal | Quarterly |
| R6: Competition | Founder/Product | Monthly |
| R7: API Technical | Engineering | Continuous |
| R8: User Acquisition | Growth | Weekly |

---

*Next: [08-roadmap.md](./08-roadmap.md)*
