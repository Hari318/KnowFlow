import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-accent text-accent-foreground hover:bg-accent-hover",
        variant === "secondary" && "bg-surface border border-border text-foreground hover:border-accent",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        className
      )}
      {...props}
    />
  );
}