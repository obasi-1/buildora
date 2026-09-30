from rest_framework import serializers

from .models import LearningPath, Lesson, Module


class LearningPathSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPath
        fields = ["id", "title", "slug", "description"]


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "content",
            "resource_url",
            "exercise",
            "position",
        ]


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(
        source="published_lessons",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Module
        fields = ["id", "title", "description", "position", "lessons"]


class LearningPathDetailSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = LearningPath
        fields = ["id", "title", "slug", "description", "modules"]