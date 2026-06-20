import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { isValidUnsubscribeToken } from "@/lib/email-sending/emailRenderService";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!email || !token || !isValidUnsubscribeToken(email, token)) {
    return NextResponse.json({ ok: false, message: "Invalid unsubscribe link." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { email } });
  if (!lead) {
    return NextResponse.json({ ok: true, message: "Unsubscribe request recorded." });
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: "Unsubscribed",
      unsubscribed: true,
      doNotContact: true
    }
  });
  await prisma.suppressionListEntry.upsert({
    where: { email },
    update: {
      reason: "Unsubscribed",
      source: "Unsubscribe link",
      notes: "Lead used unsubscribe link."
    },
    create: {
      email,
      reason: "Unsubscribed",
      source: "Unsubscribe link",
      notes: "Lead used unsubscribe link."
    }
  });
  await prisma.sendingQueueItem.updateMany({
    where: {
      leadId: lead.id,
      status: { in: ["Queued", "Ready for Review", "Approved", "Scheduled"] }
    },
    data: {
      status: "Stopped",
      skippedReason: "Lead unsubscribed.",
      skipReason: "Lead unsubscribed."
    }
  });
  await writeAudit("Lead unsubscribed from link", "Lead", lead.id, "Lead used unsubscribe link", { email });

  return NextResponse.json({ ok: true, message: "You have been unsubscribed." });
}
