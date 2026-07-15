import os
import secrets
from typing import Optional
from datetime import datetime, timezone, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError

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
    except (VerificationError, InvalidHashError):
        return False


def authenticate(session: Session, username: str, password: str) -> Optional[User]:
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None or not verify_password(user.password_hash, password):
        return None
    return user


# How long a login session stays valid.
TOKEN_TTL_MINUTES = 60


def _aware(dt: datetime) -> datetime:
    """Treat naive datetimes (as read back from SQLite) as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def create_token(session: Session, user: User) -> str:
    now = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    db_token = AuthToken(
        token=token,
        user_ref=user.ref,
        created_at=now,
        expires_at=now + timedelta(minutes=TOKEN_TTL_MINUTES),
    )
    session.add(db_token)
    session.commit()
    return token


def user_for_token(session: Session, token: str) -> Optional[User]:
    row = session.get(AuthToken, token)
    if row is None:
        return None
    # Missing or past expiry -> drop the token and treat as logged out.
    if row.expires_at is None or _aware(row.expires_at) < datetime.now(timezone.utc):
        session.delete(row)
        session.commit()
        return None
    return session.get(User, row.user_ref)


def revoke_token(session: Session, token: str) -> None:
    row = session.get(AuthToken, token)
    if row is not None:
        session.delete(row)
        session.commit()


# Demo accounts, one per role, so RBAC can be shown out of the box.
# Passwords are long and unique so browsers do not flag them as breached.
# Override per account in deployment with SEED_PW_<USERNAME>.
DEMO_USERS = [
    ("nurse", "Ward-Nurse-7fK2rQx9vT", "Nurse A. Sharma", "nurse"),
    ("doctor", "Ward-Doctor-4mZp8TvcLb", "Dr. Smith", "doctor"),
    ("dit", "DIT-Lead-6xB3nWqL5jHd", "DIT Lead", "dit"),
    ("admin", "Admin-Enteral-9tR4yHm2Kp", "Administrator", "admin"),
]


def _seed_password(username: str, default: str) -> str:
    return os.getenv(f"SEED_PW_{username.upper()}", default)


def ensure_default_user(session: Session) -> None:
    """
    Seed a demo account for each role, and rotate its password if it no longer
    matches the configured one, so weak seeded passwords cannot persist.
    """
    created = False
    for username, default_password, name, role in DEMO_USERS:
        password = _seed_password(username, default_password)
        user = session.exec(select(User).where(User.username == username)).first()
        if user is None:
            session.add(User(
                username=username,
                name=name,
                role=role,
                password_hash=hash_password(password),
            ))
            created = True
            continue
        try:
            matches = verify_password(user.password_hash, password)
        except Exception:
            matches = False
        if not matches:
            user.password_hash = hash_password(password)
            session.add(user)
            created = True
    if created:
        session.commit()
