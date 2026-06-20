"use client";

import { useMemo, useState } from "react";
import { Campaign, EmailSendLog, Lead, Prisma, SendingQueueItem } from "@prisma/client";
import { CheckCircle2, MessageSquarePlus, Search, ThumbsDown, CalendarCheck, Ban, AlertTriangle, BriefcaseBusiness, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import { formatDate } from "@/lib/lead-utils";
import { ReplyWithInclude } from "@/lib/replies/replyService";
import { replyStatuses } from "@/lib/replies/replyClassificationService";
import { addManualReplyAction, createReferralLeadAction, markReplyStatusAction, updateReplyAction } from "./actions";

type LeadWithCampaigns = Prisma.LeadGetPayload<{ include: { campaignEnrollments: { include: { campaign: true } } } }>;
type QueueOption = SendingQueueItem & { lead: Lead; campaign: Campaign };
type SendLogOption = EmailSendLog & { lead: Lead; campaign: Campaign | null };

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function statusTone(status: string) {
  if (["Positive", "Booked", "Referral"].includes(status)) return "green";
  if (["Not Interested", "Unsubscribe Request", "Angry"].includes(status)) return "red";
  if (status === "Out of Office") return "gold";
  return "gray";
}

function statusButton(status: string) {
  const icon = {
    Positive: CheckCircle2,
    Booked: CalendarCheck,
    "Not Interested": ThumbsDown,
    "Unsubscribe Request": Ban,
    Angry: AlertTriangle,
    "Out of Office": RefreshCw,
    Referral: BriefcaseBusiness
  }[status] ?? CheckCircle2;
  return icon;
}

export function RepliesClient({
  replies,
  leads,
  campaigns,
  queueItems,
  sendLogs
}: {
  replies: ReplyWithInclude[];
  leads: LeadWithCampaigns[];
  campaigns: Campaign[];
  queueItems: QueueOption[];
  sendLogs: SendLogOption[];
}) {
  const [status, setStatus] = useState("");
  const [campaign, setCampaign] = useState("");
  const [country, setCountry] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ReplyWithInclude | null>(null);
  const [referral, setReferral] = useState<ReplyWithInclude | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return replies.filter((reply) => {
      const haystack = [reply.lead.companyName, reply.lead.email, reply.lead.fullName, reply.lead.firstName, reply.lead.lastName].filter(Boolean).join(" ").toLowerCase();
      return (
        (!status || reply.replyStatus === status) &&
        (!campaign || reply.campaignId === campaign) &&
        (!country || reply.lead.country === country) &&
        (!leadStatus || reply.lead.status === leadStatus) &&
        (!q || haystack.includes(q))
      );
    });
  }, [campaign, country, leadStatus, query, replies, status]);

  const counts = {
    total: replies.length,
    positive: replies.filter((reply) => reply.replyStatus === "Positive").length,
    booked: replies.filter((reply) => reply.replyStatus === "Booked").length,
    notInterested: replies.filter((reply) => reply.replyStatus === "Not Interested").length,
    unsubscribes: replies.filter((reply) => reply.replyStatus === "Unsubscribe Request").length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Replies</h2>
          <p className="mt-1 text-sm text-neutral-600">Manual reply tracking with safe follow-up stop rules.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold">Manual Tracking Active</Badge>
          <Badge tone="black">Gmail / IMAP placeholders</Badge>
          <Button type="button" onClick={() => setShowAdd(true)}><MessageSquarePlus className="h-4 w-4" /> Add reply</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4"><div className="text-xs text-neutral-500">Total replies</div><div className="mt-1 text-2xl font-semibold">{counts.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Positive</div><div className="mt-1 text-2xl font-semibold">{counts.positive}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Booked</div><div className="mt-1 text-2xl font-semibold">{counts.booked}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Not interested</div><div className="mt-1 text-2xl font-semibold">{counts.notInterested}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Unsubscribes</div><div className="mt-1 text-2xl font-semibold">{counts.unsubscribes}</div></Card>
      </div>

      <Card>
        <div className="grid gap-3 xl:grid-cols-5">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, email, name" />
          </label>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All reply statuses</option>
            {replyStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={campaign} onChange={(event) => setCampaign(event.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="">All countries</option>
            {unique(replies.map((reply) => reply.lead.country)).map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={leadStatus} onChange={(event) => setLeadStatus(event.target.value)}>
            <option value="">All lead statuses</option>
            {unique(replies.map((reply) => reply.lead.status)).map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
      </Card>

      <TableWrap>
        <div className="max-h-[68vh] overflow-auto">
          <Table className="min-w-[1800px]">
            <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3">Reply</th>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Campaign</th>
                <th className="px-3 py-3">Sent item</th>
                <th className="px-3 py-3">Summary</th>
                <th className="px-3 py-3">Raw reply</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Updated</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((reply) => (
                <tr key={reply.id} className="align-top">
                  <td className="px-3 py-3">
                    <Badge tone={statusTone(reply.replyStatus)}>{reply.replyStatus}</Badge>
                    <div className="mt-2 text-xs text-neutral-500">{reply.replySentiment ?? "No sentiment"}</div>
                    <div className="text-xs text-neutral-500">{formatDate(reply.repliedAt)}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{reply.lead.companyName}</div>
                    <div className="text-xs text-neutral-500">{reply.lead.email}</div>
                    <div className="mt-1"><StatusBadge status={reply.lead.status} /></div>
                  </td>
                  <td className="px-3 py-3">{reply.campaign?.name ?? "No campaign"}</td>
                  <td className="px-3 py-3">
                    <div>Queue: {reply.sendingQueueItemId?.slice(0, 8) ?? "None"}</div>
                    <div className="text-xs text-neutral-500">Send log: {reply.emailSendLogId?.slice(0, 8) ?? "None"}</div>
                  </td>
                  <td className="max-w-[280px] px-3 py-3">{reply.replySummary}</td>
                  <td className="max-w-[320px] px-3 py-3 text-sm text-neutral-700">{reply.rawReplyBody}</td>
                  <td className="max-w-[260px] px-3 py-3 text-sm text-neutral-600">{reply.manualNotes}</td>
                  <td className="px-3 py-3">{formatDate(reply.createdAt)}</td>
                  <td className="px-3 py-3">{formatDate(reply.updatedAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {["Positive", "Booked", "Not Interested", "Unsubscribe Request", "Angry", "Out of Office", "Referral"].map((item) => {
                        const Icon = statusButton(item);
                        return (
                          <form key={item} action={markReplyStatusAction}>
                            <input type="hidden" name="replyId" value={reply.id} />
                            <input type="hidden" name="replyStatus" value={item} />
                            <Button className="h-9 px-3" variant={["Angry", "Unsubscribe Request", "Not Interested"].includes(item) ? "danger" : "ghost"}>
                              <Icon className="h-4 w-4" /> {item}
                            </Button>
                          </form>
                        );
                      })}
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setEditing(reply)}>Edit</Button>
                      {reply.replyStatus === "Referral" && <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setReferral(reply)}>Create referral lead</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </TableWrap>

      {showAdd && (
        <ReplyModal
          title="Add manual reply"
          leads={leads}
          campaigns={campaigns}
          queueItems={queueItems}
          sendLogs={sendLogs}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <EditReplyModal reply={editing} onClose={() => setEditing(null)} />
      )}

      {referral && (
        <ReferralModal reply={referral} onClose={() => setReferral(null)} />
      )}
    </div>
  );
}

function ReplyModal({
  title,
  leads,
  campaigns,
  queueItems,
  sendLogs,
  onClose
}: {
  title: string;
  leads: LeadWithCampaigns[];
  campaigns: Campaign[];
  queueItems: QueueOption[];
  sendLogs: SendLogOption[];
  onClose: () => void;
}) {
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const leadCampaigns = leads.find((lead) => lead.id === leadId)?.campaignEnrollments.map((item) => item.campaign) ?? campaigns;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form action={addManualReplyAction} className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-5 shadow-glow">
        <CardHeader className="px-0 pt-0">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600">Save and apply reply handling rules.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </CardHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Lead
            <Select name="leadId" value={leadId} onChange={(event) => setLeadId(event.target.value)} required>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.companyName} - {lead.email}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Campaign
            <Select name="campaignId">
              <option value="">No campaign</option>
              {leadCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Reply status
            <Select name="replyStatus" defaultValue="Neutral">
              {replyStatuses.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Queue item
            <Select name="sendingQueueItemId">
              <option value="">No queue item</option>
              {queueItems.filter((item) => !leadId || item.leadId === leadId).map((item) => <option key={item.id} value={item.id}>{item.subject}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Email send log
            <Select name="emailSendLogId">
              <option value="">No send log</option>
              {sendLogs.filter((item) => !leadId || item.leadId === leadId).map((item) => <option key={item.id} value={item.id}>{item.subject}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Out-of-office follow-up
            <Input name="outOfOfficeFollowUpAt" type="datetime-local" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Referral handling
            <Select name="referralAction" defaultValue="Pause">
              <option>Pause</option>
              <option>Stop</option>
            </Select>
          </label>
        </div>
        <label className="mt-4 grid gap-1 text-sm font-medium">
          Raw reply body
          <Textarea name="rawReplyBody" placeholder="Paste the reply here" />
        </label>
        <label className="mt-4 grid gap-1 text-sm font-medium">
          Reply summary
          <Input name="replySummary" placeholder="Short summary" />
        </label>
        <label className="mt-4 grid gap-1 text-sm font-medium">
          Manual notes
          <Textarea name="manualNotes" placeholder="Internal notes" />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button>Save reply</Button>
        </div>
      </form>
    </div>
  );
}

function EditReplyModal({ reply, onClose }: { reply: ReplyWithInclude; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form action={updateReplyAction} className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-glow">
        <input type="hidden" name="replyId" value={reply.id} />
        <CardHeader className="px-0 pt-0">
          <h3 className="text-lg font-semibold">Edit reply</h3>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </CardHeader>
        <label className="grid gap-1 text-sm font-medium">
          Reply status
          <Select name="replyStatus" defaultValue={reply.replyStatus}>
            {replyStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </label>
        <label className="mt-4 grid gap-1 text-sm font-medium">
          Raw reply body
          <Textarea name="rawReplyBody" defaultValue={reply.rawReplyBody ?? ""} />
        </label>
        <label className="mt-4 grid gap-1 text-sm font-medium">
          Reply summary
          <Input name="replySummary" defaultValue={reply.replySummary ?? ""} />
        </label>
        <label className="mt-4 grid gap-1 text-sm font-medium">
          Manual notes
          <Textarea name="manualNotes" defaultValue={reply.manualNotes ?? ""} />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </form>
    </div>
  );
}

function ReferralModal({ reply, onClose }: { reply: ReplyWithInclude; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form action={createReferralLeadAction} className="w-full max-w-md rounded-lg bg-white p-5 shadow-glow">
        <input type="hidden" name="replyId" value={reply.id} />
        <h3 className="text-lg font-semibold">Create referral lead</h3>
        <div className="mt-4 grid gap-3">
          <Input name="referralFullName" placeholder="Referral full name" />
          <Input name="referralEmail" type="email" placeholder="Referral email" required />
          <Input name="referralCompanyName" placeholder="Company name" required />
          <Input name="referralCountry" placeholder="Country" defaultValue={reply.lead.country} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button>Create lead</Button>
        </div>
      </form>
    </div>
  );
}
