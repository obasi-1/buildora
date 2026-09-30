from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    bio = models.TextField(max_length=500, blank=True)
    learning_goal = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.username