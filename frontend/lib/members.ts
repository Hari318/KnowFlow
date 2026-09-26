import { apiFetch } from "./api";

export interface Member {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "member";
  email: string;
  first_name: string;
  last_name: string | null;
  created_at: string;
}

export function listMembers(workspaceId: string) {
  return apiFetch<Member[]>(`/workspaces/${workspaceId}/members`);
}

export function inviteMember(workspaceId: string, email: string, role: "owner" | "member") {
  return apiFetch<Member>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export function updateMemberRole(workspaceId: string, userId: string, role: "owner" | "member") {
  return apiFetch<Member>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(workspaceId: string, userId: string) {
  return apiFetch<void>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
}