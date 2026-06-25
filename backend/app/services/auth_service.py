import secrets
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlmodel import Session, select

from app.models.db_models import User, AuthToken

# Argon2id hasher with library defaults (OWASP-recommended password hash).
_ph = PasswordHasher()


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def authenticate(session: Session, username: str, password: str) -> Optional[User]:
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None or not verify_password(user.password_hash, password):
        return None
    return user


def create_token(session: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    session.add(AuthToken(token=token, user_ref=user.ref))
    session.commit()
    return token


def user_for_token(session: Session, token: str) -> Optional[User]:
    row = session.get(AuthToken, token)
    if row is None:
        return None
    return session.get(User, row.user_ref)


def revoke_token(session: Session, token: str) -> None:
    row = session.get(AuthToken, token)
    if row is not None:
        session.delete(row)
        session.commit()


def ensure_default_user(session: Session) -> None:
    """Seed a demo clinician account if no users exist, so login works out of the box."""
    if session.exec(select(User)).first() is not None:
        return
    session.add(User(
        username="clinician",
        name="Dr. Smith",
        role="clinician",
        password_hash=hash_password("enteral123"),
    ))
    session.commit()
