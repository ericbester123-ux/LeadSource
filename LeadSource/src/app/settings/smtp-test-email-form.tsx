"use client";

import { FormEvent, useActionState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendSmtpTestEmailAction } from "./actions";
import { initialSmtpTestEmailState } from "./state";

export function SmtpTestEmailForm() {
  const [state, formAction, pending] = useActionState(sendSmtpTestEmailAction, initialSmtpTestEmailState);

  function confirmSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Send SMTP test email? Campaign sending will remain disabled.")) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={confirmSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">
        Test recipient email
        <Input name="testEmailTo" type="email" placeholder="admin@estateselevate.com" required />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Confirmation
        <Input name="smtpTestConfirmation" placeholder="Type SEND TEST EMAIL" required />
      </label>
      <div className="rounded-md border border-black/10 bg-neutral-50 p-3 text-xs leading-5 text-neutral-600 md:col-span-2">
        Type SEND TEST EMAIL to confirm. With SIMULATE_EMAIL_SENDING=true, no real email is sent and a safe audit log is created.
      </div>
      {state.message && (
        <div
          className={`rounded-md border p-3 text-sm md:col-span-2 ${
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="font-semibold">{state.ok ? "Success" : "Failed"}</div>
          <div className="mt-1">{state.message}</div>
          {state.provider && <div className="mt-1 text-xs">Provider: {state.provider}</div>}
        </div>
      )}
      <div className="md:col-span-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          <Send className="h-4 w-4" />
          {pending ? "Sending test..." : "Send SMTP Test Email"}
        </Button>
      </div>
    </form>
  );
}
