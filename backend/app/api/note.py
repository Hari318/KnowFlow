from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.note import Note
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.note import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/notes", tags=["notes"])


def _get_owned_workspace(workspace_id: uuid.UUID, current_user: User, db: Session) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None or workspace.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    workspace_id: uuid.UUID,
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    note = Note(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
    )

    db.add(note)
    db.commit()
    db.refresh(note)

    return note


@router.get("", response_model=list[NoteOut])
def list_notes(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    notes = db.execute(
        select(Note).where(Note.workspace_id == workspace_id)
    ).scalars().all()

    return notes


@router.get("/{note_id}", response_model=NoteOut)
def get_note(
    workspace_id: uuid.UUID,
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    note = db.get(Note, note_id)
    if note is None or note.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    return note


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    workspace_id: uuid.UUID,
    note_id: uuid.UUID,
    payload: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    note = db.get(Note, note_id)
    if note is None or note.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content

    db.commit()
    db.refresh(note)

    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    workspace_id: uuid.UUID,
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    note = db.get(Note, note_id)
    if note is None or note.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    db.delete(note)
    db.commit()