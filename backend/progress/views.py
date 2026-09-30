from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q

from learning.models import LearningPath, Lesson

from .models import Enrollment, LessonCompletion


class EnrollView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        learning_path = get_object_or_404(
            LearningPath,
            slug=slug,
            is_published=True,
        )

        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            learning_path=learning_path,
        )

        return Response(
            {
                "id": enrollment.id,
                "learning_path": learning_path.title,
                "slug": learning_path.slug,
                "enrolled_at": enrollment.enrolled_at,
                "created": created,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

class CompleteLessonView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lesson_id):
        lesson = get_object_or_404(
            Lesson.objects.select_related("module__learning_path"),
            pk=lesson_id,
            is_published=True,
            module__learning_path__is_published=True,
        )

        is_enrolled = Enrollment.objects.filter(
            student=request.user,
            learning_path_id=lesson.module.learning_path_id,
        ).exists()

        if not is_enrolled:
            return Response(
                {"detail": "Enrol in this learning path first."},
                status=status.HTTP_403_FORBIDDEN,
            )

        completion, created = LessonCompletion.objects.get_or_create(
            student=request.user,
            lesson=lesson,
        )

        return Response(
            {
                "id": completion.id,
                "lesson_id": lesson.id,
                "lesson": lesson.title,
                "completed_at": completion.completed_at,
                "created": created,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )    

class PathProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        learning_path = get_object_or_404(
            LearningPath,
            slug=slug,
            is_published=True,
        )

        is_enrolled = Enrollment.objects.filter(
            student=request.user,
            learning_path=learning_path,
        ).exists()

        if not is_enrolled:
            return Response(
                {"detail": "Enrol in this learning path first."},
                status=status.HTTP_403_FORBIDDEN,
            )

        published_lessons = Lesson.objects.filter(
            module__learning_path=learning_path,
            is_published=True,
        )

        total_lessons = published_lessons.count()

        completed_lesson_ids = list(
            LessonCompletion.objects.filter(
                student=request.user,
                lesson__in=published_lessons,
            )
            .order_by("lesson_id")
            .values_list("lesson_id", flat=True)
            .distinct()
        )

        completed_lessons = len(completed_lesson_ids)

        percentage = (
            round(completed_lessons / total_lessons * 100, 2)
            if total_lessons
            else 0.0
        )

        return Response({
            "learning_path": learning_path.title,
            "slug": learning_path.slug,
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "completed_lesson_ids": completed_lesson_ids,
            "progress_percentage": percentage,
            "is_complete": (
                total_lessons > 0
                and completed_lessons == total_lessons
            ),
        })

class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        learning_paths = LearningPath.objects.filter(
            enrollments__student=request.user,
            is_published=True,
        ).annotate(
            total_lessons=Count(
                "modules__lessons",
                filter=Q(modules__lessons__is_published=True),
                distinct=True,
            ),
            completed_lessons=Count(
                "modules__lessons",
                filter=Q(
                    modules__lessons__is_published=True,
                    modules__lessons__completions__student=request.user,
                ),
                distinct=True,
            ),
        ).order_by("title", "id")

        paths = []

        for learning_path in learning_paths:
            total = learning_path.total_lessons
            completed = learning_path.completed_lessons

            paths.append({
                "id": learning_path.id,
                "title": learning_path.title,
                "slug": learning_path.slug,
                "total_lessons": total,
                "completed_lessons": completed,
                "progress_percentage": (
                    round(completed / total * 100, 2)
                    if total
                    else 0.0
                ),
                "is_complete": total > 0 and completed == total,
            })

        return Response({
            "username": request.user.username,
            "enrolled_paths": len(paths),
            "completed_paths": sum(
                1 for path in paths if path["is_complete"]
            ),
            "paths": paths,
        })        