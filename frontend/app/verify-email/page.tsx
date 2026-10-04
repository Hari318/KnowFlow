"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { httpClient } from "@/lib/api";
import { Button } from "@/components/Button";

type Status = "loading" | "success" | "error";

interface VerifyEmailResponse {
  message: string;
  is_verified: boolean;
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    async function verify() {
      try {
        const data = await httpClient.get<VerifyEmailResponse>(
          `/auth/verify-email?token=${token}`
        );
        setStatus("success");
        setMessage(data.message);
      } catch (err) {
        setStatus("error");
        setMessage((err as Error).message || "Verification failed.");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center space-y-4">
        {status === "loading" && (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              Verifying your email…
            </h1>
            <p className="text-sm text-muted">Hang tight, this only takes a second.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-xl font-semibold text-accent">Email verified!</h1>
            <p className="text-sm text-muted">{message}</p>
            <Button className="mt-2 w-full" onClick={() => router.push("/login")}>
              Go to login
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-danger">
              Verification failed
            </h1>
            <p className="text-sm text-muted">{message}</p>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => router.push("/login")}
            >
              Back to login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}