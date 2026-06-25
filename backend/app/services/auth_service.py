import secrets
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlmodel import Session, select

from app.models.db_models import User, AuthToken
from app.engine.loader import load_ruleset

# Argon2id hasher with library defaults (OWASP-recommended password hash).
_ph = PasswordHasher()


def permissions_for_role(role: str) -> list[str]:
    roles = load_ruleset("roles")["roles"]
    entry = roles.get(role)
    return list(entry["permissions"]) if entry else []


def has_permission(role: str, permission: str) -> bool:
    perms = permissions_for_role(role)
    return "*" in perms or permission in perms


def role_label(role: str) -> str:
    roles = load_ruleset("roles")["roles"]
    entry = roles.get(role)
    return entry["label"] if entry else role


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


# Demo accounts, one per role, so RBAC can be shown out of the box.
DEMO_USERS = [
    ("nurse", "nurse123", "Nurse A. Sharma", "nurse"),
    ("doctor", "doctor123", "Dr. Smith", "doctor"),
    ("dit", "dit123", "DIT Lead", "dit"),
    ("admin", "admin123", "Administrator", "admin"),
]


def ensure_default_user(session: Session) -> None:
    """Seed a demo account for each role if missing, so login + RBAC work out of the box."""
    created = False
    for username, password, name, role in DEMO_USERS:
        exists = session.exec(select(User).where(User.username == username)).first()
        if exists is None:
            session.add(User(
                username=username,
                name=name,
                role=role,
                password_hash=hash_password(password),
            ))
            created = True
    if created:
        session.commit()
