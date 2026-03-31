from rest_framework import serializers

from .models import LocationPoint, RunSession, Tile


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
