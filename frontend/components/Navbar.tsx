"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
      <span className="font-medium text-foreground">KnowFlow</span>
      {mounted && (
          <div className="flex items-center gap-3">
            <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="px-3 py-1.5 rounded border border-border text-sm text-foreground hover:border-accent transition-colors"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            {typeof window !== "undefined" && localStorage.getItem("access_token") && (
                <button
                    onClick={logout}
                    className="px-3 py-1.5 rounded border border-border text-sm text-foreground hover:border-danger hover:text-danger transition-colors"
                >
                  Log out
                </button>
            )}
          </div>
      )}
    </nav>
  );
}