from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from learning.models import LearningPath
from progress.models import Enrollment

from .models import Project, ProjectSubmission


class ProjectSubmissionTests(APITestCase):
    def setUp(self):
        User = get_user_model()

        self.student = User.objects.create_user(username="student_one")
        self.other_student = User.objects.create_user(username="student_two")

        self.path = LearningPath.objects.create(
            title="Python Foundations",
            slug="python-foundation",
            description="Learn Python.",
            is_published=True,
        )

        self.project = Project.objects.create(
            learning_path=self.path,
            title="Developer Introduction",
            brief="Build an introduction program.",
            is_published=True,
        )

        Enrollment.objects.create(
            student=self.student,
            learning_path=self.path,
        )

        self.url = f"/api/projects/{self.project.pk}/submission/"
        self.payload = {
            "repository_url": "https://github.com/example/introduction",
            "description": "I practised variables and f-strings.",
        }

        self.client.force_authenticate(user=self.student)

    def test_submission_is_created_and_updated(self):
        response = self.client.put(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 201)

        submission_id = response.data["submission"]["id"]

        updated = {
            **self.payload,
            "description": "I also added a README.",
        }

        response = self.client.put(self.url, updated, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["created"])
        self.assertEqual(response.data["submission"]["id"], submission_id)
        self.assertEqual(ProjectSubmission.objects.count(), 1)

        response = self.client.get(self.url)
        self.assertEqual(
            response.data["submission"]["description"],
            updated["description"],
        )

    def test_students_only_access_their_own_submission(self):
        self.client.put(self.url, self.payload, format="json")

        Enrollment.objects.create(
            student=self.other_student,
            learning_path=self.path,
        )

        self.client.force_authenticate(user=self.other_student)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["submission"])

        response = self.client.put(
            self.url,
            {**self.payload, "description": "My separate submission."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ProjectSubmission.objects.count(), 2)

        original = ProjectSubmission.objects.get(student=self.student)
        self.assertEqual(original.description, self.payload["description"])

    def test_enrollment_is_required(self):
        self.client.force_authenticate(user=self.other_student)

        self.assertEqual(self.client.get(self.url).status_code, 403)

        response = self.client.put(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(ProjectSubmission.objects.exists())

    def test_hidden_path_blocks_project_access(self):
        self.path.is_published = False
        self.path.save()

        response = self.client.get(
            f"/api/projects/paths/{self.path.slug}/"
        )
        self.assertEqual(response.status_code, 404)

        response = self.client.put(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 404)

    def test_invalid_repository_link_is_rejected(self):
        response = self.client.put(
            self.url,
            {
                **self.payload,
                "repository_url": "https://github.com/example",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("repository_url", response.data)

    def test_anonymous_submission_is_rejected(self):
        self.client.force_authenticate(user=None)

        response = self.client.put(self.url, self.payload, format="json")
        self.assertIn(response.status_code, [401, 403])
        self.assertFalse(ProjectSubmission.objects.exists())

    def test_submission_list_only_contains_current_students_work(self):
        own = ProjectSubmission.objects.create(
            student=self.student,
            project=self.project,
            **self.payload,
        )

        Enrollment.objects.create(
            student=self.other_student,
            learning_path=self.path,
        )

        ProjectSubmission.objects.create(
            student=self.other_student,
            project=self.project,
            **self.payload,
        )

        response = self.client.get("/api/projects/submissions/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], own.pk)
        self.assertEqual(
            response.data[0]["learning_path_slug"],
            self.path.slug,
        )

    def test_submission_list_hides_unpublished_projects(self):
        ProjectSubmission.objects.create(
            student=self.student,
            project=self.project,
            **self.payload,
        )

        self.project.is_published = False
        self.project.save()

        response = self.client.get("/api/projects/submissions/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_submission_list_requires_login(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/projects/submissions/")

        self.assertIn(response.status_code, [401, 403])    