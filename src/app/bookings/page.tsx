import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Table, TableWrap } from "@/components/ui/table";
import { formatDate } from "@/lib/lead-utils";
import { createBookingAction, updateBookingStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const [bookings, leads] = await Promise.all([
    prisma.booking.findMany({ include: { lead: true }, orderBy: { bookedAt: "desc" } }),
    prisma.lead.findMany({ orderBy: { companyName: "asc" }, take: 200 })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Bookings</h2>
        <p className="mt-1 text-sm text-neutral-600">Track booked appointments created from replies, manual review, or calendar links.</p>
      </div>
      <Card>
        <CardHeader><h3 className="text-lg font-semibold">Record Booking</h3></CardHeader>
        <form action={createBookingAction} className="grid gap-3 md:grid-cols-4">
          <Select name="leadId" required>
            <option value="">Choose lead</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.companyName} - {lead.email}</option>)}
          </Select>
          <Input name="bookedAt" type="datetime-local" required />
          <Input name="calendarLink" placeholder="Calendar link" />
          <Select name="status" defaultValue="Booked">
            <option>Booked</option>
            <option>Completed</option>
            <option>No Show</option>
            <option>Cancelled</option>
          </Select>
          <Textarea name="notes" className="md:col-span-3" placeholder="Booking notes" />
          <Button>Create booking</Button>
        </form>
      </Card>
      <TableWrap>
        <Table className="min-w-[1100px]">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr><th className="px-3 py-3">Lead</th><th className="px-3 py-3">Booked At</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Calendar</th><th className="px-3 py-3">Notes</th><th className="px-3 py-3">Update</th></tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {bookings.map((booking) => (
              <tr key={booking.id} className="align-top">
                <td className="px-3 py-3"><div className="font-medium">{booking.lead.companyName}</div><div className="text-xs text-neutral-500">{booking.lead.email}</div></td>
                <td className="px-3 py-3">{formatDate(booking.bookedAt)}</td>
                <td className="px-3 py-3"><StatusBadge status={booking.status} /></td>
                <td className="px-3 py-3">{booking.calendarLink ? <a className="text-gold-700 underline" href={booking.calendarLink} target="_blank">Open</a> : ""}</td>
                <td className="max-w-[260px] px-3 py-3">{booking.notes}</td>
                <td className="px-3 py-3">
                  <form action={updateBookingStatusAction} className="grid min-w-[260px] gap-2">
                    <input type="hidden" name="id" value={booking.id} />
                    <Select name="status" defaultValue={booking.status}>
                      <option>Booked</option>
                      <option>Completed</option>
                      <option>No Show</option>
                      <option>Cancelled</option>
                    </Select>
                    <Input name="notes" placeholder="Update notes" />
                    <Button variant="secondary">Update</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
