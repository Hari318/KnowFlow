from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.collection import Collection
from app.models.user import User
from app.schemas.collection import CollectionCreate, CollectionOut, CollectionUpdate
from app.api.access import get_owned_collection, get_workspace_or_404

router = APIRouter(prefix="/workspaces/{workspace_id}/collections", tags=["collections"])

@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
def create_collection(
    workspace_id: uuid.UUID,
    payload: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_workspace_or_404(workspace_id, current_user, db)

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
    get_workspace_or_404(workspace_id, current_user, db)

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
    get_workspace_or_404(workspace_id, current_user, db)

    collection = get_owned_collection(workspace_id, collection_id, current_user, db)

    return collection


@router.put("/{collection_id}", response_model=CollectionOut)
def update_collection(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    payload: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_workspace_or_404(workspace_id, current_user, db)

    collection = get_owned_collection(workspace_id, collection_id, current_user, db)

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
    get_workspace_or_404(workspace_id, current_user, db)

    collection = get_owned_collection(workspace_id, collection_id, current_user, db)

    db.delete(collection)
    db.commit()