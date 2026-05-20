import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/allocation";

export async function POST() {
  try {
    await seedDatabase();
    return NextResponse.json({ success: true, message: "Database seeded successfully." });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Seeding failed." }, { status: 500 });
  }
}
