# KABZAA

KABZAA is a running app with territory capture mechanics. The repository contains an Expo React Native client and a Django REST backend for authentication, run tracking, leaderboard data, and tile ownership.

## Repository layout

- `kabzaa-app/`: main Expo React Native application.
- `backend/`: Django REST API and SQLite-backed development server.
- `frontend/`: earlier prototype, excluded from the main repository.

## Main features

- User signup and login
- GPS-based run tracking
- Territory capture using map tiles
- Run history and profile data
- Leaderboard and territory views

## Tech stack

- Frontend: Expo, React Native, React Navigation, Axios
- Backend: Django, Django REST Framework, token auth
- Storage: SQLite for local development

## Getting started

### 1. Run the backend

Open a terminal in `backend/` and run:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The development API runs at `http://127.0.0.1:8000`.

### 2. Run the mobile app

Open a second terminal in `kabzaa-app/` and run:

```bash
npm install
npm start
```

Expo will open the project in Expo Go, Android, iOS, or web depending on your environment.

### 3. Configure the API URL

The mobile app resolves the API URL in this order:

1. `EXPO_PUBLIC_API_URL`
2. `expo.extra.apiUrl`
3. The Expo host machine IP
4. Local defaults such as `http://127.0.0.1:8000`

If you are testing on a physical device, set `EXPO_PUBLIC_API_URL` to a reachable backend host.

## API overview

Core endpoints exposed by the backend include:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/start-run/`
- `POST /api/update-location/`
- `POST /api/end-run/`
- `GET /api/profile/`
- `GET /api/run-history/`
- `GET /api/territory/`
- `GET /api/leaderboard/`

## Notes

- This repository is organized around the current app in `kabzaa-app/`.
- Development artifacts such as logs, `node_modules`, Expo output, virtual environments, and SQLite files are ignored.
