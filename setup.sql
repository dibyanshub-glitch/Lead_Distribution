-- Prowider Lead Distribution System
-- Run this SQL to set up the database manually if Prisma migrate fails

CREATE TABLE IF NOT EXISTS "Service" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Provider" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "monthlyQuota" INT NOT NULL DEFAULT 10,
  "quotaUsed" INT NOT NULL DEFAULT 0,
  "allocationIndex" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "serviceId" INT NOT NULL REFERENCES "Service"("id"),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("phone", "serviceId")
);

CREATE TABLE IF NOT EXISTS "LeadAssignment" (
  "id" SERIAL PRIMARY KEY,
  "leadId" INT NOT NULL REFERENCES "Lead"("id"),
  "providerId" INT NOT NULL REFERENCES "Provider"("id"),
  "assignedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("leadId", "providerId")
);

CREATE TABLE IF NOT EXISTS "AllocationState" (
  "id" SERIAL PRIMARY KEY,
  "serviceId" INT NOT NULL UNIQUE,
  "nextIndex" INT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "payload" JSONB NOT NULL DEFAULT '{}'
);

-- Seed data
INSERT INTO "Service" ("name") VALUES ('Service 1'), ('Service 2'), ('Service 3')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Provider" ("name", "monthlyQuota", "quotaUsed")
VALUES
  ('Provider 1', 10, 0),
  ('Provider 2', 10, 0),
  ('Provider 3', 10, 0),
  ('Provider 4', 10, 0),
  ('Provider 5', 10, 0),
  ('Provider 6', 10, 0),
  ('Provider 7', 10, 0),
  ('Provider 8', 10, 0)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "AllocationState" ("serviceId", "nextIndex")
SELECT "id", 0 FROM "Service"
ON CONFLICT ("serviceId") DO NOTHING;
