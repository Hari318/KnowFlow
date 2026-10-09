"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-2 text-foreground">Forgot your password?</h1>
        {sent ? (
          <p className="text-sm text-muted">
            If an account exists for <span className="text-foreground">{email}</span>, we&apos;ve
            sent a reset link. It expires in 1 hour.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>
            {error && <p className="text-danger text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </>
        )}
        <p className="text-sm text-muted mt-4">
          <Link href="/login" className="text-accent hover:underline">
            Back to log in
          </Link>
        </p>
      </Card>
    </div>
  );
}