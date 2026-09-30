from django.db.models import Prefetch
from rest_framework import generics, permissions

from .models import LearningPath, Lesson
from .serializers import (
    LearningPathDetailSerializer,
    LearningPathSerializer,
)


class LearningPathListView(generics.ListAPIView):
    serializer_class = LearningPathSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return LearningPath.objects.filter(is_published=True)


class LearningPathDetailView(generics.RetrieveAPIView):
    serializer_class = LearningPathDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return LearningPath.objects.filter(
            is_published=True
        ).prefetch_related(
            Prefetch(
                "modules__lessons",
                queryset=Lesson.objects.filter(is_published=True),
                to_attr="published_lessons",
            )
        )