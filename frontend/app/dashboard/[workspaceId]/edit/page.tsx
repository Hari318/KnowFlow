"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { workspaceService } from "@/lib/workspaces";
import { useWorkspaces } from "@/lib/workspaces-context";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";

export default function EditWorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refresh } = useWorkspaces();

  useEffect(() => {
    workspaceService.get(workspaceId)
      .then((w) => {
        setName(w.name);
        setDescription(w.description || "");
        setLoading(false);
      })
      .catch((err) => setError(err.message));
  }, [workspaceId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await workspaceService.update(workspaceId, { name, description: description || undefined });
      refresh();
      router.push(`/dashboard/${workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-lg font-medium text-foreground mb-4">Edit workspace</h1>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/dashboard/${workspaceId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Card>
  );
}