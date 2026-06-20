import { Loader2 } from "lucide-react";

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/20 bg-white p-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{message}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
