from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.collection import Collection
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


def get_workspace_or_404(
    workspace_id: uuid.UUID, current_user: User, db: Session
) -> tuple[Workspace, WorkspaceMember]:
    membership = db.execute(
        db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        ).statement
    ).scalar_one_or_none()

    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    return workspace, membership


def get_owned_collection(
    workspace_id: uuid.UUID, collection_id: uuid.UUID, current_user: User, db: Session
) -> Collection:
    get_workspace_or_404(workspace_id, current_user, db)  # raises 404 if not a member

    collection = db.get(Collection, collection_id)
    if collection is None or collection.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    return collection


def require_owner(membership: WorkspaceMember) -> None:
    if membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a workspace owner can perform this action",
        )