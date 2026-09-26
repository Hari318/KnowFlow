"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { logout } from "@/lib/auth";
import { updateMemberRole, removeMember, inviteMember, listMembers } from "@/lib/members";
import { useApp } from "@/lib/app-context";
import { getInitials, getAvatarColor } from "@/lib/avatar";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { currentUser, activeWorkspace, setActiveWorkspace } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function refreshMembers() {
    if (!activeWorkspace) return;
    const members = await listMembers(activeWorkspace.workspaceId);
    setActiveWorkspace({ ...activeWorkspace, members });
  }

  async function handleRoleChange(userId: string, role: "owner" | "member") {
    if (!activeWorkspace) return;
    setMenuError(null);
    try {
      await updateMemberRole(activeWorkspace.workspaceId, userId, role);
      await refreshMembers();
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(userId: string) {
    if (!activeWorkspace) return;
    if (!confirm("Remove this member from the workspace?")) return;
    setMenuError(null);
    try {
      await removeMember(activeWorkspace.workspaceId, userId);
      await refreshMembers();
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace) return;
    setInviting(true);
    setMenuError(null);
    try {
      await inviteMember(activeWorkspace.workspaceId, inviteEmail, inviteRole);
      setInviteEmail("");
      setInviteRole("member");
      await refreshMembers();
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  if (!mounted || !currentUser) {
    return (
      <nav className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
        <span className="font-medium text-foreground">KnowFlow</span>
      </nav>
    );
  }

  const members = activeWorkspace?.members || [];
  const visibleMembers = members.slice(0, 4);
  const overflowCount = members.length - visibleMembers.length;
  const isOwner = activeWorkspace?.isOwner || false;

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
          {activeWorkspace ? (
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center">
              {visibleMembers.map((m, i) => (
                <div
                  key={m.id}
                  title={`${m.first_name} ${m.last_name || ""}`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-surface ${getAvatarColor(m.user_id)} ${i > 0 ? "-ml-2" : ""}`}
                >
                  {getInitials(m.first_name, m.last_name)}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-foreground bg-background border-2 border-surface -ml-2">
                  +{overflowCount}
                </div>
              )}
            </button>
          ) : (
            <button onClick={() => setMenuOpen((v) => !v)}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${getAvatarColor(currentUser.id)}`}>
                {getInitials(currentUser.first_name, currentUser.last_name)}
              </div>
            </button>
          )}

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50 p-4">
                {menuError && <p className="text-danger text-xs mb-2">{menuError}</p>}

                {activeWorkspace && (
                  <div className="flex flex-col gap-2 mb-3 max-h-64 overflow-y-auto">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium text-white ${getAvatarColor(m.user_id)}`}>
                            {getInitials(m.first_name, m.last_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">
                              {m.first_name} {m.last_name || ""}
                              {m.user_id === currentUser.id && <span className="text-muted"> (you)</span>}
                            </p>
                            <p className="text-xs text-muted truncate">{m.email}</p>
                          </div>
                        </div>

                        {isOwner ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.user_id, e.target.value as "owner" | "member")}
                              className="text-xs bg-background border border-border rounded px-1 py-1 text-foreground"
                            >
                              <option value="owner">Owner</option>
                              <option value="member">Member</option>
                            </select>
                            <button onClick={() => handleRemove(m.user_id)} className="text-danger text-xs hover:underline">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted capitalize shrink-0">{m.role}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeWorkspace && isOwner && (
                  <form onSubmit={handleInvite} className="flex flex-col gap-2 pt-3 border-t border-border mb-3">
                    <input
                      type="email"
                      placeholder="Invite by email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="text-xs px-2 py-1.5 rounded bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                    />
                    <div className="flex gap-2">
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "owner" | "member")}
                        className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground flex-1"
                      >
                        <option value="member">Member</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button
                        type="submit"
                        disabled={inviting}
                        className="text-xs px-3 py-1 rounded bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
                      >
                        {inviting ? "..." : "Invite"}
                      </button>
                    </div>
                  </form>
                )}

                <div className={activeWorkspace ? "pt-3 border-t border-border" : ""}>
                  <p className="text-xs text-muted mb-2 truncate">{currentUser.email}</p>
                  <button onClick={logout} className="text-sm text-danger hover:underline">
                    Log out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}