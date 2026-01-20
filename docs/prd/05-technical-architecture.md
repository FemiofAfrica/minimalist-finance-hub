# Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           KPEGE 2.0 ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐     │
│    │   WhatsApp  │◄───────►│   Kpege     │◄───────►│   Web       │     │
│    │   Business  │         │   Backend   │         │   Dashboard │     │
│    │   API       │         │   (API)     │         │   (React)   │     │
│    └─────────────┘         └──────┬──────┘         └─────────────┘     │
│                                   │                                     │
│                    ┌──────────────┼──────────────┐                     │
│                    ▼              ▼              ▼                     │
│              ┌──────────┐  ┌──────────┐   ┌──────────┐                │
│              │ AI/NLP   │  │ Database │   │ Scheduler│                │
│              │ Parser   │  │ (Postgres)│   │ (Jobs)   │                │
│              │ (OpenAI) │  │          │   │          │                │
│              └──────────┘  └──────────┘   └──────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. WhatsApp Integration Layer

**Technology:** WhatsApp Business API (Cloud API)

**Responsibilities:**
- Receive incoming messages via webhooks
- Send outbound messages (nudges, confirmations, insights)
- Handle message templates for proactive outreach
- Manage conversation state

**Key Endpoints:**
```
POST /webhook                 # Receive incoming messages
POST /messages/send           # Send outbound messages
POST /messages/template       # Send template messages
```

**Webhook Payload Processing:**
```python
{
  "from": "2348012345678",      # User phone
  "timestamp": "1705329653",
  "type": "text",
  "text": {"body": "lunch 2000, uber 1500"}
}
```

---

### 2. Backend API Service

**Technology:** Python (FastAPI) or Node.js (Express)

**Core Modules:**

| Module | Purpose |
|--------|---------|
| `messaging` | Handle WhatsApp send/receive |
| `parser` | NLP transaction parsing |
| `users` | User management |
| `transactions` | CRUD operations |
| `insights` | Analytics and report generation |
| `scheduler` | Job scheduling for nudges |

**API Endpoints:**

```
# WhatsApp Webhook
POST   /webhooks/whatsapp

# Users
GET    /users/{phone}
PUT    /users/{phone}

# Transactions
GET    /users/{phone}/transactions
POST   /users/{phone}/transactions
PUT    /transactions/{id}
DELETE /transactions/{id}

# Insights
GET    /users/{phone}/insights
GET    /users/{phone}/insights/current

# Dashboard Auth
GET    /dashboard/{token}
```

---

### 3. AI/NLP Parser

**Technology:** OpenAI GPT-4 (or GPT-3.5-turbo for cost efficiency)

**Purpose:** Convert natural language to structured transaction data.

**Prompt Engineering:**

```
System: You are a transaction parser for a Nigerian personal finance app.
Extract spending items from the user's message.

Rules:
- Handle formats: "2k" = 2000, "N5000" = 5000, "₦5,000" = 5000
- Infer categories: lunch→Food, uber→Transport, airtime→Utilities
- Return JSON: [{item, amount, category}]
- If unclear, ask for clarification

User: "bought provisions at shoprite 25k and spent 8500 on fuel"

Output: [
  {"item": "provisions at shoprite", "amount": 25000, "category": "Shopping"},
  {"item": "fuel", "amount": 8500, "category": "Transport"}
]
```

**Fallback Strategy:**
1. Try GPT parsing
2. If fails, use regex fallback for simple patterns
3. If still unclear, ask user for clarification

---

### 4. Database Schema

**Technology:** PostgreSQL

```sql
-- Users
CREATE TABLE users (
  phone VARCHAR(15) PRIMARY KEY,
  name VARCHAR(100),
  nudge_time VARCHAR(20) DEFAULT 'evening',
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  last_interaction TIMESTAMP
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone VARCHAR(15) REFERENCES users(phone),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  raw_input TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  logged_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'whatsapp',
  currency VARCHAR(3) DEFAULT 'NGN'
);

-- Insights (cached)
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone VARCHAR(15) REFERENCES users(phone),
  period_start DATE,
  period_end DATE,
  insight_data JSONB,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone VARCHAR(15) REFERENCES users(phone),
  category VARCHAR(50),
  target_amount DECIMAL(12,2),
  period VARCHAR(20),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active'
);

-- Indexes
CREATE INDEX idx_transactions_user ON transactions(user_phone);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
```

---

### 5. Scheduler Service

**Technology:** Celery (Python) or Bull (Node.js)

**Scheduled Jobs:**

| Job | Schedule | Purpose |
|-----|----------|---------|
| `send_nudges` | Continuous (time-aware) | Send daily nudges based on user preferences |
| `generate_insights` | Every 14 days | Create fortnightly reports |
| `send_insights` | After generation | Deliver insights to users |
| `re_engagement` | Daily | Handle dormant user outreach |
| `goal_check` | Daily | Track goal progress, send alerts |

---

### 6. Web Dashboard (Optional)

**Technology:** React + Vite (or Next.js)

**Features:**
- Transaction history view
- Spending charts (Chart.js or Recharts)
- Settings management
- No traditional auth—token-based URL access

---

## Data Flow Diagrams

### Transaction Logging Flow

```
User WhatsApp          Kpege Backend           AI Parser          Database
      │                      │                     │                  │
      │──"lunch 2k uber 1.5k"│                     │                  │
      │─────────────────────►│                     │                  │
      │                      │──Parse request─────►│                  │
      │                      │                     │                  │
      │                      │◄─Structured JSON────│                  │
      │                      │                     │                  │
      │                      │──Store transactions─────────────────►│
      │                      │                                       │
      │◄─Confirmation msg────│                                       │
      │                      │                                       │
```

### Nudge Delivery Flow

```
Scheduler              Backend                 WhatsApp API          User
    │                     │                         │                  │
    │──Trigger nudge job──│                         │                  │
    │────────────────────►│                         │                  │
    │                     │──Get active users───►   │                  │
    │                     │  (time-filtered)        │                  │
    │                     │                         │                  │
    │                     │──Send template msg─────►│                  │
    │                     │                         │─────────────────►│
    │                     │                         │                  │
```

---

## Infrastructure

### Recommended Stack

| Component | Technology | Hosting |
|-----------|------------|---------|
| Backend API | FastAPI (Python) | Railway / Render / AWS |
| Database | PostgreSQL | Supabase / Neon / AWS RDS |
| Scheduler | Celery + Redis | Railway / AWS |
| AI Parser | OpenAI API | - |
| WhatsApp | Meta Cloud API | - |
| Web Dashboard | React + Vite | Vercel / Netlify |

### Environment Variables

```
# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# OpenAI
OPENAI_API_KEY=

# Database
DATABASE_URL=

# Redis (for scheduler)
REDIS_URL=

# App
APP_SECRET_KEY=
ENVIRONMENT=production
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Phone number as ID | Hash for internal use, never expose |
| Financial data | Encrypt at rest, TLS in transit |
| OpenAI data | Use API without training data retention |
| Dashboard access | Token-based URLs with expiration |
| Rate limiting | Prevent abuse on all endpoints |

---

## Cost Estimates (Monthly)

| Service | Estimate |
|---------|----------|
| WhatsApp Business API | $0.005-0.08/message (~$50-200/1000 users) |
| OpenAI API (GPT-4) | ~$0.01-0.03/parse (~$100-300/10k parses) |
| PostgreSQL (Supabase) | $25 (Pro) |
| Backend hosting | $20-50 |
| **Total (1000 users)** | **~$200-600/month** |

---

*Next: [06-success-metrics.md](./06-success-metrics.md)*
