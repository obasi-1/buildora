from django.db import models


class LearningPath(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title", "id"]

    def __str__(self):
        return self.title


class Module(models.Model):
    learning_path = models.ForeignKey(
        LearningPath,
        on_delete=models.CASCADE,
        related_name="modules",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return f"{self.learning_path.title} — {self.title}"


class Lesson(models.Model):
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="lessons",
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    resource_url = models.URLField(blank=True)
    exercise = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=1)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return f"{self.module.title} — {self.title}"