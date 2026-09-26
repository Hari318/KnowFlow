from __future__ import annotations

import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workspace_member import WorkspaceMember


class WorkspaceMemberRepository(Protocol):
    def get_membership(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None: ...
    def list_for_workspace(self, workspace_id: uuid.UUID) -> list[WorkspaceMember]: ...
    def count_owners(self, workspace_id: uuid.UUID) -> int: ...
    def create(self, workspace_id: uuid.UUID, user_id: uuid.UUID, role: str) -> WorkspaceMember: ...
    def update_role(self, membership: WorkspaceMember, role: str) -> WorkspaceMember: ...
    def delete(self, membership: WorkspaceMember) -> None: ...


class SqlAlchemyWorkspaceMemberRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_membership(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None:
        return self._db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        ).scalar_one_or_none()

    def list_for_workspace(self, workspace_id: uuid.UUID) -> list[WorkspaceMember]:
        return list(
            self._db.execute(
                select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
            ).scalars().all()
        )

    def count_owners(self, workspace_id: uuid.UUID) -> int:
        return len(
            list(
                self._db.execute(
                    select(WorkspaceMember).where(
                        WorkspaceMember.workspace_id == workspace_id,
                        WorkspaceMember.role == "owner",
                    )
                ).scalars().all()
            )
        )

    def create(self, workspace_id: uuid.UUID, user_id: uuid.UUID, role: str) -> WorkspaceMember:
        membership = WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
        self._db.add(membership)
        self._db.commit()
        self._db.refresh(membership)
        return membership

    def update_role(self, membership: WorkspaceMember, role: str) -> WorkspaceMember:
        membership.role = role
        self._db.commit()
        self._db.refresh(membership)
        return membership

    def delete(self, membership: WorkspaceMember) -> None:
        self._db.delete(membership)
        self._db.commit()


def get_workspace_member_repository(db: Session) -> WorkspaceMemberRepository:
    return SqlAlchemyWorkspaceMemberRepository(db)