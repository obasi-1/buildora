from django.contrib import admin

from .models import LearningPath, Lesson, Module


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ["title", "is_published", "created_at"]
    list_filter = ["is_published"]
    search_fields = ["title", "description"]
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ["title", "learning_path", "position"]
    list_filter = ["learning_path"]
    search_fields = ["title"]
    list_select_related = ["learning_path"]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ["title", "module", "position", "is_published"]
    list_filter = ["is_published", "module__learning_path"]
    search_fields = ["title", "content"]
    list_select_related = ["module"]