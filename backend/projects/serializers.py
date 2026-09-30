import re
from urllib.parse import urlsplit

from rest_framework import serializers

from .models import Project, ProjectSubmission


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "id",
            "learning_path",
            "title",
            "brief",
            "requirements",
            "position",
        ]
        read_only_fields = fields


class ProjectSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectSubmission
        fields = [
            "id",
            "project",
            "repository_url",
            "description",
            "submitted_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "project",
            "submitted_at",
            "updated_at",
        ]

    def validate_repository_url(self, value):
        parsed = urlsplit(value)

        if (
            parsed.scheme != "https"
            or parsed.netloc.lower() != "github.com"
            or parsed.query
            or parsed.fragment
        ):
            raise serializers.ValidationError(
                "Enter an HTTPS GitHub repository URL, "
                "such as https://github.com/username/repository."
            )

        parts = parsed.path.strip("/").split("/")

        if (
            len(parts) != 2
            or not re.fullmatch(r"[A-Za-z0-9-]+", parts[0])
            or not re.fullmatch(r"[A-Za-z0-9_.-]+", parts[1])
            or parts[1] in {".", ".."}
        ):
            raise serializers.ValidationError(
                "Link directly to a repository, not a profile, file, or branch."
            )

        return f"https://github.com/{parts[0]}/{parts[1]}"

    def validate_description(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Describe what you built and what you learned."
            )

        return value

class SubmissionListSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(
        source="project.title",
        read_only=True,
    )
    learning_path_title = serializers.CharField(
        source="project.learning_path.title",
        read_only=True,
    )
    learning_path_slug = serializers.CharField(
        source="project.learning_path.slug",
        read_only=True,
    )

    class Meta:
        model = ProjectSubmission
        fields = [
            "id",
            "project",
            "project_title",
            "learning_path_title",
            "learning_path_slug",
            "repository_url",
            "description",
            "submitted_at",
            "updated_at",
        ]
        read_only_fields = fields    