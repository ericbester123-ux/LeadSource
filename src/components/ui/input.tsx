import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import clsx from "clsx";

const fieldClasses =
  "min-h-10 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldClasses, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(fieldClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(fieldClasses, "min-h-28", className)} {...props} />;
}
