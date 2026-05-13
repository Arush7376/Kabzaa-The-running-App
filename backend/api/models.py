from django.conf import settings
from django.db import models


class RunSession(models.Model):
    class ValidationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VALID = "valid", "Valid"
        SUSPICIOUS = "suspicious", "Suspicious"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="run_sessions",
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    distance = models.FloatField(default=0.0)
    validation_status = models.CharField(
        max_length=16,
        choices=ValidationStatus.choices,
        default=ValidationStatus.PENDING,
        db_index=True,
    )
    validation_score = models.IntegerField(default=100)
    trust_score_snapshot = models.IntegerField(default=100)
    suspicious_reason = models.CharField(max_length=255, blank=True)
    max_speed_mps = models.FloatField(default=0.0)
    flagged_at = models.DateTimeField(null=True, blank=True)


class LocationPoint(models.Model):
    session = models.ForeignKey(
        RunSession,
        on_delete=models.CASCADE,
        related_name="points",
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    client_timestamp = models.DateTimeField(null=True, blank=True)
    accuracy_meters = models.FloatField(null=True, blank=True)
    altitude_meters = models.FloatField(null=True, blank=True)
    speed_mps = models.FloatField(null=True, blank=True)
    heading_degrees = models.FloatField(null=True, blank=True)
    mock_location = models.BooleanField(default=False)
    validation_metadata = models.JSONField(default=dict, blank=True)


class UserTrustProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trust_profile",
    )
    score = models.IntegerField(default=100, db_index=True)
    suspicious_runs = models.PositiveIntegerField(default=0)
    rejected_runs = models.PositiveIntegerField(default=0)
    total_events = models.PositiveIntegerField(default=0)
    last_event_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class DeviceSignal(models.Model):
    session = models.ForeignKey(
        RunSession,
        on_delete=models.CASCADE,
        related_name="device_signals",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="device_signals",
    )
    platform = models.CharField(max_length=32, blank=True)
    app_version = models.CharField(max_length=64, blank=True)
    device_id_hash = models.CharField(max_length=128, blank=True, db_index=True)
    is_emulator = models.BooleanField(default=False)
    is_mock_location = models.BooleanField(default=False)
    developer_mode = models.BooleanField(default=False)
    integrity_level = models.CharField(max_length=32, blank=True)
    signals = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class RunValidationEvent(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    session = models.ForeignKey(
        RunSession,
        on_delete=models.CASCADE,
        related_name="validation_events",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="validation_events",
    )
    point = models.ForeignKey(
        LocationPoint,
        on_delete=models.SET_NULL,
        related_name="validation_events",
        null=True,
        blank=True,
    )
    rule = models.CharField(max_length=64, db_index=True)
    severity = models.CharField(
        max_length=16,
        choices=Severity.choices,
        default=Severity.INFO,
        db_index=True,
    )
    score_delta = models.IntegerField(default=0)
    message = models.CharField(max_length=255)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Tile(models.Model):
    lat_index = models.IntegerField()
    lng_index = models.IntegerField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_tiles",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["lat_index", "lng_index"],
                name="unique_tile_index_pair",
            )
        ]
