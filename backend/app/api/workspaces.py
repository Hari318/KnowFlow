from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.repositories.workspace_repository import WorkspaceRepository, get_workspace_repository
from app.schemas.workspace import WorkspaceCreate, WorkspaceOut, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _get_repo(db: Session = Depends(get_db)) -> WorkspaceRepository:
    return get_workspace_repository(db)


def _get_owned(
    workspace_id: uuid.UUID, current_user: User, repo: WorkspaceRepository
):
    workspace = repo.get_by_id(workspace_id)
    if workspace is None or workspace.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    return repo.create(current_user.id, payload.name, payload.description)


@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    return repo.list_for_user(current_user.id)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    return _get_owned(workspace_id, current_user, repo)


@router.put("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(
    workspace_id: uuid.UUID,
    payload: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    workspace = _get_owned(workspace_id, current_user, repo)
    if payload.name is not None:
        workspace.name = payload.name
    if payload.description is not None:
        workspace.description = payload.description
    return repo.update(workspace)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    repo: WorkspaceRepository = Depends(_get_repo),
):
    workspace = _get_owned(workspace_id, current_user, repo)
    repo.delete(workspace)