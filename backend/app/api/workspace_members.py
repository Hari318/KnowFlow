from __future__ import annotations

import uuid
import secrets

from app.core.config import settings
from app.models.workspace import Workspace
from app.models.workspace_invite import WorkspaceInvite
from app.schemas.workspace_member import InviteOut
from app.services.email import send_workspace_invite_email
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.access import get_workspace_or_404, require_owner
from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.repositories.workspace_member_repository import (
    WorkspaceMemberRepository,
    get_workspace_member_repository,
)
from app.schemas.workspace_member import MemberInvite, MemberOut, MemberRoleUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/members", tags=["members"])


def _get_repo(db: Session = Depends(get_db)) -> WorkspaceMemberRepository:
    return get_workspace_member_repository(db)


def _to_out(m) -> MemberOut:
    return MemberOut(
        id=m.id,
        workspace_id=m.workspace_id,
        user_id=m.user_id,
        role=m.role,
        email=m.user.email,
        first_name=m.user.first_name,
        last_name=m.user.last_name,
        created_at=m.created_at,
    )


@router.get("", response_model=list[MemberOut])
def list_members(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: WorkspaceMemberRepository = Depends(_get_repo),
):
    get_workspace_or_404(workspace_id, current_user, db)
    return [_to_out(m) for m in repo.list_for_workspace(workspace_id)]


@router.post("", response_model=MemberOut | InviteOut, status_code=status.HTTP_201_CREATED)
def invite_member(
    workspace_id: uuid.UUID,
    payload: MemberInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: WorkspaceMemberRepository = Depends(_get_repo),
):
    workspace, membership = get_workspace_or_404(workspace_id, current_user, db)
    require_owner(membership)

    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()

    if user is not None:
        if repo.get_membership(workspace_id, user.id) is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user is already a member of the workspace",
            )
        new_membership = repo.create(workspace_id, user.id, payload.role)
        return _to_out(new_membership)

    existing_invite = db.execute(
        select(WorkspaceInvite).where(
            WorkspaceInvite.workspace_id == workspace_id,
            WorkspaceInvite.email == payload.email,
            WorkspaceInvite.accepted_at.is_(None),
        )
    ).scalar_one_or_none()

    if existing_invite is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An invite has already been sent to this email",
        )

    token = secrets.token_urlsafe(32)
    invite = WorkspaceInvite(
        workspace_id=workspace_id,
        email=payload.email,
        role=payload.role,
        token=token,
        invited_by=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    try:
        send_workspace_invite_email(
            to_email=payload.email,
            workspace_name=workspace.name,
            inviter_name=current_user.first_name,
            token=token,
        )
    except RuntimeError as e:
        db.delete(invite)
        db.commit()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    return InviteOut(
        id=invite.id,
        workspace_id=invite.workspace_id,
        email=invite.email,
        role=invite.role,
        created_at=invite.created_at,
    )

@router.put("/{user_id}", response_model=MemberOut)
def update_member_role(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: WorkspaceMemberRepository = Depends(_get_repo),
):
    _, membership = get_workspace_or_404(workspace_id, current_user, db)
    require_owner(membership)

    target = repo.get_membership(workspace_id, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if target.role == "owner" and payload.role == "member" and repo.count_owners(workspace_id) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote the only remaining owner",
        )

    updated = repo.update_role(target, payload.role)
    return _to_out(updated)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: WorkspaceMemberRepository = Depends(_get_repo),
):
    _, membership = get_workspace_or_404(workspace_id, current_user, db)
    require_owner(membership)

    target = repo.get_membership(workspace_id, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if target.role == "owner" and repo.count_owners(workspace_id) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the only remaining owner",
        )

    repo.delete(target)