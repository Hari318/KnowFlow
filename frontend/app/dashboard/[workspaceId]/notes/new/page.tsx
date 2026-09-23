"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createNote } from "@/lib/notes";

export default function NewNotePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const creating = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleCreate(nextTitle: string, nextContent: string) {
    if (!nextTitle.trim() && !nextContent.trim()) return; // still blank — do nothing
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setStatus("saving");
    saveTimeout.current = setTimeout(async () => {
      if (creating.current) return;
      creating.current = true;
      try {
        const note = await createNote(workspaceId, nextTitle, nextContent);
        router.replace(`/dashboard/${workspaceId}/notes/${note.id}`);
      } catch {
        creating.current = false;
        setStatus("idle");
      }
    }, 800);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    scheduleCreate(e.target.value, content);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    scheduleCreate(title, e.target.value);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push(`/dashboard/${workspaceId}`)}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to workspace
        </button>
        <span className="text-xs text-muted">{status === "saving" && "Saving..."}</span>
      </div>

      <input
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="w-full text-2xl font-medium bg-transparent text-foreground placeholder:text-muted focus:outline-none mb-4"
      />

      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Start writing..."
        className="w-full min-h-[70vh] bg-transparent text-foreground placeholder:text-muted focus:outline-none resize-none leading-relaxed"
      />
    </div>
  );
}