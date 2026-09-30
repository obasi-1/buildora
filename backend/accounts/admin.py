from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class BuildoraUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Buildora profile", {
            "fields": ("bio", "learning_goal"),
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Buildora profile", {
            "fields": ("bio", "learning_goal"),
        }),
    )


admin.site.site_header = "Buildora Administration"
admin.site.site_title = "Buildora Admin"
admin.site.index_title = "Manage Buildora"