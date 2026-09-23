import { httpClient } from "./api";
import { HttpClient } from "./httpClient";

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function createWorkspaceService(client: HttpClient = httpClient) {
  return {
    list: () => client.get<Workspace[]>("/workspaces"),
    get: (id: string) => client.get<Workspace>(`/workspaces/${id}`),
    create: (name: string, description?: string) =>
      client.post<Workspace>("/workspaces", { name, description }),
    update: (id: string, data: { name?: string; description?: string }) =>
      client.put<Workspace>(`/workspaces/${id}`, data),
    delete: (id: string) => client.delete<void>(`/workspaces/${id}`),
  };
}

export const workspaceService = createWorkspaceService();