import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const MANDATORY_RULES: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
};

const FAIR_POOL: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
};

const TOTAL_ASSIGNMENTS = 3;
const MAX_RETRIES = 5;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function assignProvidersToLead(
  leadId: number,
  serviceId: number
): Promise<number[]> {
  type ProviderRow = { id: number; quota_used: number; monthly_quota: number };
  type StateRow = { id: number; next_index: number };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
          // Lock all providers
          const allProviders = await tx.$queryRaw<ProviderRow[]>`
            SELECT id, "quotaUsed" as quota_used, "monthlyQuota" as monthly_quota
            FROM "Provider"
            ORDER BY id
            FOR UPDATE
          `;

          const quotaMap = new Map<number, number>();
          for (const p of allProviders) {
            quotaMap.set(p.id, p.monthly_quota - p.quota_used);
          }

          const mandatoryIds = MANDATORY_RULES[serviceId] ?? [];
          const fairPool = FAIR_POOL[serviceId] ?? [];
          const assignedProviders: number[] = [];

          for (const pid of mandatoryIds) {
            if ((quotaMap.get(pid) ?? 0) > 0) {
              assignedProviders.push(pid);
            }
          }

          const slotsNeeded = TOTAL_ASSIGNMENTS - assignedProviders.length;

          if (slotsNeeded > 0 && fairPool.length > 0) {
            const stateRows = await tx.$queryRaw<StateRow[]>`
              SELECT id, "nextIndex" as next_index FROM "AllocationState"
              WHERE "serviceId" = ${serviceId}
              FOR UPDATE
            `;

            let currentIndex = stateRows[0]?.next_index ?? 0;
            const stateId = stateRows[0]?.id ?? null;

            const eligiblePool = fairPool.filter(
              (pid) =>
                !assignedProviders.includes(pid) &&
                (quotaMap.get(pid) ?? 0) > 0
            );

            const poolSize = eligiblePool.length;
            const selected: number[] = [];
            let attempts = 0;

            while (selected.length < slotsNeeded && attempts < poolSize * 2) {
              const idx = currentIndex % Math.max(poolSize, 1);
              const pid = eligiblePool[idx];
              currentIndex++;
              attempts++;

              if (
                pid !== undefined &&
                !assignedProviders.includes(pid) &&
                !selected.includes(pid)
              ) {
                selected.push(pid);
              }
            }

            assignedProviders.push(...selected);

            if (stateId) {
              await tx.$executeRaw`
                UPDATE "AllocationState"
                SET "nextIndex" = ${currentIndex}, "updatedAt" = NOW()
                WHERE id = ${stateId}
              `;
            } else {
              await tx.$executeRaw`
                INSERT INTO "AllocationState" ("serviceId", "nextIndex", "updatedAt")
                VALUES (${serviceId}, ${currentIndex}, NOW())
              `;
            }
          }

          const finalAssignments = assignedProviders.slice(0, TOTAL_ASSIGNMENTS);

          for (const pid of finalAssignments) {
            await tx.$executeRaw`
              INSERT INTO "LeadAssignment" ("leadId", "providerId", "assignedAt")
              VALUES (${leadId}, ${pid}, NOW())
            `;
            await tx.$executeRaw`
              UPDATE "Provider"
              SET "quotaUsed" = "quotaUsed" + 1, "updatedAt" = NOW()
              WHERE id = ${pid}
            `;
          }

          return finalAssignments;
        },
        {
          isolationLevel: "Serializable",
          maxWait: 10000,
          timeout: 15000,
        }
      );
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const isSerializationFailure =
        error.code === "P2034" ||
        (error.message?.includes("40001")) ||
        (error.message?.includes("could not serialize"));

      if (isSerializationFailure && attempt < MAX_RETRIES - 1) {
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms...
        await sleep(50 * Math.pow(2, attempt));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Failed to assign providers after max retries");
}

export async function seedDatabase() {
  for (let i = 1; i <= 3; i++) {
    await prisma.$executeRaw`
      INSERT INTO "Service" (name, "createdAt")
      VALUES (${`Service ${i}`}, NOW())
      ON CONFLICT (name) DO NOTHING
    `;
  }

  for (let i = 1; i <= 8; i++) {
    await prisma.$executeRaw`
      INSERT INTO "Provider" (name, "monthlyQuota", "quotaUsed", "allocationIndex", "createdAt", "updatedAt")
      VALUES (${`Provider ${i}`}, 10, 0, 0, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `;
  }

  const services = await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM "Service"`;
  for (const svc of services) {
    await prisma.$executeRaw`
      INSERT INTO "AllocationState" ("serviceId", "nextIndex", "updatedAt")
      VALUES (${svc.id}, 0, NOW())
      ON CONFLICT ("serviceId") DO NOTHING
    `;
  }
}