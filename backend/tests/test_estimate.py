from qflow_api.queue_service import estimate_wait


def test_estimate_wait_zero_ahead():
    assert estimate_wait(0) == 0


def test_estimate_wait_matches_nextjs():
    # Mirrors lib/supabase/helpers.ts: AVG=2, STAFF=2
    assert estimate_wait(1) == 1
    assert estimate_wait(4) == 4
    assert estimate_wait(10) == 10
