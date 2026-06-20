import { ReactNode } from "react";
import { Button } from "./button";

export function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-glow">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm text-neutral-600">{children}</div>
    </div>
  );
}

export function ConfirmationModal({ title, message }: { title: string; message: string }) {
  return (
    <Modal title={title}>
      <p>{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button>Confirm</Button>
      </div>
    </Modal>
  );
}
