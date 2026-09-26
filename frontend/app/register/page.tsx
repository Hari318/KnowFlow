"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { register, login } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await register(email, password, firstName, lastName || undefined, inviteToken);
      await login(email, password);
      router.push(result.invited_workspace_id ? `/dashboard/${result.invited_workspace_id}` : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-4 text-foreground">
          {inviteToken ? "You've been invited — create your account" : "Create your account"}
        </h1>
        {error && <p className="text-danger text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input type="text" placeholder="Last name (optional)" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <Button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="text-sm text-muted mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-accent hover:underline">Log in</a>
        </p>
      </Card>
    </div>
  );
}