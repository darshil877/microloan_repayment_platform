# EquiFlow

Adaptive microloan repayment for irregular income — harvests, lean months, gig spikes, and surplus catch-up recovery.

Hackathon theme: **Decent Work and Economic Growth (UN SDG 8)**.

Borrowers don’t fail EMIs; calendars fail borrowers. EquiFlow reads cash-flow patterns, tells the difference between a **seasonal investment dip**, **real financial stress**, and a **harvest surplus recovery phase** — writing plain-English recommendations across 7 languages, letting lenders approve adaptive due amounts in one click.

No build step. No paid APIs. No server to babysit.

---

## Demo logins (judges — use these)

| Role | Email | Password | Person |
|---|---|---|---|
| Farmer / borrower | `farmer@equiflow.demo` | `Demo@1234` | Ramesh Patel, Nashik (sugarcane & onion) |
| Lender | `lender@equiflow.demo` | `Demo@1234` | Meera Iyer, Grameen Trust |

The book also includes **Priya Sharma** (gig delivery, Pune) as a second borrower on the lender desk. Priya comes pre-seeded with a lender-approved adaptive plan so judges can see an approved example immediately, while Ramesh remains pending for live review.

First visit auto-seeds local demo data (February 2026). **Reset demo** on either dashboard restores that month.

---

## Judge script (60–90 seconds)

1. Open the site. Click **Enter as lender** (or sign in with `lender@equiflow.demo` / `Demo@1234`).
2. You land in **February 2026**. Ramesh Patel is in **Financial Stress** (lean month, no planting spend, pending review). Priya Sharma is **Approved**.
3. Click **Ramesh**. Read the plain-English *Why* panel, inspect the 3-series cash flow chart (Income line, Total Expenses bar, Farming Outlays bar), and see the recommendation.
4. Click **Approve recommendation**. The plan is written to `repayment_plans`.
5. Open a second tab → login page → **Enter as farmer**. Ramesh’s dashboard now shows the **lender-approved** lower amount, a green banner, and a feed notification.
6. On either desk, click **Simulate next month**:
   - **March** → Ramesh flips to **Seasonal Dip (Investment Phase)** (farming expenses > 40%). EMI drops to ~30% of base (₹1,440). This is the “not a default, it’s planting week” moment.
   - **April** → Harvest spike! Status flips to **Harvest Surplus (Catch-up Phase)**. Recommended EMI becomes **Base EMI + Past Relief Recovery**, allowing Ramesh to repay past deferred relief in a single high-profit cycle without household strain.

---

## Stack

- Plain HTML + CSS + vanilla JS (multi-page, no SPA router)
- Tailwind CSS via CDN
- Chart.js via CDN
- Lucide icons via CDN
- Data/auth: **in-browser mock** that mirrors Supabase (`localStorage` + `BroadcastChannel`).
- Hosting: Cloudflare Pages, framework preset **None**, empty build command, output directory `/`

---

## Key Features & Cash-Flow Engine

- **Adaptive EMI Scaling**: Automatically scales EMI down to 30%–50% of base during planting or lean months when household cash is tight.
- **Harvest Surplus Catch-Up Recovery**: Tracks cumulative deferred relief during lean months and automatically recommends a Catch-Up EMI ($\text{Base EMI} + \text{Past Relief Recovery}$) during high-income harvest cycles without creating household distress.
- **MicroPulse Weekly Bites**: Offers optional small weekly micro-payments during stress periods to maintain financial momentum.
- **Dynamic 7-Language i18n**: Hand-authored dictionary & rule-based engine translating static text, dynamic cash-flow narratives, status pills, and live notifications at render time.

---

## Multi-Language Support (7 Languages)

EquiFlow features a pure client-side internationalization system (`shared/i18n.js` & `shared/i18nEngine.js`) supporting **English, Hindi, Marathi, Marwadi, Tamil, Telugu, and Bengali**.
Language choices persist across page navigation via `localStorage`.

> **Note on Marwadi Translation**: Marwadi (`mwr`) translations are a best-effort first draft and have not been reviewed by a native speaker. Recommend review before relying on them in front of judges or real users.

---




## File structure

```
microloan_repayment_platform/
├── index.html                 # Login + Judge Pitch + SDG 8
├── signup.html                # Signup + Farmer / Lender role
├── farmer/
│   ├── dashboard.html
│   └── dashboard.js
├── lender/
│   ├── dashboard.html
│   └── dashboard.js
├── shared/
│   ├── supabaseClient.js      # Init + mock database
│   ├── authGuard.js           # Session + role redirect
│   ├── adaptiveEngine.js      # Cash-flow engine (deterministic JS)
│   ├── mockData.js            # Seeded farmer + gig-worker book
│   └── style.css
└── README.md
```

---

## Supabase schema (if you switch off the mock)

```sql
-- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null check (role in ('farmer', 'lender')),
  occupation text,
  location text,
  avatar text,
  created_at timestamptz default now()
);

-- loans
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.profiles (id),
  lender_id uuid references public.profiles (id),
  principal numeric not null,
  outstanding numeric,
  base_emi numeric not null,
  start_date date,
  status text default 'active',
  product text
);

-- transactions (monthly cash-flow snapshots for the demo)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.profiles (id),
  txn_date date not null,
  income numeric not null default 0,
  expenses numeric not null default 0,
  farming_expenses numeric not null default 0,
  category text
);

-- repayment_plans
create table public.repayment_plans (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans (id),
  status text,
  risk_level text,
  recommended_emi numeric,
  message text,
  suggested_action text,
  cashflow_status text,
  for_month text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.loans enable row level security;
alter table public.transactions enable row level security;
alter table public.repayment_plans enable row level security;
```

