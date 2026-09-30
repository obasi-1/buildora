from django.contrib import admin

from .models import Enrollment, LessonCompletion


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["student", "learning_path", "enrolled_at"]
    list_filter = ["learning_path"]
    search_fields = ["student__username", "learning_path__title"]
    list_select_related = ["student", "learning_path"]


@admin.register(LessonCompletion)
class LessonCompletionAdmin(admin.ModelAdmin):
    list_display = ["student", "lesson", "completed_at"]
    search_fields = ["student__username", "lesson__title"]
    list_select_related = ["student", "lesson"]