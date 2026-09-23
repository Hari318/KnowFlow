"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { workspaceService, Workspace } from "./workspaces";

interface WorkspacesContextValue {
  workspaces: Workspace[];
  refresh: () => void;
}

const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

export function WorkspacesProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  function refresh() {
    workspaceService.list().then(setWorkspaces).catch(() => {});
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <WorkspacesContext.Provider value={{ workspaces, refresh }}>
      {children}
    </WorkspacesContext.Provider>
  );
}

export function useWorkspaces() {
  const ctx = useContext(WorkspacesContext);
  if (!ctx) {
    throw new Error("useWorkspaces must be used within a WorkspacesProvider");
  }
  return ctx;
}