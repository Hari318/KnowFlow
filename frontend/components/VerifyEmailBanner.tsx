"use client";

import { useState } from "react";
import { resendVerification } from "@/lib/auth";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function resend() {
    setStatus("sending");
    try {
      await resendVerification(email);
      setStatus("sent");
    } catch (err) {
      setError((err as Error).message || "Could not send. Try again later.");
      setStatus("error");
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
      {status === "sent" ? (
        <>We&apos;ve sent a new verification link to {email}.</>
      ) : (
        <>
          Your email isn&apos;t verified yet, so AI features are limited.{" "}
          <button
            onClick={resend}
            disabled={status === "sending"}
            className="font-medium text-foreground underline hover:text-accent disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Resend verification email"}
          </button>
          {status === "error" && <span className="ml-2 text-danger">{error}</span>}
        </>
      )}
    </div>
  );
}