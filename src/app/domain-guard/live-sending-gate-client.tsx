"use client";

import { useState } from "react";
import { AlertTriangle, Lock, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { disableLiveSendingGateAction, enableLiveSendingGateAction, checkLiveSendingGateAction } from "./actions";

export function LiveSendingGateClient({
  allowed,
  reasons,
  liveSendingAllowed,
  lastGateBlockReason
}: {
  allowed: boolean;
  reasons: string[];
  liveSendingAllowed: boolean;
  lastGateBlockReason?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="text-lg font-semibold">Live Sending Gate</h3>
          <p className="text-sm text-neutral-600">Live sending remains blocked unless every safety check passes and the confirmation phrase is entered.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={allowed ? "green" : "red"}>{allowed ? "Live sending allowed" : "Live sending blocked"}</Badge>
          <Badge tone={liveSendingAllowed ? "green" : "gray"}>{liveSendingAllowed ? "Gate enabled" : "Gate disabled"}</Badge>
        </div>
      </CardHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Block reasons
          </div>
          <ul className="space-y-2 text-sm text-neutral-700">
            {reasons.map((reason) => <li key={reason}>{reason}</li>)}
            {!reasons.length && <li>No current block reasons.</li>}
          </ul>
          {lastGateBlockReason && <div className="mt-4 rounded-md bg-white p-3 text-sm text-red-700">{lastGateBlockReason}</div>}
        </div>

        <div className="space-y-2">
          <form action={checkLiveSendingGateAction}>
            <Button className="w-full" variant="secondary"><Lock className="h-4 w-4" /> Run gate check</Button>
          </form>
          <Button type="button" className="w-full" disabled={Boolean(reasons.length)} onClick={() => setOpen(true)}>
            <Power className="h-4 w-4" /> Enable live sending
          </Button>
          <form action={disableLiveSendingGateAction}>
            <Button className="w-full" variant="danger"><Power className="h-4 w-4" /> Disable live sending</Button>
          </form>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form action={enableLiveSendingGateAction} className="w-full max-w-xl rounded-lg bg-white p-5 shadow-glow">
            <CardHeader className="px-0 pt-0">
              <div>
                <h3 className="text-lg font-semibold">Enable live sending</h3>
                <p className="text-sm leading-6 text-neutral-600">
                  Live sending can affect domain reputation and legal compliance. Confirm that SPF, DKIM, DMARC, unsubscribe,
                  suppression list, email verification, compliance checks, and safe sending limits are configured.
                </p>
              </div>
            </CardHeader>
            <label className="grid gap-2 text-sm font-medium">
              Type ENABLE LIVE SENDING
              <Input name="confirmation" placeholder="ENABLE LIVE SENDING" required />
            </label>
            <input type="hidden" name="enabledBy" value="Manual user" />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button>Confirm enable</Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}
