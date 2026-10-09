import { apiFetch } from "./api";

export interface SourceChunk {
  document_id: string;
  document_name: string;
  // Present once the backend includes it in SourceChunk; the UI links to the
  // collection when it exists and falls back to plain text when it doesn't.
  collection_id?: string | null;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface AskResponse {
  answer: string;
  sources: SourceChunk[];
}

export function askWorkspace(workspaceId: string, question: string) {
  return apiFetch<AskResponse>(`/workspaces/${workspaceId}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}