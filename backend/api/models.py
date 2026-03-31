from django.conf import settings
from django.db import models


class RunSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="run_sessions",
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    distance = models.FloatField(default=0.0)


class LocationPoint(models.Model):
    session = models.ForeignKey(
        RunSession,
        on_delete=models.CASCADE,
        related_name="points",
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)


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
