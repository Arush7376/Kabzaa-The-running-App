# Kabzaa Anti-Cheat Foundation

## Architecture

Kabzaa validates runs server-side at three layers:

1. Device signals at run start.
2. Per-point GPS validation during live tracking.
3. Final run status and trust score updates used by XP, leaderboard, territory, streaks, and achievements.

The implementation is intentionally modular:

- `api.models.UserTrustProfile`: long-lived user trust score and flag counters.
- `api.models.DeviceSignal`: device integrity signals attached to a run.
- `api.models.RunValidationEvent`: immutable audit events for suspicious behavior.
- `api.anti_cheat.RunValidator`: rule engine for speed, teleport, fake GPS, emulator, and clock drift checks.
- `RunSession.validation_status`: quick status for leaderboard and reward filtering.

## API Flow

### Start Run

`POST /api/start-run/`

Existing clients can continue sending an empty body. New clients should send:

```json
{
  "device_signal": {
    "platform": "android",
    "app_version": "1.0.0",
    "device_id_hash": "sha256-per-install-or-device-id",
    "is_emulator": false,
    "is_mock_location": false,
    "developer_mode": false,
    "integrity_level": "basic"
  }
}
```

The server stores the signal, snapshots the user trust score, and flags the run if the device reports emulator/mock/developer signals.

### Update Location

`POST /api/update-location/`

Existing clients can keep sending only `session_id`, `latitude`, and `longitude`. New clients should add low-cost GPS metadata:

```json
{
  "session_id": 123,
  "latitude": 28.6139,
  "longitude": 77.209,
  "accuracy": 8.4,
  "speed": 3.2,
  "heading": 145,
  "client_timestamp": "2026-05-13T18:20:00Z",
  "mock_location": false
}
```

Validation runs on the server using server timestamps, so battery impact stays low. The client does not need extra polling, cryptographic work, or high-frequency sensors for this foundation.

### End Run

`POST /api/end-run/`

The response summary includes `validation_status`, `validation_score`, and `suspicious_reason`. Rejected runs are excluded from XP totals through `get_user_totals()`.

## Validation Rules

### Suspicious Speed

Server computes speed between consecutive accepted server-received points.

- `>= 8.0 m/s`: high severity.
- `>= 12.5 m/s`: critical severity.

High severity blocks territory capture for that point. Critical severity blocks distance and tile credit for that point.

### Teleport Detection

A jump is considered teleport-like when both are true:

- distance delta `>= 250m`
- computed speed `>= 18 m/s`

This produces a critical event and rejects credit for that point.

### Fake GPS Hooks

The API accepts `mock_location`, `is_mock_location`, `mocked`, or `from_mock_provider` indicators. If any are true, the point is critical.

Android should populate this from mock-location APIs. iOS should populate equivalent jailbreak/location-spoofing checks when available. The server treats the signal as untrusted evidence, not proof by itself.

### Emulator Strategy

Emulator detection belongs mostly on-device, then gets reported as `device_signal.is_emulator`.

Recommended Android indicators:

- Build fingerprint/model/manufacturer emulator patterns.
- Known emulator files and properties.
- Google Play Integrity verdict.
- Developer options and mock provider status.

Recommended iOS indicators:

- Simulator target checks.
- Jailbreak indicators.
- DeviceCheck/App Attest for stronger production integrity.

Server behavior: emulator signals flag the run and reduce trust. They do not require extra GPS sampling.

### Trust Score

Every user starts at `100`.

Events apply score deltas:

- low GPS accuracy: `-2`
- client clock drift: `-5`
- developer mode: `-8`
- suspicious speed: `-15`
- emulator: `-18`
- device mock location: `-20`
- point mock location: `-30`
- impossible speed: `-35`
- teleport: `-40`

Scores are clamped from `0` to `100`. Trust score is stored separately from XP so moderation and gameplay can evolve independently.

## Server-Side Reward Policy

Current policy:

- Valid points can add distance and capture territory.
- High-risk points can add distance but do not capture territory.
- Critical points add neither distance nor territory.
- Rejected runs are excluded from XP totals.

Recommended next policy:

- Exclude suspicious/rejected runs from streaks until reviewed.
- Hide rejected runs from leaderboard ranking.
- Add moderation review endpoints for flagged runs.

## Logging

Anti-cheat events are written to:

- database: `RunValidationEvent`
- logger: `api.anti_cheat`

Production should route this logger to centralized logs with fields:

- `user_id`
- `session_id`
- `status`
- `rules`
- `trust_score`

## Implementation Roadmap

1. Add backend foundation models and validator. Done.
2. Send GPS metadata from the mobile client.
3. Send device integrity signals at run start.
4. Add tests for each rule and reward decision.
5. Add moderation/admin review views for flagged runs.
6. Add leaderboard filtering by validation status.
7. Add trust-score recovery rules for clean runs over time.
8. Add Play Integrity, DeviceCheck, or App Attest verification.
9. Move thresholds into environment or database-backed config.
10. Add async batch validation for historical run audits.
