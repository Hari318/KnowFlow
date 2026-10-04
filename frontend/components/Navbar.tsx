"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { logout } from "@/lib/auth";
import { useApp } from "@/lib/app-context";
import { getInitials, getAvatarColor } from "@/lib/avatar";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { currentUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !currentUser) {
    return (
      <nav className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
        <span className="font-medium text-foreground">KnowFlow</span>
      </nav>
    );
  }

  return (
    <nav className="relative border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
      <span className="font-medium text-foreground">KnowFlow</span>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="px-3 py-1.5 rounded border border-border text-sm text-foreground hover:border-accent transition-colors"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${getAvatarColor(currentUser.id)}`}>
              {getInitials(currentUser.first_name, currentUser.last_name)}
            </div>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-lg shadow-lg z-50 p-4">
                <p className="text-xs text-muted mb-2 truncate">{currentUser.email}</p>
                <button onClick={logout} className="text-sm text-danger hover:underline">
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}