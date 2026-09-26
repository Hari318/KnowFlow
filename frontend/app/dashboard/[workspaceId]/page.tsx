"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { workspaceService, Workspace } from "@/lib/workspaces";
import { listCollections, createCollection, Collection } from "@/lib/collections";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { listNotes, deleteNote, Note } from "@/lib/notes";
import { useWorkspaces } from "@/lib/workspaces-context";
import { listMembers, Member } from "@/lib/members";
import { useApp } from "@/lib/app-context";

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const { refresh } = useWorkspaces();

  const [members, setMembers] = useState<Member[]>([]);
  const { currentUser, setActiveWorkspace } = useApp();
  const isOwner = currentUser
    ? members.some((m) => m.user_id === currentUser.id && m.role === "owner")
    : false;

  function loadCollections() {
    listCollections(workspaceId)
      .then(setCollections)
      .catch((err) => setError(err.message));
  }

  function loadNotes() {
    listNotes(workspaceId)
      .then(setNotes)
      .catch((err) => setError(err.message));
  }

  function loadMembers() {
    listMembers(workspaceId)
      .then(setMembers)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    workspaceService.get(workspaceId)
      .then(setWorkspace)
      .catch((err) => setError(err.message));
    loadCollections();
    loadNotes();
    loadMembers();
  }, [workspaceId]);

  useEffect(() => {
  if (currentUser) {
    setActiveWorkspace({ workspaceId, members, isOwner });
  }
  return () => setActiveWorkspace(null);
  }, [workspaceId, members, currentUser, isOwner]);

  async function handleDelete() {
    if (!confirm("Delete this workspace? This cannot be undone.")) return;
    try {
      await workspaceService.delete(workspaceId);
      refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createCollection(workspaceId, name, description || undefined);
      setName("");
      setDescription("");
      setModalOpen(false);
      loadCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setCreating(false);
    }
  }

  function handleNewNote() {
    router.push(`/dashboard/${workspaceId}/notes/new`);
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(workspaceId, noteId);
      loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!workspace) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <Card className="w-full">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-medium text-foreground">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-sm text-muted mt-1">{workspace.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {isOwner && (
                <>
                  <Link href={`/dashboard/${workspace.id}/edit`}>
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  <Button variant="danger" onClick={handleDelete}>
                    Delete
                  </Button>
                </>
            )}
          </div>
        </div>
        <p className="text-xs text-muted mt-4">
          Created {new Date(workspace.created_at).toLocaleDateString()}
        </p>
      </Card>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-lg font-medium text-foreground">Collections</h2>
        <Button onClick={() => setModalOpen(true)}>+ New collection</Button>
      </div>

      <div className="flex flex-col gap-3">
        {collections.map((c) => (
          <Link key={c.id} href={`/dashboard/${workspaceId}/${c.id}`}>
            <Card className="w-full hover:border-accent transition-colors cursor-pointer">
              <h3 className="font-medium text-foreground">{c.name}</h3>
              {c.description && (
                <p className="text-sm text-muted mt-1">{c.description}</p>
              )}
            </Card>
          </Link>
        ))}
        {collections.length === 0 && (
          <p className="text-muted text-sm">No collections yet — create your first one.</p>
        )}
      </div>
            <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-lg font-medium text-foreground">Notes</h2>
        <Button onClick={handleNewNote}>+ New note</Button>
      </div>

      <div className="flex flex-col gap-3">
        {notes.map((n) => (
          <Card
            key={n.id}
            className="w-full hover:border-accent transition-colors cursor-pointer"
            onClick={() => router.push(`/dashboard/${workspaceId}/notes/${n.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="font-medium text-foreground truncate">{n.title || "Untitled"}</h3>
                <p className="text-sm text-muted mt-1 line-clamp-2">{n.content}</p>
              </div>
              <Button
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(n.id);
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {notes.length === 0 && (
          <p className="text-muted text-sm">No notes yet — jot down your first one.</p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2 className="text-lg font-medium text-foreground mb-4">New collection</h2>
        <form onSubmit={handleCreateCollection} className="flex flex-col gap-3">
          <Input
            type="text"
            placeholder="Collection name"
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
    </div>
  );
}