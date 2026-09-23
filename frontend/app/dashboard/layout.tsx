"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspacesProvider, useWorkspaces } from "@/lib/workspaces-context";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";

function Sidebar() {
  const pathname = usePathname();
  const { workspaces, refresh } = useWorkspaces();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const { workspaceService } = await import("@/lib/workspaces");
      await workspaceService.create(name, description || undefined);
      setName("");
      setDescription("");
      setModalOpen(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <aside className="w-64 border-r border-border px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide">
            Workspaces
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="text-accent hover:text-accent-hover text-lg leading-none"
            title="New workspace"
          >
            +
          </button>
        </div>

        {error && <p className="text-danger text-xs">{error}</p>}

        <div className="flex flex-col gap-1">
          {workspaces.map((w) => {
            const isActive = pathname === `/dashboard/${w.id}`;
            return (
              <Link
                key={w.id}
                href={`/dashboard/${w.id}`}
                className={`px-3 py-2 rounded text-sm truncate transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-surface"
                }`}
              >
                {w.name}
              </Link>
            );
          })}
          {workspaces.length === 0 && (
            <p className="text-muted text-sm px-3">No workspaces yet.</p>
          )}
        </div>
      </aside>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2 className="text-lg font-medium text-foreground mb-4">New workspace</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input
            type="text"
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspacesProvider>
      <div className="flex min-h-[calc(100vh-57px)]">
        <Sidebar />
        <main className="flex-1 px-8 py-10">{children}</main>
      </div>
    </WorkspacesProvider>
  );
}