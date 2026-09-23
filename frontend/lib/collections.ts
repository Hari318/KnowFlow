import { apiFetch } from "./api";

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function listCollections(workspaceId: string) {
  return apiFetch<Collection[]>(`/workspaces/${workspaceId}/collections`);
}

export function getCollection(workspaceId: string, collectionId: string) {
  return apiFetch<Collection>(`/workspaces/${workspaceId}/collections/${collectionId}`);
}

export function createCollection(workspaceId: string, name: string, description?: string) {
  return apiFetch<Collection>(`/workspaces/${workspaceId}/collections`, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export function updateCollection(
  workspaceId: string,
  collectionId: string,
  data: { name?: string; description?: string }
) {
  return apiFetch<Collection>(`/workspaces/${workspaceId}/collections/${collectionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteCollection(workspaceId: string, collectionId: string) {
  return apiFetch<void>(`/workspaces/${workspaceId}/collections/${collectionId}`, {
    method: "DELETE",
  });
}