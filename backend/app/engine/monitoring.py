from datetime import datetime, timezone, timedelta
from typing import Optional

from app.engine.loader import load_ruleset


def _as_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _parse_hhmm(s: Optional[str]) -> Optional[int]:
    """Parse 'HH:MM' to minutes-of-day, or None if invalid."""
    try:
        h, m = s.split(":")
        v = int(h) * 60 + int(m)
        return v if 0 <= v < 1440 else None
    except (AttributeError, ValueError):
        return None


def _in_window(now: datetime, start: Optional[str], end: Optional[str]) -> bool:
    """Whether `now`'s time-of-day falls in [start, end), handling midnight wrap."""
    s, e = _parse_hhmm(start), _parse_hhmm(end)
    if s is None or e is None or s == e:
        return False
    m = now.hour * 60 + now.minute
    return s <= m < e if s < e else (m >= s or m < e)


def next_reading_plan(
    *,
    feed_type: str,
    insulin_type: str,
    feed_status: str = "feeding",
    on_vriii: bool = False,
    break_start: Optional[str] = None,
    break_end: Optional[str] = None,
    last_reading_at: Optional[datetime] = None,
    last_band: Optional[str] = None,
    now: Optional[datetime] = None,
) -> dict:
    """
    Determine when the next CBG is due, per the JBDS §8.2 cadence table.

    Overrides take priority over the routine feed-type/insulin cadence, in order:
    post-hypo recheck, hourly on VRIII, within 2 h of an unexpected stop, then a
    pre-feed check when inside a planned feed break.
    """
    rules = load_ruleset("monitoring-cadence")
    now = _as_aware(now or datetime.now(timezone.utc))
    ov = rules["overrides"]

    pre_feed_due = None  # set only for the pre-feed (break) override

    if last_band == "hypo":
        o = ov["post_hypo"]
        interval, label, prov, basis = o["minutes"], o["label"], o["provenance"], "post_hypo"
    elif on_vriii:
        o = ov["vriii"]
        interval, label, prov, basis = o["minutes"], o["label"], o["provenance"], "vriii"
    elif feed_status == "feed_stopped":
        o = ov["feed_stopped"]
        interval, label, prov, basis = o["minutes"], o["label"], o["provenance"], "feed_stopped"
    elif _in_window(now, break_start, break_end):
        o = ov["pre_feed"]
        label, prov, basis = o["label"], o["provenance"], "pre_feed"
        # Due when the feed resumes (next occurrence of break_end).
        target = _parse_hhmm(break_end)
        delta = (target - (now.hour * 60 + now.minute)) % 1440
        pre_feed_due = now + timedelta(minutes=delta)
        interval = delta
    else:
        by_feed = rules["routine"].get(feed_type) or rules["routine"]["continuous"]
        entry = by_feed.get(insulin_type) or by_feed["default"]
        interval, label = entry["min"], entry["label"]
        prov, basis = rules["provenance"], "routine"

    if pre_feed_due is not None:
        next_due = pre_feed_due
    else:
        # Due relative to the last reading; with none on record, a baseline
        # (pre-feed) reading is due now.
        anchor = _as_aware(last_reading_at) if last_reading_at else now
        next_due = anchor + timedelta(minutes=interval)
    minutes_until = round((next_due - now).total_seconds() / 60)

    return {
        "interval_minutes": interval,
        "cadence_label": label,
        "basis": basis,  # routine | post_hypo | vriii | feed_stopped | pre_feed
        "next_due": next_due.isoformat(),
        "minutes_until": minutes_until,  # negative when overdue
        "overdue": minutes_until <= 0,
        "last_reading_at": _as_aware(last_reading_at).isoformat() if last_reading_at else None,
        "provenance": prov,
    }
