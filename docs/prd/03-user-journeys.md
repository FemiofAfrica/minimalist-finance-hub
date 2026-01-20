# User Journeys

## Journey Map Overview

This document maps the complete user experience from first contact through long-term engagement, with focus on the WhatsApp-native interaction model.

---

## Journey 1: Onboarding — From Stranger to First Log

### The Entry Points

Users can discover Kpege through:

1. **Social media** → Sees ad/post → Clicks link → WhatsApp
2. **Word of mouth** → Friend shares link → WhatsApp
3. **Website** → Visits site → Clicks "Start on WhatsApp" → WhatsApp
4. **QR Code** → Scans at event/poster → WhatsApp

All roads lead to WhatsApp.

### The First Conversation

```
┌────────────────────────────────────────────────────────────────┐
│ KPEGE WHATSAPP CONVERSATION                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   [User clicks link / sends "Hi"]                              │
│                                                                │
│   📱 Kpege:                                                    │
│   "Hey there! 👋 I'm Kpege, your new money sidekick.          │
│                                                                │
│   I'll send you quick check-ins, you tell me what you spent,  │
│   and I'll help you see where your money goes—no app needed.  │
│                                                                │
│   First, what should I call you?"                              │
│                                                                │
│   User: "Adaeze"                                               │
│                                                                │
│   📱 Kpege:                                                    │
│   "Nice to meet you, Adaeze! 🎉                                │
│                                                                │
│   One more thing: when's the best time to check in?           │
│   • Morning (8-10am)                                           │
│   • Afternoon (1-3pm)                                          │
│   • Evening (7-9pm)                                            │
│                                                                │
│   Just reply with your preference."                            │
│                                                                │
│   User: "Evening"                                              │
│                                                                │
│   📱 Kpege:                                                    │
│   "Got it! I'll ping you in the evenings.                     │
│                                                                │
│   Let's do a quick practice. Tell me one thing you            │
│   spent money on today—anything! Just say what it was         │
│   and how much. Like: 'lunch 1500' or 'uber to work 2000'."  │
│                                                                │
│   User: "bought credit 500"                                    │
│                                                                │
│   📱 Kpege:                                                    │
│   "Perfect! ✅                                                 │
│   Logged: Airtime — ₦500                                       │
│                                                                │
│   See? That's all there is to it. I'll check in tonight       │
│   around 7pm. Talk soon, Adaeze! 💚"                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Onboarding Success Criteria

| Milestone | Target | Measurement |
|-----------|--------|-------------|
| Complete onboarding conversation | >80% of starters | Finish rate |
| Log first real transaction | >60% within 24 hours | Time to first log |
| Respond to first nudge | >50% | Day 1 response rate |

---

## Journey 2: Daily Transaction Logging — The Core Loop

### The Standard Nudge

```
┌────────────────────────────────────────────────────────────────┐
│ EVENING NUDGE (7:23 PM)                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   📱 Kpege:                                                    │
│   "Hey Adaeze! Quick one—what did you spend today?            │
│   Reply with what + amount, or say 'nothing' or 'later'. 💸"  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Response Scenarios

**Scenario A: User Logs Transactions**

```
User: "Lunch 2000, transport 1500, snacks 500"

📱 Kpege:
"Got it! ✅

Today's spending:
• Food: ₦2,500
• Transport: ₦1,500

Total: ₦4,000

This week so far: ₦23,500. See you tomorrow! 🌙"
```

**Scenario B: User Says "Nothing"**

```
User: "nothing"

📱 Kpege:
"A zero-spend day! 🎉 Those are rare. 
See you tomorrow!"
```

**Scenario C: User Says "Later"**

```
User: "later"

📱 Kpege:
"No problem! I'll check back tomorrow.
(You can always just send your spending whenever—no need to wait for me.)"
```

**Scenario D: User Sends Unstructured Text**

```
User: "went to shoprite spent like 15k on groceries 
       then bought fuel 8500 
       oh and sent 5k to my sister"

📱 Kpege:
"Got it! Here's what I logged:

• Groceries: ₦15,000
• Fuel: ₦8,500
• Transfer (Sister): ₦5,000

Total: ₦28,500

Does that look right? Reply 'yes' or let me know what to fix."
```

**Scenario E: Correction**

```
User: "Actually the groceries was 12000 not 15000"

📱 Kpege:
"Fixed! ✅
• Groceries: ₦12,000 (was ₦15,000)

New total: ₦25,500"
```

---

## Journey 3: Missed Days — Re-engagement Without Guilt

### Philosophy

Missing a day (or several) is **normal and expected**. Our re-engagement never:
- Shames the user
- Shows disappointment
- Implies failure

### 1 Day Missed

```
📱 Kpege:
"Hey Adaeze! Didn't catch you yesterday. 
Anything from the last couple days you want to log?
Or just today's spending is fine too!"
```

### 3 Days Missed

```
📱 Kpege:
"Hey stranger! 👋 Been a few days.
Just reply with anything you remember spending on—
"lunch 5000, fuel 10000" style—and I'll log it.
No pressure to get everything perfect!"
```

### 7+ Days Missing

