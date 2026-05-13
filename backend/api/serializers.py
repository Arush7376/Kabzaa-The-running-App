from rest_framework import serializers

from .models import (
    DeviceSignal,
    LocationPoint,
    RunSession,
    RunValidationEvent,
    Tile,
    UserTrustProfile,
)


class RunSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunSession
        fields = "__all__"


class LocationPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationPoint
        fields = "__all__"


class TileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tile
        fields = "__all__"


class UserTrustProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTrustProfile
        fields = "__all__"


class DeviceSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceSignal
        fields = "__all__"


class RunValidationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunValidationEvent
        fields = "__all__"
