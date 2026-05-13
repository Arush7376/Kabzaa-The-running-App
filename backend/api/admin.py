"""Admin registrations for api app."""

from django.contrib import admin

from .models import (
    DeviceSignal,
    LocationPoint,
    RunSession,
    RunValidationEvent,
    Tile,
    UserTrustProfile,
)


@admin.register(RunSession)
class RunSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "start_time",
        "end_time",
        "distance",
        "validation_status",
        "validation_score",
        "max_speed_mps",
    )
    list_filter = ("validation_status", "start_time")
    search_fields = ("user__username", "suspicious_reason")


@admin.register(LocationPoint)
class LocationPointAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "latitude", "longitude", "timestamp", "mock_location")
    list_filter = ("mock_location", "timestamp")


@admin.register(Tile)
class TileAdmin(admin.ModelAdmin):
    list_display = ("id", "lat_index", "lng_index", "owner")
    search_fields = ("owner__username",)


@admin.register(UserTrustProfile)
class UserTrustProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "score", "suspicious_runs", "rejected_runs", "total_events")
    search_fields = ("user__username",)


@admin.register(DeviceSignal)
class DeviceSignalAdmin(admin.ModelAdmin):
    list_display = ("session", "user", "platform", "is_emulator", "is_mock_location", "created_at")
    list_filter = ("platform", "is_emulator", "is_mock_location", "developer_mode")


@admin.register(RunValidationEvent)
class RunValidationEventAdmin(admin.ModelAdmin):
    list_display = ("session", "user", "rule", "severity", "score_delta", "created_at")
    list_filter = ("rule", "severity", "created_at")
    search_fields = ("user__username", "message")
