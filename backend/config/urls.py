from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/learning/", include("learning.urls")),
    path("api/progress/", include("progress.urls")),
    path("api/projects/", include("projects.urls")),
]