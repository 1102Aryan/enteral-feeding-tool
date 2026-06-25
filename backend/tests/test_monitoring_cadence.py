from datetime import datetime, timezone, timedelta

from app.engine.monitoring import next_reading_plan, _in_window


def _now(h, m=0):
    return datetime(2026, 6, 25, h, m, tzinfo=timezone.utc)


def test_in_window_same_day():
    assert _in_window(_now(3), "02:00", "06:00")
    assert not _in_window(_now(7), "02:00", "06:00")
    assert not _in_window(_now(6), "02:00", "06:00")  # end exclusive


def test_in_window_wraps_midnight():
    assert _in_window(_now(23), "22:00", "02:00")
    assert _in_window(_now(1), "22:00", "02:00")
    assert not _in_window(_now(12), "22:00", "02:00")


def test_in_window_none_or_equal():
    assert not _in_window(_now(3), None, "06:00")
    assert not _in_window(_now(3), "06:00", "06:00")


def test_pre_feed_override_during_break():
    r = next_reading_plan(
        feed_type="intermittent", insulin_type="rapid_analogue",
        break_start="02:00", break_end="06:00", now=_now(4),
    )
    assert r["basis"] == "pre_feed"
    assert r["minutes_until"] == 120  # feed resumes at 06:00


def test_post_hypo_beats_break():
    r = next_reading_plan(
        feed_type="intermittent", insulin_type="rapid_analogue",
        break_start="02:00", break_end="06:00", last_band="hypo", now=_now(4),
    )
    assert r["basis"] == "post_hypo"


def test_routine_outside_break():
    r = next_reading_plan(
        feed_type="continuous", insulin_type="rapid_analogue",
        break_start="02:00", break_end="06:00",
        last_reading_at=_now(8) - timedelta(hours=1), now=_now(8),
    )
    assert r["basis"] == "routine"
