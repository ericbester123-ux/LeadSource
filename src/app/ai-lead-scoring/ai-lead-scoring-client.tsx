"use client";

import { useMemo, useState } from "react";
import { Brain, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import { qualityLabels } from "@/lib/constants";
import { ScoringLeadWithInclude } from "@/lib/lead-include";
import { overrideLeadScore, scoreAllUnscoredLeads, scoreSelectedLeads, scoreSingleLead } from "./actions";

type ScoringLead = ScoringLeadWithInclude;

export function AiLeadScoringClient({ leads }: { leads: ScoringLead[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [overrideLead, setOverrideLead] = useState<ScoringLead | null>(null);
  const unscored = leads.filter((lead) => !lead.leadScore);
  const scored = leads.filter((lead) => lead.leadScore);
  const averageScore = useMemo(() => {
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, lead) => sum + (lead.leadScore?.score ?? 0), 0) / scored.length);
  }, [scored]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold">AI Lead Scoring</h2>
          <p className="mt-1 text-sm text-neutral-600">Score real estate fit, personalisation, offer angle, and compliance risk.</p>
        </div>
        <form action={scoreAllUnscoredLeads}>
          <Button>
            <Sparkles className="h-4 w-4" />
            Score all unscored
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-neutral-500">Scored leads</div><div className="mt-1 text-2xl font-semibold">{scored.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Unscored leads</div><div className="mt-1 text-2xl font-semibold">{unscored.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Average score</div><div className="mt-1 text-2xl font-semibold">{averageScore}</div></Card>
      </div>

      <form action={scoreSelectedLeads}>
        {selected.map((id) => <input key={id} type="hidden" name="leadIds" value={id} />)}
        <Card className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="black">{selected.length} selected</Badge>
          <Button variant="secondary" disabled={!selected.length}>
            <Brain className="h-4 w-4" />
            Bulk score selected
          </Button>
        </Card>
      </form>

      <TableWrap>
        <div className="max-h-[68vh] overflow-auto">
          <Table className="min-w-[1700px]">
            <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3"></th>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">Country</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Quality</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Personalisation</th>
                <th className="px-3 py-3">Pain point</th>
                <th className="px-3 py-3">Offer angle</th>
                <th className="px-3 py-3">Subject</th>
                <th className="px-3 py-3">Recommended campaign</th>
                <th className="px-3 py-3">Compliance risk</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {leads.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggle(lead.id)} className="h-4 w-4 accent-gold-500" /></td>
                  <td className="px-3 py-3">{lead.fullName || lead.email}</td>
                  <td className="px-3 py-3 font-medium">{lead.companyName}</td>
                  <td className="px-3 py-3">{lead.country}</td>
                  <td className="px-3 py-3 text-lg font-semibold">{lead.leadScore?.score ?? "-"}</td>
                  <td className="px-3 py-3">{lead.leadScore ? <StatusBadge status={lead.leadScore.qualityLabel} /> : <Badge>Unscored</Badge>}</td>
                  <td className="max-w-[240px] px-3 py-3">{lead.leadScore?.reasonForScore}</td>
                  <td className="max-w-[240px] px-3 py-3">{lead.leadScore?.personalisationFirstLine}</td>
                  <td className="max-w-[220px] px-3 py-3">{lead.leadScore?.suggestedPainPoint}</td>
                  <td className="max-w-[220px] px-3 py-3">{lead.leadScore?.suggestedOfferAngle}</td>
                  <td className="max-w-[220px] px-3 py-3">{lead.leadScore?.suggestedSubjectLine}</td>
                  <td className="px-3 py-3">{lead.leadScore?.recommendedCampaign}</td>
                  <td className="max-w-[240px] px-3 py-3">{lead.leadScore?.complianceRiskNotes}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <form action={scoreSingleLead}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <Button variant="ghost" className="h-9 px-3"><CheckCircle2 className="h-4 w-4" /> Score</Button>
                      </form>
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setOverrideLead(lead)}>Override</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </TableWrap>

      {overrideLead && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form action={overrideLeadScore} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-glow">
            <input type="hidden" name="leadId" value={overrideLead.id} />
            <h3 className="text-lg font-semibold">Manual score override</h3>
            <p className="mt-1 text-sm text-neutral-600">{overrideLead.companyName}</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm font-medium">Score<Input name="score" type="number" min="1" max="100" defaultValue={overrideLead.leadScore?.score ?? 75} /></label>
              <label className="grid gap-1 text-sm font-medium">Quality label<Select name="qualityLabel" defaultValue={overrideLead.leadScore?.qualityLabel ?? "Good Fit"}>{qualityLabels.map((label) => <option key={label}>{label}</option>)}</Select></label>
              <label className="grid gap-1 text-sm font-medium">Override reason<Textarea name="reason" required defaultValue="Manual review override." /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOverrideLead(null)}>Cancel</Button>
              <Button>Save override</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
