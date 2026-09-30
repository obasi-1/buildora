from django.conf import settings
from django.db import models


class Project(models.Model):
    learning_path = models.ForeignKey(
        "learning.LearningPath",
        on_delete=models.CASCADE,
        related_name="projects",
    )
    title = models.CharField(max_length=200)
    brief = models.TextField()
    requirements = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=1)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return f"{self.learning_path.title} — {self.title}"


class ProjectSubmission(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_submissions",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    repository_url = models.URLField(max_length=500)
    description = models.TextField(max_length=2000)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "project"],
                name="unique_student_project_submission",
            ),
        ]

    def __str__(self):
        return f"{self.student.username} — {self.project.title}"