from django.conf import settings
from django.db import models


class Enrollment(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    learning_path = models.ForeignKey(
        "learning.LearningPath",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-enrolled_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "learning_path"],
                name="unique_student_path_enrollment",
            ),
        ]

    def __str__(self):
        return f"{self.student.username} — {self.learning_path.title}"


class LessonCompletion(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lesson_completions",
    )
    lesson = models.ForeignKey(
        "learning.Lesson",
        on_delete=models.CASCADE,
        related_name="completions",
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-completed_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "lesson"],
                name="unique_student_lesson_completion",
            ),
        ]

    def __str__(self):
        return f"{self.student.username} — {self.lesson.title}"