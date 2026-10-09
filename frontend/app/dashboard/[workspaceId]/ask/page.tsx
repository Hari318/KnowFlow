"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { workspaceService, Workspace } from "@/lib/workspaces";
import { askWorkspace, SourceChunk } from "@/lib/rag";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Markdown } from "@/components/Markdown";

interface Message {
  id: string;
  role: "user" | "assistant" | "notice" | "error";
  text: string;
  sources?: SourceChunk[];
}

function MessageBubble({
  message,
  workspaceId,
}: {
  message: Message;
  workspaceId: string;
}) {
  if (message.role === "user") {
    return (
      <div className="self-end max-w-[85%] rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground whitespace-pre-wrap">
        {message.text}
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="self-start max-w-[85%] rounded-lg border border-danger px-4 py-3 text-sm text-danger">
        {message.text}
      </div>
    );
  }

  if (message.role === "notice") {
    return (
      <div className="self-start max-w-[85%] rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
        {message.text}
      </div>
    );
  }

  return (
    <div className="self-start max-w-[85%] rounded-lg border border-border bg-surface px-4 py-3">
      <Markdown>{message.text}</Markdown>

      {message.sources && message.sources.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted hover:text-foreground">
            Sources ({message.sources.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {message.sources.map((s) => (
              <li
                key={`${s.document_id}-${s.chunk_index}`}
                className="rounded border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  {s.collection_id ? (
                    <Link
                      href={`/dashboard/${workspaceId}/${s.collection_id}`}
                      className="font-medium text-foreground truncate hover:text-accent"
                    >
                      {s.document_name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground truncate">
                      {s.document_name}
                    </span>
                  )}
                  <span className="text-xs text-muted shrink-0">
                    {Math.round(s.similarity * 100)}% match
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted line-clamp-3">{s.content}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function AskPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    workspaceService
      .get(workspaceId)
      .then(setWorkspace)
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: question },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await askWorkspace(workspaceId, question);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: res.answer,
          sources: res.sources,
        },
      ]);
    } catch (err) {
      const error = err as Error & { status?: number };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: error.status === 404 ? "notice" : "error",
          text: error.message || "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <Link
          href={`/dashboard/${workspaceId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {workspace?.name ?? "Back to workspace"}
        </Link>
        <h1 className="text-xl font-medium text-foreground mt-2">Ask AI</h1>
        <p className="text-sm text-muted mt-1">
          Answers come from the documents you&apos;ve indexed in this workspace.
        </p>
      </div>

      <div className="flex flex-col gap-4 min-h-[50vh]">
        {messages.length === 0 && !loading && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            Ask a question about your documents, for example &ldquo;What are the
            key deadlines in the project plan?&rdquo;
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} workspaceId={workspaceId} />
        ))}

        {loading && (
          <div className="self-start rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 flex gap-2 bg-background pt-3 pb-4"
      >
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Ask a question about your documents…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? "Asking…" : "Ask"}
        </Button>
      </form>
    </div>
  );
}
