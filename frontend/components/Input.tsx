import { InputHTMLAttributes } from "react";
import clsx from "clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full px-3 py-2 rounded bg-surface border border-border text-foreground",
        "placeholder:text-muted focus:outline-none focus:border-accent",
        className
      )}
      {...props}
    />
  );
}