import { HTMLAttributes } from "react";
import clsx from "clsx";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "gold" | "green" | "red" | "gray" | "black";
};

export function Badge({ className, tone = "gray", ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "gold" && "bg-gold-100 text-gold-800",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "red" && "bg-red-100 text-red-800",
        tone === "gray" && "bg-neutral-100 text-neutral-700",
        tone === "black" && "bg-ink text-white",
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status.includes("Passed") || status.includes("Valid") || status.includes("Approved")
    ? "green"
    : status.includes("Manual") || status.includes("Review")
      ? "gold"
      : status.includes("Failed") || status.includes("Invalid")
        ? "red"
        : "gray";

  return <Badge tone={tone}>{status}</Badge>;
}
