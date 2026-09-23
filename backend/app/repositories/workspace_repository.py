from __future__ import annotations

import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workspace import Workspace


class WorkspaceRepository(Protocol):
    def get_by_id(self, workspace_id: uuid.UUID) -> Workspace | None: ...
    def list_for_user(self, user_id: uuid.UUID) -> list[Workspace]: ...
    def create(self, user_id: uuid.UUID, name: str, description: str | None) -> Workspace: ...
    def update(self, workspace: Workspace) -> Workspace: ...
    def delete(self, workspace: Workspace) -> None: ...


class SqlAlchemyWorkspaceRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_id(self, workspace_id: uuid.UUID) -> Workspace | None:
        return self._db.get(Workspace, workspace_id)

    def list_for_user(self, user_id: uuid.UUID) -> list[Workspace]:
        return list(
            self._db.execute(
                select(Workspace).where(Workspace.user_id == user_id)
            ).scalars().all()
        )

    def create(self, user_id: uuid.UUID, name: str, description: str | None) -> Workspace:
        workspace = Workspace(user_id=user_id, name=name, description=description)
        self._db.add(workspace)
        self._db.commit()
        self._db.refresh(workspace)
        return workspace

    def update(self, workspace: Workspace) -> Workspace:
        self._db.commit()
        self._db.refresh(workspace)
        return workspace

    def delete(self, workspace: Workspace) -> None:
        self._db.delete(workspace)
        self._db.commit()


def get_workspace_repository(db: Session) -> WorkspaceRepository:
    return SqlAlchemyWorkspaceRepository(db)