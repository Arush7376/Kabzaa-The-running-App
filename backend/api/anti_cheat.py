import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone as datetime_timezone

from django.utils import timezone

from .models import DeviceSignal, RunSession, RunValidationEvent, UserTrustProfile

logger = logging.getLogger("api.anti_cheat")


SUSPICIOUS_SPEED_MPS = 8.0
IMPOSSIBLE_SPEED_MPS = 12.5
TELEPORT_DISTANCE_METERS = 250.0
TELEPORT_SPEED_MPS = 18.0
WEAK_ACCURACY_METERS = 75.0
MAX_CLIENT_CLOCK_DRIFT_SECONDS = 300


@dataclass
class ValidationIssue:
    rule: str
    severity: str
    score_delta: int
    message: str
    details: dict = field(default_factory=dict)


@dataclass
class ValidationResult:
    issues: list[ValidationIssue] = field(default_factory=list)
    distance_meters: float = 0.0
    elapsed_seconds: float = 0.0
    speed_mps: float = 0.0
    allow_distance: bool = True
    allow_tile_capture: bool = True

    @property
    def is_suspicious(self):
        return any(issue.severity in {"medium", "high", "critical"} for issue in self.issues)

    @property
    def is_rejected(self):
        return any(issue.severity == "critical" for issue in self.issues)

    @property
    def score_delta(self):
        return sum(issue.score_delta for issue in self.issues)


def clamp_score(value):
    return max(0, min(100, int(value)))


def parse_client_timestamp(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone=datetime_timezone.utc)
    return parsed


def bool_from_payload(payload, *keys):
    for key in keys:
        value = payload.get(key)
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def optional_float(payload, key):
    value = payload.get(key)
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_location_metadata(payload):
    client_timestamp = parse_client_timestamp(
        payload.get("client_timestamp") or payload.get("timestamp")
    )
    return {
        "accuracy_meters": optional_float(payload, "accuracy_meters")
        if "accuracy_meters" in payload
        else optional_float(payload, "accuracy"),
        "altitude_meters": optional_float(payload, "altitude_meters")
        if "altitude_meters" in payload
        else optional_float(payload, "altitude"),
        "speed_mps": optional_float(payload, "speed_mps") if "speed_mps" in payload else optional_float(payload, "speed"),
        "heading_degrees": optional_float(payload, "heading_degrees")
        if "heading_degrees" in payload
        else optional_float(payload, "heading"),
        "client_timestamp": client_timestamp,
        "mock_location": bool_from_payload(
            payload,
            "mock_location",
            "is_mock_location",
            "mocked",
            "from_mock_provider",
        ),
    }


def build_device_signal_payload(payload):
    signal = payload.get("device_signal") or payload.get("device") or {}
    if not isinstance(signal, dict):
        signal = {}
    return {
        "platform": str(signal.get("platform") or payload.get("platform") or "")[:32],
        "app_version": str(signal.get("app_version") or payload.get("app_version") or "")[:64],
        "device_id_hash": str(signal.get("device_id_hash") or payload.get("device_id_hash") or "")[:128],
        "is_emulator": bool_from_payload(signal, "is_emulator", "emulator")
        or bool_from_payload(payload, "is_emulator", "emulator"),
        "is_mock_location": bool_from_payload(signal, "is_mock_location", "mock_location")
        or bool_from_payload(payload, "is_mock_location", "mock_location"),
        "developer_mode": bool_from_payload(signal, "developer_mode", "is_developer_mode"),
        "integrity_level": str(signal.get("integrity_level") or "")[:32],
        "signals": signal,
    }


