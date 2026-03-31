import math
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import LocationPoint, RunSession, Tile
from .utils import get_tile


def calculate_distance_meters(lat1, lng1, lat2, lng2):
    lat_distance = (lat2 - lat1) * 111139
    lon_distance = (lng2 - lng1) * 111139 * math.cos((lat2 * math.pi) / 180)
    return math.sqrt(lat_distance * lat_distance + lon_distance * lon_distance)


def format_duration_seconds(start_time, end_time):
    if not start_time or not end_time:
        return 0
    return max(int((end_time - start_time).total_seconds()), 0)


def get_rank_from_xp(xp):
    if xp >= 2200:
        return "City Phantom"
    if xp >= 1400:
        return "District Warlord"
    if xp >= 800:
        return "Neon Sprinter"
    if xp >= 300:
        return "Street Runner"
    return "Rookie Raider"


def get_user_totals(user):
    sessions = RunSession.objects.filter(user=user)
    total_distance = sessions.aggregate(total=Sum("distance")).get("total") or 0.0
    total_runs = sessions.count()
    total_tiles = Tile.objects.filter(owner=user).count()
    xp = int(total_distance / 80) + total_tiles * 25 + total_runs * 40
    return {
        "total_distance": round(total_distance, 2),
        "total_runs": total_runs,
        "total_tiles": total_tiles,
        "xp": xp,
        "rank": get_rank_from_xp(xp),
    }


def build_achievements(user, totals=None):
    if totals is None:
      totals = get_user_totals(user)

    achievements = [
        {
            "id": "first_run",
            "title": "Boot Sequence",
            "description": "Finish your first run.",
            "unlocked": totals["total_runs"] >= 1,
        },
        {
            "id": "territory_5",
            "title": "Tile Hunter",
            "description": "Own 5 territory tiles.",
            "unlocked": totals["total_tiles"] >= 5,
        },
        {
            "id": "distance_10k",
            "title": "Ten K Signal",
            "description": "Accumulate 10 km of running distance.",
            "unlocked": totals["total_distance"] >= 10000,
        },
        {
            "id": "warlord",
            "title": "District Warlord",
            "description": "Reach 800 XP.",
            "unlocked": totals["xp"] >= 800,
        },
    ]
    return achievements


def build_challenges(user, totals=None):
    if totals is None:
        totals = get_user_totals(user)

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    today_sessions = RunSession.objects.filter(user=user, start_time__gte=today_start)
    today_distance = today_sessions.aggregate(total=Sum("distance")).get("total") or 0.0
    week_runs = RunSession.objects.filter(user=user, start_time__gte=week_start).count()

    return [
        {
            "id": "daily_distance",
            "title": "3K Pulse",
            "description": "Run 3 km today.",
            "progress": min(round(today_distance / 3000, 2), 1),
            "current": round(today_distance / 1000, 2),
            "target": 3,
            "unit": "km",
        },
        {
            "id": "weekly_runs",
            "title": "Weekly Sweep",
            "description": "Complete 2 runs this week.",
            "progress": min(round(week_runs / 2, 2), 1),
            "current": week_runs,
            "target": 2,
            "unit": "runs",
        },
        {
            "id": "tile_capture",
            "title": "Sector Grab",
            "description": "Own 12 total tiles.",
            "progress": min(round(totals["total_tiles"] / 12, 2), 1),
            "current": totals["total_tiles"],
            "target": 12,
            "unit": "tiles",
        },
    ]


def serialize_session(session):
    duration_seconds = format_duration_seconds(session.start_time, session.end_time or timezone.now())
    average_speed = 0
    if duration_seconds > 0:
        average_speed = round((session.distance / 1000) / (duration_seconds / 3600), 2)

    return {
        "id": session.id,
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat() if session.end_time else None,
        "distance_meters": round(session.distance, 2),
        "duration_seconds": duration_seconds,
        "average_speed_kmh": average_speed,
        "points_count": session.points.count(),
    }


