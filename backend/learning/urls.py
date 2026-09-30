from django.urls import path

from .views import LearningPathDetailView, LearningPathListView

app_name = "learning"

urlpatterns = [
    path(
        "paths/",
        LearningPathListView.as_view(),
        name="path-list",
    ),
    path(
        "paths/<slug:slug>/",
        LearningPathDetailView.as_view(),
        name="path-detail",
    ),
]