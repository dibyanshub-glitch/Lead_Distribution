<<<<<<< HEAD
# Prowider — Mini Lead Distribution System

A full-stack lead distribution system built with **Next.js 14 (App Router)**, **PostgreSQL**, and **Prisma ORM**.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| Database | PostgreSQL (via Neon / Railway / Supabase) |
| ORM | Prisma |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Vercel |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running locally OR use Neon free tier

### 1. Clone and Install
```bash
git clone https://github.com/YOUR_USERNAME/prowider
cd prowider
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit DATABASE_URL in .env
```

### 3. Setup Database
```bash
# Option A: Prisma migrate
npx prisma migrate dev --name init
npx prisma db seed

# Option B: Raw SQL
psql -U postgres -d prowider_db -f setup.sql

# Option C: Auto (just run the app - /api/seed runs on first visit)
npm run dev
```

### 4. Run
```bash
npm run dev
# http://localhost:3000
```

---

## Deployment (Vercel + Neon — Free)

1. Create DB at [neon.tech](https://neon.tech) → copy connection string
2. Push to GitHub
3. Import repo at [vercel.com](https://vercel.com)
4. Add env var: `DATABASE_URL=your_neon_string?sslmode=require`
5. Deploy → then run migrations:

```bash
DATABASE_URL="your-neon-url" npx prisma migrate deploy
DATABASE_URL="your-neon-url" npx prisma db seed
```

---

## Routes

| Route | Description |
|---|---|
| `/request-service` | Customer lead submission form |
| `/dashboard` | Real-time provider dashboard |
| `/test-tools` | Webhook simulation panel |

---

## Allocation Algorithm

**Mandatory rules (always applied first):**
- Service 1 → Provider 1
- Service 2 → Provider 5
- Service 3 → Provider 1 AND Provider 4

**Fair round-robin pools:**
- Service 1: [P2, P3, P4]
- Service 2: [P6, P7, P8]
- Service 3: [P2, P3, P5, P6, P7, P8]

`AllocationState.nextIndex` in the DB tracks rotation position per service, ensuring fairness persists across server restarts.

---

## Concurrency Handling

Uses PostgreSQL `SELECT FOR UPDATE` + `SERIALIZABLE` transactions:

```typescript
await prisma.$transaction(async (tx) => {
  // Lock providers + allocation state row
  await tx.$queryRaw`SELECT id FROM "Provider" ORDER BY id FOR UPDATE`;
  await tx.$queryRaw`SELECT * FROM "AllocationState" WHERE "serviceId" = ${id} FOR UPDATE`;
  // ... allocate and increment index atomically
}, { isolationLevel: "Serializable" });
```

Concurrent requests queue up, each sees the previous one's committed state.

---

## Webhook Idempotency

```typescript
// Check WebhookEvent table
const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
if (existing) return { idempotent: true }; // No-op

// Process + record
await prisma.provider.updateMany({ data: { quotaUsed: 0 } });
await prisma.webhookEvent.create({ data: { id: eventId, type, payload } });
```

---

## Real-Time

SSE endpoint at `/api/dashboard-events`. Node.js EventEmitter broadcasts when leads are created. Dashboard reconnects automatically on disconnect.
=======
# Lead_Distribution
>>>>>>> fc0b8c3ecc40f34fa85bb171812a91b2cccac174
