from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.collection import Collection
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.collection import CollectionCreate, CollectionOut, CollectionUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/collections", tags=["collections"])


def _get_owned_workspace(workspace_id: uuid.UUID, current_user: User, db: Session) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None or workspace.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    return workspace


@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
def create_collection(
    workspace_id: uuid.UUID,
    payload: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    collection = Collection(
        workspace_id=workspace_id,
        name=payload.name,
        description=payload.description,
    )

    db.add(collection)
    db.commit()
    db.refresh(collection)

    return collection


@router.get("", response_model=list[CollectionOut])
def list_collections(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    collections = db.execute(
        select(Collection).where(Collection.workspace_id == workspace_id)
    ).scalars().all()

    return collections


@router.get("/{collection_id}", response_model=CollectionOut)
def get_collection(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    collection = db.get(Collection, collection_id)
    if collection is None or collection.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    return collection


@router.put("/{collection_id}", response_model=CollectionOut)
def update_collection(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    payload: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    collection = db.get(Collection, collection_id)
    if collection is None or collection.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if payload.name is not None:
        collection.name = payload.name
    if payload.description is not None:
        collection.description = payload.description

    db.commit()
    db.refresh(collection)

    return collection


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_workspace(workspace_id, current_user, db)

    collection = db.get(Collection, collection_id)
    if collection is None or collection.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    db.delete(collection)
    db.commit()