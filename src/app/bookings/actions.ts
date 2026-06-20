"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export async function createBookingAction(formData: FormData) {
  const leadId = value(formData, "leadId");
  const bookedAt = value(formData, "bookedAt");
  if (!leadId || !bookedAt) return;
  const booking = await prisma.booking.create({
    data: {
      leadId,
      bookedAt: new Date(bookedAt),
      calendarLink: value(formData, "calendarLink"),
      status: value(formData, "status") ?? "Booked",
      notes: value(formData, "notes")
    }
  });
  await prisma.lead.update({ where: { id: leadId }, data: { status: "Booked Appointment" } });
  await writeAudit("Booking created", "Booking", booking.id, "Booking recorded manually", { leadId });
  revalidatePath("/bookings");
}

export async function updateBookingStatusAction(formData: FormData) {
  const id = value(formData, "id");
  const status = value(formData, "status");
  if (!id || !status) return;
  await prisma.booking.update({ where: { id }, data: { status, notes: value(formData, "notes") } });
  await writeAudit("Booking status updated", "Booking", id, `Booking marked ${status}`);
  revalidatePath("/bookings");
}