class RunValidator:
    def validate_start(self, session, device_signal):
        issues = []
        if device_signal.is_emulator:
            issues.append(
                ValidationIssue(
                    rule="device_emulator",
                    severity=RunValidationEvent.Severity.HIGH,
                    score_delta=-18,
                    message="Run started from an emulator-marked device.",
                    details={"platform": device_signal.platform},
                )
            )
        if device_signal.is_mock_location:
            issues.append(
                ValidationIssue(
                    rule="device_mock_location",
                    severity=RunValidationEvent.Severity.HIGH,
                    score_delta=-20,
                    message="Device reported mock-location capability during run start.",
                )
            )
        if device_signal.developer_mode:
            issues.append(
                ValidationIssue(
                    rule="device_developer_mode",
                    severity=RunValidationEvent.Severity.MEDIUM,
                    score_delta=-8,
                    message="Developer mode signal present during run start.",
                )
            )
        return ValidationResult(issues=issues, allow_distance=not issues, allow_tile_capture=not issues)

    def validate_location(self, session, last_point, metadata, distance_meters, elapsed_seconds):
        issues = []
        speed_mps = distance_meters / elapsed_seconds if elapsed_seconds > 0 else 0.0

        if metadata["mock_location"]:
            issues.append(
                ValidationIssue(
                    rule="point_mock_location",
                    severity=RunValidationEvent.Severity.CRITICAL,
                    score_delta=-30,
                    message="Location point was marked as mock/fake GPS.",
                )
            )

        if metadata["accuracy_meters"] and metadata["accuracy_meters"] > WEAK_ACCURACY_METERS:
            issues.append(
                ValidationIssue(
                    rule="weak_gps_accuracy",
                    severity=RunValidationEvent.Severity.LOW,
                    score_delta=-2,
                    message="Location accuracy is too weak for high-confidence territory capture.",
                    details={"accuracy_meters": metadata["accuracy_meters"]},
                )
            )

        if metadata["client_timestamp"]:
            drift = abs((timezone.now() - metadata["client_timestamp"]).total_seconds())
            if drift > MAX_CLIENT_CLOCK_DRIFT_SECONDS:
                issues.append(
                    ValidationIssue(
                        rule="client_clock_drift",
                        severity=RunValidationEvent.Severity.MEDIUM,
                        score_delta=-5,
                        message="Client timestamp drift exceeds accepted window.",
                        details={"drift_seconds": round(drift, 2)},
                    )
                )

        if last_point and elapsed_seconds <= 0:
            issues.append(
                ValidationIssue(
                    rule="invalid_time_delta",
                    severity=RunValidationEvent.Severity.HIGH,
                    score_delta=-12,
                    message="Location update has a non-positive server time delta.",
                )
            )

        if speed_mps >= IMPOSSIBLE_SPEED_MPS:
            issues.append(
                ValidationIssue(
                    rule="impossible_speed",
                    severity=RunValidationEvent.Severity.CRITICAL,
                    score_delta=-35,
                    message="Calculated speed exceeds plausible running limits.",
                    details={"speed_mps": round(speed_mps, 2)},
                )
            )
        elif speed_mps >= SUSPICIOUS_SPEED_MPS:
            issues.append(
                ValidationIssue(
                    rule="suspicious_speed",
                    severity=RunValidationEvent.Severity.HIGH,
                    score_delta=-15,
                    message="Calculated speed is suspicious for a running activity.",
                    details={"speed_mps": round(speed_mps, 2)},
                )
            )

        if distance_meters >= TELEPORT_DISTANCE_METERS and speed_mps >= TELEPORT_SPEED_MPS:
            issues.append(
                ValidationIssue(
                    rule="teleport_jump",
                    severity=RunValidationEvent.Severity.CRITICAL,
                    score_delta=-40,
                    message="Location jump matches teleport behavior.",
                    details={
                        "distance_meters": round(distance_meters, 2),
                        "speed_mps": round(speed_mps, 2),
                    },
                )
            )

        rejected = any(issue.severity == RunValidationEvent.Severity.CRITICAL for issue in issues)
        high_risk = any(issue.severity == RunValidationEvent.Severity.HIGH for issue in issues)
        return ValidationResult(
            issues=issues,
            distance_meters=distance_meters,
            elapsed_seconds=elapsed_seconds,
            speed_mps=speed_mps,
            allow_distance=not rejected,
            allow_tile_capture=not rejected and not high_risk,
        )


def get_or_create_trust_profile(user):
    profile, _ = UserTrustProfile.objects.get_or_create(user=user)
    return profile


def apply_validation_result(session, result, point=None):
    if not result.issues:
        if session.validation_status == RunSession.ValidationStatus.PENDING:
            session.validation_status = RunSession.ValidationStatus.VALID
        session.max_speed_mps = max(session.max_speed_mps, result.speed_mps)
        session.save(update_fields=["validation_status", "max_speed_mps"])
        return

    profile = get_or_create_trust_profile(session.user)
    previous_status = session.validation_status
    profile.score = clamp_score(profile.score + result.score_delta)
    profile.total_events += len(result.issues)
    profile.last_event_at = timezone.now()

    if result.is_rejected:
        session.validation_status = RunSession.ValidationStatus.REJECTED
        if previous_status != RunSession.ValidationStatus.REJECTED:
            profile.rejected_runs += 1
    elif session.validation_status != RunSession.ValidationStatus.REJECTED:
        session.validation_status = RunSession.ValidationStatus.SUSPICIOUS
        if previous_status != RunSession.ValidationStatus.SUSPICIOUS:
            profile.suspicious_runs += 1

    session.validation_score = clamp_score(session.validation_score + result.score_delta)
    session.trust_score_snapshot = profile.score
    session.max_speed_mps = max(session.max_speed_mps, result.speed_mps)
    session.suspicious_reason = result.issues[0].message
    session.flagged_at = session.flagged_at or timezone.now()

    events = [
        RunValidationEvent(
            session=session,
            user=session.user,
            point=point,
            rule=issue.rule,
            severity=issue.severity,
            score_delta=issue.score_delta,
            message=issue.message,
            details=issue.details,
        )
        for issue in result.issues
    ]
    RunValidationEvent.objects.bulk_create(events)
    profile.save(update_fields=["score", "total_events", "last_event_at", "suspicious_runs", "rejected_runs"])
    session.save(
        update_fields=[
            "validation_status",
            "validation_score",
            "trust_score_snapshot",
            "max_speed_mps",
            "suspicious_reason",
            "flagged_at",
        ]
    )

    logger.warning(
        "run_validation_flagged",
        extra={
            "user_id": session.user_id,
            "session_id": session.id,
            "status": session.validation_status,
            "rules": [issue.rule for issue in result.issues],
            "trust_score": profile.score,
        },
    )


def create_device_signal(session, payload):
    signal_payload = build_device_signal_payload(payload)
    return DeviceSignal.objects.create(
        session=session,
        user=session.user,
        **signal_payload,
    )