```
📱 Kpege:
"Hi Adaeze! It's been a minute. 
No catching up needed—fresh start from here.
When you're ready, just message me with today's spending.
I'm here when you need me! 💚"
```

---

## Journey 4: Insight Delivery — The Fortnightly Report

### Insight Message

```
┌────────────────────────────────────────────────────────────────┐
│ FORTNIGHTLY INSIGHT (Every other Sunday, 10am)                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   📱 Kpege:                                                    │
│   "📊 Adaeze's Fortnight Roundup                              │
│                                                                │
│   You spent: ₦145,000                                          │
│   You logged: 23 transactions (nice consistency!)              │
│                                                                │
│   Top 3 categories:                                            │
│   🍔 Food & Dining: ₦52,000 (36%)                              │
│   🚗 Transport: ₦38,000 (26%)                                  │
│   🛍️ Shopping: ₦25,000 (17%)                                  │
│                                                                │
│   💡 Observation:                                              │
│   Food spending jumped 40% from last fortnight.               │
│   December vibes or something changed?                         │
│                                                                │
│   Reply '1' for more details                                   │
│   Reply '2' to set a spending target                           │
│   Reply '3' if this looks about right 👍"                      │
│                                                                │
│   User: "3"                                                    │
│                                                                │
│   📱 Kpege:                                                    │
│   "Cool! Keep it up. See you in the daily check-ins! 💚"      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Deep Dive (If User Requests)

```
User: "1" (wants more details)

📱 Kpege:
"Here's the breakdown for Food & Dining (₦52,000):

Weekday lunches: ₦18,000 (avg ₦1,800/day)
Dinner/eating out: ₦24,000
Groceries: ₦10,000

Last fortnight you spent ₦37,000 on food total.
The jump is mostly in dinner/eating out (+₦12,000).

Want me to nudge you specifically about eating out?
Reply 'yes' or 'no'."
```

---

## Journey 5: Goal Setting — Opt-In Agency Building

### User Initiates Goal

```
User: "I want to spend less on transport"

📱 Kpege:
"Love the intention! 🎯

Last fortnight you spent ₦38,000 on transport.
What feels like a realistic target for this fortnight?

• ₦35,000 (small step)
• ₦30,000 (ambitious)
• Custom amount—just type it"

User: "30000"

📱 Kpege:
"Target set! ₦30,000 for transport this fortnight. 

I'll give you a heads-up when you're at 50% and 80%.
You've got this, Adaeze! 💪"
```

### Goal Progress Check-In

```
[Day 8 of fortnight]

📱 Kpege:
"Quick update: You've spent ₦22,000 on transport so far.
That's 73% of your ₦30,000 target with 6 days left.

Looking tight but doable! 🤞"
```

---

## Journey 6: Web Dashboard Visit — The Optional Deep Dive

### Entry to Web

```
User: "Can I see everything in one place?"

📱 Kpege:
"Yes! Here's your personal dashboard link:
🔗 kpege.io/d/adaeze-xxxx

It's got all your logs, charts, and history.
But no pressure—I'll keep the highlights coming here!"
```

### Web Dashboard Features

*Note: Web is intentionally simple. Not a full-featured finance app.*

- Transaction history (searchable, filterable)
- Category breakdown charts
- Trend lines over time
- Export data (CSV)
- Edit/delete transactions
- Update preferences

**The web is not required.** A user can get 80% of value without ever visiting it.

---

## Journey 7: Long-Term Engagement — Months 3-6+

### The Maturity Arc

```
Month 1: Building habit → "Log stuff"
Month 2: Seeing patterns → "Oh, that's where money goes"
Month 3: Setting goals → "I want to change something"
Month 4-6: Adjusting behavior → "I actually spent less on X"
Month 6+: Autopilot → Habit is formed, agency exists
```

### Evolved User Experience

By month 3+, Kpege adapts:

- Nudge frequency may decrease if user is consistent
- Insights become more comparative ("vs. last month")
- Can introduce advanced features gradually:
  - Savings tracking
  - Recurring expense detection
  - Bill reminders (opt-in)

### Success Outcomes

| Outcome | Measurement |
|---------|-------------|
| User responds to >50% of nudges | Engagement rate |
| User reads insight messages | Read rate (blue ticks) |
| User mentions specific category awareness | Qualitative feedback |
| User sets at least one goal | Feature adoption |
| User adjusts a spending pattern | Trend analysis |

---

## Edge Cases & Recovery Journeys

### User Feels Overwhelmed

```
User: "This is too much can you nudge me less"

📱 Kpege:
"Totally understand! How about I check in just twice a week—
say, Wednesday and Sunday?

Or tell me what works for you."
```

### User Wants to Pause

```
User: "Pause for now"

📱 Kpege:
"Pausing all nudges. ⏸️

Just send 'resume' whenever you're ready to start again.
No questions asked. Take care, Adaeze! 💚"
```

### User Deletes Chat / Loses History

All data tied to phone number. User can restart anytime and:
- Previous data is preserved
- Onboarding is skipped
- Resumes with "Welcome back!"

---

*Next: [04-features.md](./04-features.md)*
