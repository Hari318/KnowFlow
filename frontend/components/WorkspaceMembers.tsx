"use client";

import { useState } from "react";
import { Member, updateMemberRole, removeMember, inviteMember } from "@/lib/members";
import { getInitials, getAvatarColor } from "@/lib/avatar";
import { useApp } from "@/lib/app-context";

interface WorkspaceMembersProps {
  workspaceId: string;
  members: Member[];
  isOwner: boolean;
  onChanged: () => void;
}

export function WorkspaceMembers({ workspaceId, members, isOwner, onChanged }: WorkspaceMembersProps) {
  const { currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleMembers = members.slice(0, 4);
  const overflowCount = members.length - visibleMembers.length;

  async function handleRoleChange(userId: string, role: "owner" | "member") {
    setError(null);
    try {
      await updateMemberRole(workspaceId, userId, role);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the workspace?")) return;
    setError(null);
    try {
      await removeMember(workspaceId, userId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    try {
      await inviteMember(workspaceId, inviteEmail, inviteRole);
      setInviteEmail("");
      setInviteRole("member");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center">
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
        {members.length === 0 && <span className="text-sm text-muted">Invite members</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50 p-4">
            {error && <p className="text-danger text-xs mb-2">{error}</p>}

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
                        {m.user_id === currentUser?.id && <span className="text-muted"> (you)</span>}
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

            {isOwner && (
              <form onSubmit={handleInvite} className="flex flex-col gap-2 pt-3 border-t border-border">
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
          </div>
        </>
      )}
    </div>
  );
}