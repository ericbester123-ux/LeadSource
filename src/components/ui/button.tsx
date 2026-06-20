import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-gold-300 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-white hover:bg-black",
        variant === "secondary" && "border border-gold-300 bg-gold-50 text-ink hover:bg-gold-100",
        variant === "ghost" && "text-ink hover:bg-black/5",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
