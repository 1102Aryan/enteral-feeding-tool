from datetime import datetime, timezone, timedelta
from typing import Optional

from app.engine.loader import load_ruleset


def _as_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def next_reading_plan(
    *,
    feed_type: str,
    insulin_type: str,
    feed_status: str = "feeding",
    on_vriii: bool = False,
    last_reading_at: Optional[datetime] = None,
    last_band: Optional[str] = None,
    now: Optional[datetime] = None,
) -> dict:
    """
    Determine when the next CBG is due, per the JBDS §8.2 cadence table.

    Overrides (recheck after a hypo, hourly on VRIII, within 2 h of a feed
    stopping) take priority over the routine feed-type/insulin cadence.
    """
    rules = load_ruleset("monitoring-cadence")
    now = _as_aware(now or datetime.now(timezone.utc))
    ov = rules["overrides"]

    # Highest-priority overrides first.
    if last_band == "hypo":
        o = ov["post_hypo"]
        interval, label, prov, basis = o["minutes"], o["label"], o["provenance"], "post_hypo"
    elif on_vriii:
        o = ov["vriii"]
        interval, label, prov, basis = o["minutes"], o["label"], o["provenance"], "vriii"
    elif feed_status == "feed_stopped":
        o = ov["feed_stopped"]
        interval, label, prov, basis = o["minutes"], o["label"], o["provenance"], "feed_stopped"
    else:
        by_feed = rules["routine"].get(feed_type) or rules["routine"]["continuous"]
        entry = by_feed.get(insulin_type) or by_feed["default"]
        interval, label = entry["min"], entry["label"]
        prov, basis = rules["provenance"], "routine"

    # Due relative to the last reading; with none on record, a baseline (pre-feed)
    # reading is due now.
    anchor = _as_aware(last_reading_at) if last_reading_at else now
    next_due = anchor + timedelta(minutes=interval)
    minutes_until = round((next_due - now).total_seconds() / 60)

    return {
        "interval_minutes": interval,
        "cadence_label": label,
        "basis": basis,                       # routine | post_hypo | vriii | feed_stopped
        "next_due": next_due.isoformat(),
        "minutes_until": minutes_until,        # negative when overdue
        "overdue": minutes_until <= 0,
        "last_reading_at": _as_aware(last_reading_at).isoformat() if last_reading_at else None,
        "provenance": prov,
    }
