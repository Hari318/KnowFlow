import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "bg-surface border border-border rounded-lg p-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}