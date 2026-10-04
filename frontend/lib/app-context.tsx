"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, CurrentUser } from "./auth";

interface AppContextValue {
  currentUser: CurrentUser | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) {
      getMe().then(setCurrentUser).catch(() => {});
    }
  }, []);

  return (
    <AppContext.Provider value={{ currentUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}