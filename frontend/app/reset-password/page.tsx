"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth";
import { Button } from "@/components/Button";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/Spinner";
import { Card } from "@/components/Card";

function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token!, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-danger">
        This reset link is missing its token. Request a new one from the{" "}
        <Link href="/forgot-password" className="text-accent hover:underline">
          forgot password
        </Link>{" "}
        page.
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground">Your password has been updated.</p>
        <Link href="/login">
          <Button type="button">Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-danger text-sm">{error}</p>}
      <PasswordInput
        placeholder="New password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      <PasswordInput
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> Saving…
          </span>
        ) : (
          "Set new password"
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-4 text-foreground">Choose a new password</h1>
        <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </div>
  );
}