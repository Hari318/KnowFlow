"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, CurrentUser } from "./auth";
import { Member } from "./members";

interface ActiveWorkspace {
  workspaceId: string;
  members: Member[];
  isOwner: boolean;
}

interface AppContextValue {
  currentUser: CurrentUser | null;
  activeWorkspace: ActiveWorkspace | null;
  setActiveWorkspace: (data: ActiveWorkspace | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) {
      getMe().then(setCurrentUser).catch(() => {});
    }
  }, []);

  return (
    <AppContext.Provider value={{ currentUser, activeWorkspace, setActiveWorkspace }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}