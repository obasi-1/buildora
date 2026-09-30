from django.urls import path

from .views import (
    MyProjectSubmissionView,
    MySubmissionListView,
    PathProjectListView,
)

urlpatterns = [
    path(
        "submissions/",
        MySubmissionListView.as_view(),
        name="my-submission-list",
    ),
    path(
        "paths/<slug:slug>/",
        PathProjectListView.as_view(),
        name="path-project-list",
    ),
    path(
        "<int:project_id>/submission/",
        MyProjectSubmissionView.as_view(),
        name="my-project-submission",
    ),
]