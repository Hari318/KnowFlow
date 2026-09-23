"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getNote, updateNote } from "@/lib/notes";

export default function NoteEditorPage() {
  const {workspaceId, noteId} = useParams<{ workspaceId: string; noteId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    getNote(workspaceId, noteId).then((n) => {
      setTitle(n.title);
      setContent(n.content);
      setLoading(false);
    });
  }, [workspaceId, noteId]);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (loading) return;

    setStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        await updateNote(workspaceId, noteId, {title, content});
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 800);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  // ...rest of the component (loading check, JSX) stays exactly the same

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push(`/dashboard/${workspaceId}`)}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to workspace
        </button>
        <span className="text-xs text-muted">
          {status === "saving" && "Saving..."}
          {status === "saved" && "Saved"}
          {status === "error" && "Failed to save"}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="w-full text-2xl font-medium bg-transparent text-foreground placeholder:text-muted focus:outline-none mb-4"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing..."
        className="w-full min-h-[70vh] bg-transparent text-foreground placeholder:text-muted focus:outline-none resize-none leading-relaxed"
      />
    </div>
  );
}