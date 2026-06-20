import { HTMLAttributes, TableHTMLAttributes } from "react";
import clsx from "clsx";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={clsx("w-full border-collapse text-left text-sm", className)} {...props} />;
}

export function TableWrap({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("overflow-hidden rounded-lg border border-black/10 bg-white", className)} {...props} />;
}
