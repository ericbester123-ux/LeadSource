import { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-black/10 py-6 md:grid-cols-[240px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
