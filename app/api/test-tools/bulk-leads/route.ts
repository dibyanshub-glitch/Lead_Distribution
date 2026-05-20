import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProvidersToLead } from "@/lib/allocation";
import { emitDashboardUpdate } from "@/lib/events";

// Generate 10 leads concurrently to test concurrency handling
export async function POST(req: NextRequest) {
  const { count = 10 } = await req.json().catch(() => ({}));

  const services = await prisma.service.findMany();
  if (services.length === 0) {
    return NextResponse.json({ error: "Please seed the database first." }, { status: 400 });
  }

  const results = await Promise.allSettled(
    Array.from({ length: count }, async (_, i) => {
      const svc = services[i % services.length];
      const phone = `TEST${Date.now()}${i}${Math.floor(Math.random() * 9999)}`;

      try {
        const lead = await prisma.lead.create({
          data: {
            name: `Test User ${i + 1}`,
            phone,
            city: ["Mumbai", "Delhi", "Bangalore", "Ahmedabad", "Chennai"][i % 5],
            description: `Auto-generated test lead #${i + 1}`,
            serviceId: svc.id,
          },
        });

        const providers = await assignProvidersToLead(lead.id, svc.id);
        emitDashboardUpdate({ type: "NEW_LEAD", leadId: lead.id, providerIds: providers });
        return { leadId: lead.id, providers };
      } catch (err: unknown) {
        const e = err as { message?: string };
        return { error: e.message };
      }
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    success: true,
    total: count,
    succeeded,
    failed,
    results: results.map((r) =>
      r.status === "fulfilled" ? r.value : { error: "rejected" }
    ),
  });
}
