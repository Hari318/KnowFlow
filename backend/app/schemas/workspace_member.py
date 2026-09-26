from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


class MemberInvite(BaseModel):
    email: EmailStr
    role: Literal["owner", "member"] = "member"


class MemberRoleUpdate(BaseModel):
    role: Literal["owner", "member"]


class MemberOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    email: EmailStr
    first_name: str
    last_name: str | None
    created_at: datetime

class InviteOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    email: EmailStr
    role: str
    created_at: datetime