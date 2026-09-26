from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.access import get_workspace_or_404, require_owner
from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.repositories.workspace_member_repository import get_workspace_member_repository
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository
from app.schemas.workspace import WorkspaceCreate, WorkspaceOut, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _get_repo(db: Session = Depends(get_db)) -> WorkspaceRepository:
    return get_workspace_repository(db)


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    workspace = repo.create(current_user.id, payload.name, payload.description)
    member_repo = get_workspace_member_repository(db)
    member_repo.create(workspace.id, current_user.id, "owner")
    return workspace


@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspaces = db.execute(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
    ).scalars().all()
    return list(workspaces)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace, _ = get_workspace_or_404(workspace_id, current_user, db)
    return workspace


@router.put("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(
    workspace_id: uuid.UUID,
    payload: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    workspace, membership = get_workspace_or_404(workspace_id, current_user, db)
    require_owner(membership)

    if payload.name is not None:
        workspace.name = payload.name
    if payload.description is not None:
        workspace.description = payload.description
    return repo.update(workspace)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    workspace, membership = get_workspace_or_404(workspace_id, current_user, db)
    require_owner(membership)
    repo.delete(workspace)