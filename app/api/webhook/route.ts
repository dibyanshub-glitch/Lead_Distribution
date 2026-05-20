import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitDashboardUpdate } from "@/lib/events";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, type, payload } = body;

    // Validate required fields
    if (!eventId || !type) {
      return NextResponse.json(
        { error: "eventId and type are required." },
        { status: 400 }
      );
    }

    // IDEMPOTENCY CHECK: If we've already processed this eventId, return cached result
    const existing = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        message: "Event already processed. No changes made.",
        processedAt: existing.processedAt,
      });
    }

    let result: Record<string, unknown> = {};

    if (type === "PAYMENT_SUCCESS_RESET_QUOTA") {
      // Reset all providers' quotas back to 10
      await prisma.provider.updateMany({
        data: { quotaUsed: 0, monthlyQuota: 10 },
      });

      // Reset allocation states
      await prisma.allocationState.updateMany({
        data: { nextIndex: 0 },
      });

      result = { message: "All provider quotas reset to 10.", providersUpdated: 8 };

      emitDashboardUpdate({ type: "QUOTA_RESET" });
    } else {
      return NextResponse.json({ error: "Unknown webhook type." }, { status: 400 });
    }

    // Record event for idempotency
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        type,
        payload: payload ?? {},
      },
    });

    return NextResponse.json({ success: true, idempotent: false, ...result });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
