import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providers = await prisma.provider.findMany({
    include: {
      leadAssignments: {
        include: {
          lead: { include: { service: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
    orderBy: { id: "asc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(
    providers.map((p: any) => ({
      id: p.id,
      name: p.name,
      monthlyQuota: p.monthlyQuota,
      quotaUsed: p.quotaUsed,
      quotaRemaining: p.monthlyQuota - p.quotaUsed,
      leadsCount: p.leadAssignments.length,
      leads: p.leadAssignments.map((a: any) => ({
        id: a.lead.id,
        name: a.lead.name,
        phone: a.lead.phone,
        city: a.lead.city,
        service: a.lead.service.name,
        assignedAt: a.assignedAt,
      })),
    }))
  );
}
