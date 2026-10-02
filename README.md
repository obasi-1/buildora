# Buildora

**Learning by creating real projects.**

Buildora is a full-stack learning platform that helps students learn coding through guided lessons, practical exercises, and projects.

🌐 **Live website:** https://buildora-rose-two.vercel.app/

## Features

- Account registration and login.
- Personal profiles and learning goals.
- Learning paths organised into modules and lessons.
- Practical exercises and project briefs.
- Learning-path enrolment.
- Lesson completion and progress tracking.
- Personal dashboard.
- GitHub repository links for project submissions.
- Django admin for managing users and learning content.

## Technology Stack

| Component | Technology |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Python, Django, Django REST Framework |
| Authentication | JWT using Simple JWT |
| Development database | SQLite |
| Production database | PostgreSQL on Neon |
| Frontend hosting | Vercel |
| Backend hosting | Render |

## Project Structure

- `backend/accounts/` — registration, authentication, and profiles.
- `backend/learning/` — learning paths, modules, and lessons.
- `backend/progress/` — enrolments and lesson completion.
- `backend/projects/` — projects and student submissions.
- `backend/config/` — Django configuration.
- `frontend/src/` — React components and styling.

## Running Locally

### Backend

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create a `.env` file inside `backend` containing:

```dotenv
DJANGO_SECRET_KEY=replace-with-your-own-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
```

Generate your secret key with:

```powershell
.\.venv\Scripts\python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Then prepare the database and start Django:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

### Frontend

Open another terminal from the project root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the address displayed by Vite, normally:

http://localhost:5173/

Keep both the backend and frontend servers running.

### Adding Learning Content

Visit http://127.0.0.1:8000/admin/ and log in with your
superuser account to create and publish learning content.

Local users and content are separate from the production database.

## Testing

From `backend`:

```powershell
.\.venv\Scripts\python.exe manage.py test
```

From `frontend`:

```powershell
npm run lint
npm run build
```

## Deployment

The frontend is hosted on Vercel and forwards API requests to
the Django backend on Render. Production data is stored in Neon PostgreSQL.

Secrets and database credentials belong in environment variables.
Do not commit `.env` files to Git.

## Planned Improvements

- Forgot-password and password-reset functionality.
- Welcome emails after registration.
- Additional learning paths and projects.

## Author

**Obasi-sam Otei**

GitHub: https://github.com/obasi-1