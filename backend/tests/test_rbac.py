from app.services.auth_service import permissions_for_role, has_permission


def test_nurse_can_acknowledge_only():
    assert has_permission("nurse", "alert:acknowledge")
    assert not has_permission("nurse", "alert:escalate")
    assert not has_permission("nurse", "rules:edit")


def test_doctor_can_escalate_not_edit_rules():
    assert has_permission("doctor", "alert:acknowledge")
    assert has_permission("doctor", "alert:escalate")
    assert not has_permission("doctor", "rules:edit")


def test_dit_can_edit_rules():
    assert has_permission("dit", "rules:edit")


def test_admin_wildcard_grants_everything():
    assert has_permission("admin", "rules:edit")
    assert has_permission("admin", "anything:at:all")


def test_unknown_role_has_no_permissions():
    assert permissions_for_role("ghost") == []
    assert not has_permission("ghost", "alert:acknowledge")
