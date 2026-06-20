"use client";

import { useMemo, useState, useTransition } from "react";
import { Brain, CheckCircle2, Eye, MailPlus, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import { qualityLabels } from "@/lib/constants";
import { ScoringLeadWithInclude } from "@/lib/lead-include";
import { AiProviderStatus } from "@/lib/ai/aiProviderFactory";
import {
  generateSuggestedEmailSelected,
  overrideLeadScore,
  previewAiOutput,
  regeneratePersonalisationSelected,
  savePreviewedAiOutput,
  scoreAllUnscoredLeads,
  scoreSelectedLeads,
  scoreSingleLead
} from "./actions";

type ScoringLead = ScoringLeadWithInclude;
type PreviewOutput = Awaited<ReturnType<typeof previewAiOutput>>;

export function AiLeadScoringClient({ leads, aiProviderStatus }: { leads: ScoringLead[]; aiProviderStatus: AiProviderStatus }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [overrideLead, setOverrideLead] = useState<ScoringLead | null>(null);
  const [preview, setPreview] = useState<PreviewOutput>(null);
  const [isPending, startTransition] = useTransition();
  const unscored = leads.filter((lead) => !lead.leadScore);
  const scored = leads.filter((lead) => lead.leadScore);
  const averageScore = useMemo(() => {
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, lead) => sum + (lead.leadScore?.score ?? 0), 0) / scored.length);
  }, [scored]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function previewLead(leadId: string) {
    const formData = new FormData();
    formData.set("leadId", leadId);
    startTransition(async () => {
      setPreview(await previewAiOutput(formData));
    });
  }

  const previewFields = preview && !("error" in preview)
    ? [
        ["score", String(preview.score)],
        ["qualityLabel", preview.qualityLabel],
        ["reasonForScore", preview.reasonForScore],
        ["personalisationFirstLine", preview.personalisationFirstLine],
        ["suggestedPainPoint", preview.suggestedPainPoint],
        ["suggestedOfferAngle", preview.suggestedOfferAngle],
        ["suggestedSubjectLine", preview.suggestedSubjectLine],
        ["suggestedFirstEmail", preview.suggestedFirstEmail],
        ["recommendedCampaign", preview.recommendedCampaign],
        ["complianceRiskNotes", preview.complianceRiskNotes],
        ["providerUsed", preview.providerUsed ?? "unknown"],
        ["fallbackReason", preview.fallbackReason ?? ""]
      ]
    : [];

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

      <Card className="flex flex-wrap items-center gap-2">
        <Badge tone="black">AI provider: {aiProviderStatus.activeProvider === "openai" ? "OpenAI" : "Local"}</Badge>
        <Badge tone={aiProviderStatus.openAiApiKeyConfigured ? "green" : "gold"}>
          OpenAI key {aiProviderStatus.openAiApiKeyConfigured ? "configured" : "missing"}
        </Badge>
        <Badge tone={aiProviderStatus.localFallbackActive ? "gold" : "green"}>
          {aiProviderStatus.localFallbackActive ? "Local fallback active" : "OpenAI ready"}
        </Badge>
        {aiProviderStatus.fallbackReason && <Badge tone="gold">{aiProviderStatus.fallbackReason}</Badge>}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-neutral-500">Scored leads</div><div className="mt-1 text-2xl font-semibold">{scored.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Unscored leads</div><div className="mt-1 text-2xl font-semibold">{unscored.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Average score</div><div className="mt-1 text-2xl font-semibold">{averageScore}</div></Card>
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="black">{selected.length} selected</Badge>
        <form action={scoreSelectedLeads}>
          {selected.map((id) => <input key={id} type="hidden" name="leadIds" value={id} />)}
          <Button variant="secondary" disabled={!selected.length}>
            <Brain className="h-4 w-4" />
            Score selected
          </Button>
        </form>
        <form action={regeneratePersonalisationSelected}>
          {selected.map((id) => <input key={id} type="hidden" name="leadIds" value={id} />)}
          <Button variant="secondary" disabled={!selected.length}>
            <Wand2 className="h-4 w-4" />
            Regenerate personalisation
          </Button>
        </form>
        <form action={generateSuggestedEmailSelected}>
          {selected.map((id) => <input key={id} type="hidden" name="leadIds" value={id} />)}
          <Button variant="secondary" disabled={!selected.length}>
            <MailPlus className="h-4 w-4" />
            Generate first email
          </Button>
        </form>
      </Card>

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
                <th className="px-3 py-3">Suggested first email</th>
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
                  <td className="max-w-[260px] px-3 py-3 whitespace-pre-line">{lead.leadScore?.suggestedFirstEmail}</td>
                  <td className="px-3 py-3">{lead.leadScore?.recommendedCampaign}</td>
                  <td className="max-w-[240px] px-3 py-3">{lead.leadScore?.complianceRiskNotes}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" className="h-9 px-3" disabled={isPending} onClick={() => previewLead(lead.id)}>
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
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
              <label className="grid gap-1 text-sm font-medium">Override reason<Textarea name="reason" required placeholder="Explain why this manual score is correct." /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOverrideLead(null)}>Cancel</Button>
              <Button>Save override</Button>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-5 shadow-glow">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h3 className="text-lg font-semibold">AI output preview</h3>
                <p className="mt-1 text-sm text-neutral-600">Review generated scoring and copy before saving.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            </div>
            {"error" in preview ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{preview.error}</div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-black/10 p-3 text-sm">
                    <div className="text-xs uppercase text-neutral-500">Company</div>
                    <div className="mt-1 font-semibold">{preview.companyName}</div>
                  </div>
                  <div className="rounded-md border border-black/10 p-3 text-sm">
                    <div className="text-xs uppercase text-neutral-500">Score</div>
                    <div className="mt-1 font-semibold">{preview.score} - {preview.qualityLabel}</div>
                  </div>
                  <div className="rounded-md border border-black/10 p-3 text-sm">
                    <div className="text-xs uppercase text-neutral-500">Provider</div>
                    <div className="mt-1 font-semibold">{preview.providerUsed ?? "unknown"}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  {[
                    ["Reason", preview.reasonForScore],
                    ["Personalisation", preview.personalisationFirstLine],
                    ["Pain point", preview.suggestedPainPoint],
                    ["Offer angle", preview.suggestedOfferAngle],
                    ["Subject", preview.suggestedSubjectLine],
                    ["Recommended campaign", preview.recommendedCampaign],
                    ["Compliance risk", preview.complianceRiskNotes]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-black/10 p-3">
                      <div className="text-xs uppercase text-neutral-500">{label}</div>
                      <div className="mt-1">{value}</div>
                    </div>
                  ))}
                  <div className="rounded-md border border-black/10 p-3 md:col-span-2">
                    <div className="text-xs uppercase text-neutral-500">Suggested first email</div>
                    <div className="mt-1 whitespace-pre-line">{preview.suggestedFirstEmail}</div>
                  </div>
                </div>
                <form action={savePreviewedAiOutput} className="mt-5 flex justify-end gap-2">
                  <input type="hidden" name="leadId" value={preview.leadId} />
                  {previewFields.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
                  <Button>Save AI output</Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
