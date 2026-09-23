import { apiFetch } from "./api";

export interface Note {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function listNotes(workspaceId: string) {
  return apiFetch<Note[]>(`/workspaces/${workspaceId}/notes`);
}

export function getNote(workspaceId: string, noteId: string) {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}`);
}

export function createNote(workspaceId: string, title: string, content: string) {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes`, {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}

export function updateNote(
  workspaceId: string,
  noteId: string,
  data: { title?: string; content?: string }
) {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteNote(workspaceId: string, noteId: string) {
  return apiFetch<void>(`/workspaces/${workspaceId}/notes/${noteId}`, {
    method: "DELETE",
  });
}