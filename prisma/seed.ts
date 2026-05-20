import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Services
  for (let i = 1; i <= 3; i++) {
    await prisma.service.upsert({
      where: { name: `Service ${i}` },
      update: {},
      create: { name: `Service ${i}` },
    });
  }

  // Providers
  for (let i = 1; i <= 8; i++) {
    await prisma.provider.upsert({
      where: { name: `Provider ${i}` },
      update: {},
      create: { name: `Provider ${i}`, monthlyQuota: 10, quotaUsed: 0 },
    });
  }

  // Allocation states
  const services = await prisma.service.findMany();
  for (const svc of services) {
    await prisma.allocationState.upsert({
      where: { serviceId: svc.id },
      update: {},
      create: { serviceId: svc.id, nextIndex: 0 },
    });
  }

  console.log("✅ Seeded: 3 services, 8 providers, allocation states");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
