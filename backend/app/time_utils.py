from datetime import datetime, timezone
from typing import Optional


def iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """
    Serialize a datetime as an unambiguous UTC ISO-8601 string.

    Values read back from SQLite are naive; they are produced in UTC, so a
    missing tzinfo is interpreted as UTC. This guarantees the client receives a
    timezone-qualified timestamp and does not parse it as local time.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()
