# KABZAA

KABZAA is a territory-capture running app. Players move through the real world, record GPS runs, and convert location updates into owned map tiles. This repository contains a Django REST backend plus Expo React Native clients for the gameplay and UI experiments.

## What the app does

- Tracks active runs with live GPS updates
- Draws the runner path on the map in real time
- Captures territory tiles as the user moves
- Supports signup, login, profile, history, and leaderboard flows
- Shows a live map marker with a pseudo-3D humanoid runner avatar in the prototype client

## Repository layout

- `backend/`: Django REST API, auth, run sessions, location points, tile ownership, and local SQLite development setup
- `frontend/`: Expo React Native prototype focused on the live run experience, map rendering, tile feedback, and the humanoid runner marker
- `kabzaa-app/`: separate Expo React Native app workspace for the broader product flow

## Current UX highlights

- Live route polyline while a run is active
- Dark map presentation for active gameplay
- Tile badge overlay showing the latest captured territory index
- Animated humanoid runner marker that bobs, strides, glows, and rotates with the direction of travel
- Web fallback screen for map previews when native maps are unavailable

## Tech stack

- Mobile clients: Expo, React Native, React Navigation, React Native Maps
- Backend: Django, Django REST Framework, token authentication
- Location: Expo Location
- Storage: SQLite for local development

## Getting started

### 1. Start the backend

Run the API from `backend/`:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The backend is available at `http://127.0.0.1:8000`.

### 2. Start the prototype mobile client

Run the prototype client from `frontend/`:

```bash
npm install
npm start
```

Use Expo Go or an emulator to open the app on Android or iOS. Web can be used for previewing layout and fallback behavior.

### 3. Start the app workspace

If you want to work on the parallel app workspace, run from `kabzaa-app/`:

```bash
npm install
npm start
```

### 4. Configure the API URL

The mobile app resolves the API URL in this order:

1. `EXPO_PUBLIC_API_URL`
2. `expo.extra.apiUrl`
3. The Expo host machine IP
4. Local defaults such as `http://127.0.0.1:8000`

If you are testing on a physical device, set `EXPO_PUBLIC_API_URL` to a backend host reachable from that device.

## Gameplay/API flow

Core backend endpoints include:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/start-run/`
- `POST /api/update-location/`
- `POST /api/end-run/`
- `GET /api/profile/`
- `GET /api/run-history/`
- `GET /api/territory/`
- `GET /api/leaderboard/`

Typical active run flow:

1. Start a run session.
2. Stream GPS points from the device.
3. Send location updates to the backend on an interval.
4. Convert coordinates into territory tile captures.
5. End the run and persist the session summary.

## Development notes

- `frontend/` currently contains the most visible map/avatar UX work.
- `backend/BACKEND_WORKFLOW.md` documents the backend flow and data model in more detail.
- Development artifacts such as logs, `node_modules`, Expo output, virtual environments, and SQLite files are ignored where appropriate.
