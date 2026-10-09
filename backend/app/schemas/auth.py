from pydantic import BaseModel, EmailStr, Field

class VerifyEmailResponse(BaseModel):
    message: str
    is_verified: bool


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str