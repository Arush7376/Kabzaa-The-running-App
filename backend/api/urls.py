from django.urls import path

from .auth_views import login, register
from .views import (
    challenges,
    end_run,
    leaderboard,
    profile,
    run_history,
    start_run,
    territory_overview,
    update_location,
)

urlpatterns = [
    path("auth/register/", register, name="auth-register"),
    path("auth/login/", login, name="auth-login"),
    path("start-run/", start_run, name="start-run"),
    path("update-location/", update_location, name="update-location"),
    path("end-run/", end_run, name="end-run"),
    path("profile/", profile, name="profile"),
    path("run-history/", run_history, name="run-history"),
    path("territory/", territory_overview, name="territory"),
    path("leaderboard/", leaderboard, name="leaderboard"),
    path("challenges/", challenges, name="challenges"),
]
