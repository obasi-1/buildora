from django.contrib import admin

from .models import Project, ProjectSubmission


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "learning_path",
        "position",
        "is_published",
    )
    list_filter = ("is_published", "learning_path")
    search_fields = ("title", "learning_path__title")
    list_select_related = ("learning_path",)
    readonly_fields = ("created_at",)


@admin.register(ProjectSubmission)
class ProjectSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "project",
        "submitted_at",
        "updated_at",
    )
    list_filter = ("project__learning_path",)
    search_fields = (
        "student__username",
        "project__title",
        "description",
    )
    list_select_related = ("student", "project")
    readonly_fields = ("submitted_at", "updated_at")