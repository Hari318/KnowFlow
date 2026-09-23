import { apiFetch } from "./api";

export interface Document {
  id: string;
  collection_id: string;
  uploaded_by: string;
  name: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  version_number: number;
}

export function listDocuments(workspaceId: string, collectionId: string, search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<Document[]>(
    `/workspaces/${workspaceId}/collections/${collectionId}/documents${query}`
  );
}

export async function uploadDocument(
  workspaceId: string,
  collectionId: string,
  file: File
): Promise<Document> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/collections/${collectionId}/documents`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Upload failed");
  }

  return res.json();
}

export function getDownloadUrl(workspaceId: string, collectionId: string, documentId: string) {
  return apiFetch<{ download_url: string }>(
    `/workspaces/${workspaceId}/collections/${collectionId}/documents/${documentId}/download`
  );
}

export function deleteDocument(workspaceId: string, collectionId: string, documentId: string) {
  return apiFetch<void>(
    `/workspaces/${workspaceId}/collections/${collectionId}/documents/${documentId}`,
    { method: "DELETE" }
  );
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export async function replaceDocument(
  workspaceId: string,
  collectionId: string,
  documentId: string,
  file: File
): Promise<Document> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/collections/${collectionId}/documents/${documentId}`,
    {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Replace failed" }));
    throw new Error(error.detail || "Replace failed");
  }
  return res.json();
}

export function listDocumentVersions(workspaceId: string, collectionId: string, documentId: string) {
  return apiFetch<DocumentVersion[]>(
    `/workspaces/${workspaceId}/collections/${collectionId}/documents/${documentId}/versions`
  );
}

export function getVersionDownloadUrl(
  workspaceId: string,
  collectionId: string,
  documentId: string,
  versionId: string
) {
  return apiFetch<{ download_url: string }>(
    `/workspaces/${workspaceId}/collections/${collectionId}/documents/${documentId}/versions/${versionId}/download`
  );
}