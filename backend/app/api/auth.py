from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session

from app.db import get_session
from app.models.db_models import User
from app.models.schemas import LoginRequest, LoginResponse, UserOut
from app.services.auth_service import (
    authenticate, create_token, user_for_token, revoke_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_out(u: User) -> UserOut:
    return UserOut(ref=u.ref, username=u.username, name=u.name, role=u.role)


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return authorization.split(" ", 1)[1].strip()


def current_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    user = user_for_token(session, _bearer(authorization))
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)) -> LoginResponse:
    user = authenticate(session, body.username, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token(session, user)
    return LoginResponse(token=token, user=_to_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return _to_out(user)


@router.post("/logout")
def logout(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> dict:
    revoke_token(session, _bearer(authorization))
    return {"ok": True}