def build_session_summary(session):
    totals = get_user_totals(session.user)
    duration_seconds = format_duration_seconds(session.start_time, session.end_time or timezone.now())
    average_speed = 0
    if duration_seconds > 0:
        average_speed = round((session.distance / 1000) / (duration_seconds / 3600), 2)

    owned_tiles = Tile.objects.filter(owner=session.user).count()
    return {
        "session_id": session.id,
        "distance_meters": round(session.distance, 2),
        "duration_seconds": duration_seconds,
        "average_speed_kmh": average_speed,
        "owned_tiles": owned_tiles,
        "xp": totals["xp"],
        "rank": totals["rank"],
        "achievements": build_achievements(session.user, totals),
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_run(request):
    session = RunSession.objects.create(user=request.user)
    return Response({"session_id": session.id}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_location(request):
    session_id = request.data.get("session_id")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    if session_id is None:
        return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    if latitude is None or longitude is None:
        return Response(
            {"error": "latitude and longitude are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session_id = int(session_id)
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return Response(
            {"error": "session_id, latitude, and longitude must be valid numbers."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
        return Response(
            {"error": "latitude or longitude out of valid range."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = RunSession.objects.get(id=session_id, user=request.user)
    except RunSession.DoesNotExist:
        return Response({"error": "Run session not found."}, status=status.HTTP_404_NOT_FOUND)

    if session.end_time is not None:
        return Response(
            {"error": "Cannot update location for an ended run session."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    last_point = session.points.order_by("-timestamp").first()

    with transaction.atomic():
        LocationPoint.objects.create(session=session, latitude=latitude, longitude=longitude)

        if last_point:
            session.distance += calculate_distance_meters(
                last_point.latitude,
                last_point.longitude,
                latitude,
                longitude,
            )
            session.save(update_fields=["distance"])

        lat_index, lng_index = get_tile(latitude, longitude)
        tile, _ = Tile.objects.update_or_create(
            lat_index=lat_index,
            lng_index=lng_index,
            defaults={"owner": request.user},
        )

    return Response(
        {
            "message": "Location updated successfully.",
            "distance_meters": round(session.distance, 2),
            "tile": {
                "lat_index": tile.lat_index,
                "lng_index": tile.lng_index,
                "owner_id": tile.owner_id,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def end_run(request):
    session_id = request.data.get("session_id")
    if session_id is None:
        return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session_id = int(session_id)
    except (TypeError, ValueError):
        return Response(
            {"error": "session_id must be a valid integer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = RunSession.objects.get(id=session_id, user=request.user)
    except RunSession.DoesNotExist:
        return Response({"error": "Run session not found."}, status=status.HTTP_404_NOT_FOUND)

    if session.end_time is not None:
        return Response({"error": "Run session is already ended."}, status=status.HTTP_400_BAD_REQUEST)

    session.end_time = timezone.now()
    session.save(update_fields=["end_time"])

    return Response(
        {
            "message": "Run ended successfully.",
            "summary": build_session_summary(session),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    totals = get_user_totals(request.user)
    recent_sessions = RunSession.objects.filter(user=request.user).order_by("-start_time")[:8]

    return Response(
        {
            "username": request.user.username,
            "rank": totals["rank"],
            "xp": totals["xp"],
            "totals": totals,
            "achievements": build_achievements(request.user, totals),
            "challenges": build_challenges(request.user, totals),
            "recent_runs": [serialize_session(session) for session in recent_sessions],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def run_history(request):
    sessions = RunSession.objects.filter(user=request.user).order_by("-start_time")[:24]
    return Response({"results": [serialize_session(session) for session in sessions]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def territory_overview(request):
    owned_tiles = Tile.objects.filter(owner=request.user).order_by("-id")[:80]
    hotspots = (
        Tile.objects.values("owner__username")
        .annotate(tile_count=Count("id"))
        .order_by("-tile_count")[:6]
    )
    return Response(
        {
            "owned_tiles_count": Tile.objects.filter(owner=request.user).count(),
            "tiles": [
                {
                    "lat_index": tile.lat_index,
                    "lng_index": tile.lng_index,
                    "owner": tile.owner.username,
                }
                for tile in owned_tiles
            ],
            "hotspots": [
                {
                    "username": row["owner__username"],
                    "tile_count": row["tile_count"],
                }
                for row in hotspots
            ],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def leaderboard(request):
    users = User.objects.all()
    entries = []
    for user in users:
        totals = get_user_totals(user)
        entries.append(
            {
                "username": user.username,
                "rank": totals["rank"],
                "xp": totals["xp"],
                "distance_meters": totals["total_distance"],
                "runs": totals["total_runs"],
                "tiles": totals["total_tiles"],
            }
        )

    entries.sort(key=lambda item: (-item["xp"], -item["tiles"], -item["distance_meters"]))
    return Response({"results": entries[:20]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def challenges(request):
    totals = get_user_totals(request.user)
    return Response(
        {
            "rank": totals["rank"],
            "xp": totals["xp"],
            "challenges": build_challenges(request.user, totals),
            "achievements": build_achievements(request.user, totals),
        }
    )
