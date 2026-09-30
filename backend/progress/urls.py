from django.urls import path

from .views import (
    CompleteLessonView,
    DashboardView,
    EnrollView,
    PathProgressView,
)

app_name = "progress"

urlpatterns = [
    path(
        "dashboard/",
        DashboardView.as_view(),
        name="dashboard",
    ),
    path(
        "paths/<slug:slug>/enroll/",
        EnrollView.as_view(),
        name="enroll",
    ),
    path(
        "paths/<slug:slug>/",
        PathProgressView.as_view(),
        name="path-progress",
    ),
    path(
        "lessons/<int:lesson_id>/complete/",
        CompleteLessonView.as_view(),
        name="complete-lesson",
    ),
]