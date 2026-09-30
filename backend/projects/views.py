from django.shortcuts import get_object_or_404

from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from learning.models import LearningPath
from progress.models import Enrollment
from .serializers import SubmissionListSerializer

from .models import Project, ProjectSubmission
from .serializers import (
    ProjectSerializer,
    ProjectSubmissionSerializer,
)


class PathProjectListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        learning_path = get_object_or_404(
            LearningPath,
            slug=slug,
            is_published=True,
        )

        projects = Project.objects.filter(
            learning_path=learning_path,
            is_published=True,
        )

        return Response(ProjectSerializer(projects, many=True).data)


class MyProjectSubmissionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self, request, project_id):
        project = get_object_or_404(
            Project.objects.select_related("learning_path"),
            pk=project_id,
            is_published=True,
            learning_path__is_published=True,
        )

        is_enrolled = Enrollment.objects.filter(
            student=request.user,
            learning_path_id=project.learning_path_id,
        ).exists()

        if not is_enrolled:
            raise PermissionDenied(
                "Enrol in this learning path before submitting a project."
            )

        return project

    def get(self, request, project_id):
        project = self.get_project(request, project_id)

        submission = ProjectSubmission.objects.filter(
            student=request.user,
            project=project,
        ).first()

        return Response({
            "submission": (
                ProjectSubmissionSerializer(submission).data
                if submission
                else None
            ),
        })

    def put(self, request, project_id):
        project = self.get_project(request, project_id)

        serializer = ProjectSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission, created = ProjectSubmission.objects.update_or_create(
            student=request.user,
            project=project,
            defaults=serializer.validated_data,
        )

        return Response(
            {
                "submission": ProjectSubmissionSerializer(submission).data,
                "created": created,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

class MySubmissionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        submissions = (
            ProjectSubmission.objects.filter(
                student=request.user,
                project__is_published=True,
                project__learning_path__is_published=True,
                project__learning_path__enrollments__student=request.user,
            )
            .select_related("project__learning_path")
            .order_by("-updated_at", "-id")
            .distinct()
        )

        return Response(
            SubmissionListSerializer(submissions, many=True).data
        )    