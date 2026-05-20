import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProvidersToLead } from "@/lib/allocation";
import { emitDashboardUpdate } from "@/lib/events";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, city, serviceId, description } = body;

    if (!name || !phone || !city || !serviceId || !description) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const phoneClean = String(phone).replace(/\D/g, "");
    if (phoneClean.length < 10) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }

    const svcId = parseInt(String(serviceId), 10);
    if (isNaN(svcId)) {
      return NextResponse.json({ error: "Invalid service." }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: svcId } });
    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 400 });
    }

    // Duplicate check (also enforced at DB level via unique constraint)
    const existing = await prisma.lead.findUnique({
      where: { phone_serviceId: { phone: phoneClean, serviceId: svcId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A lead already exists for this phone number and service." },
        { status: 409 }
      );
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name: String(name).trim(),
        phone: phoneClean,
        city: String(city).trim(),
        description: String(description).trim(),
        serviceId: svcId,
      },
    });

    // Assign providers (with concurrency safety)
    const assignedProviderIds = await assignProvidersToLead(lead.id, svcId);

    // Fetch full details for response
    const assignments = await prisma.leadAssignment.findMany({
      where: { leadId: lead.id },
      include: { provider: true },
    });

    // Broadcast real-time update
    emitDashboardUpdate({
      type: "NEW_LEAD",
      leadId: lead.id,
      serviceName: service.name,
      providerIds: assignedProviderIds,
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        service: service.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignedProviders: assignments.map((a: any) => a.provider.name),
      },
    });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A lead already exists for this phone number and service." },
        { status: 409 }
      );
    }
    console.error("Lead creation error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      service: true,
      assignments: { include: { provider: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(leads);
}
