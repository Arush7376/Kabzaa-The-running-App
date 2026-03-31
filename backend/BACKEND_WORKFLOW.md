# KABZAA — Backend workflow

This document explains how the Django REST Framework backend works for **KABZAA - The Running App**: a geolocation fitness app where runs are tracked and GPS points are mapped to **grid tiles** that represent **territory ownership**.

---

## 1. High-level idea

1. A **user** starts a **run** → the server creates a `RunSession`.
2. While running, the client sends **GPS coordinates** repeatedly → each pair is stored as a `LocationPoint` linked to that session.
3. Each coordinate is converted into a **tile** `(lat_index, lng_index)` using a fixed grid. That tile’s **owner** is set to the current user (create tile if new, or update owner if it already exists).

Authentication uses **HTTP Basic Auth** (username + password). Every API call must identify the user so runs and tiles are scoped correctly.

---

## 2. Project layout (what matters)

| Path | Role |
|------|------|
| `manage.py` | Django entry point (run server, migrations, shell). |
| `backend/settings.py` | Installs `rest_framework` and `api`, DB, `REST_FRAMEWORK` defaults (auth + `IsAuthenticated`). |
| `backend/urls.py` | Mounts `/api/` → `api.urls`. |
| `api/models.py` | `RunSession`, `LocationPoint`, `Tile`. |
| `api/views.py` | `start_run`, `update_location`, `end_run`. |
| `api/serializers.py` | `ModelSerializer` for each model (available for future expansion / browsable API). |
| `api/utils.py` | `get_tile(lat, lng, grid_size=0.001)`. |
| `api/urls.py` | Routes for the three endpoints. |

---

## 3. Data model (mental model)

```
User
  │
  ├── run_sessions (RunSession)     ← one row per started run
  │       │
  │       └── points (LocationPoint) ← many GPS samples per run
  │
  └── owned_tiles (Tile)             ← territory; unique per (lat_index, lng_index)
```

- **RunSession**  
  - `user` — who is running.  
  - `start_time` — set when the session is created.  
  - `end_time` — set when the run ends (`null` while active).  
  - `distance` — reserved for future distance logic (default `0`).

- **LocationPoint**  
  - `session` — FK to `RunSession`, `related_name='points'`.  
  - `latitude`, `longitude` — one sample.  
  - `timestamp` — when the row was saved.

- **Tile**  
  - `lat_index`, `lng_index` — grid cell; **unique together** (one row per cell).  
  - `owner` — current user who “owns” that cell (updated when someone runs through it).

---

## 4. Tile math (`get_tile`)

In `api/utils.py`, coordinates are snapped to a grid:

- `lat_index = floor(latitude / grid_size)`  
- `lng_index = floor(longitude / grid_size)`  

Default `grid_size = 0.001` (degrees). Smaller values → finer tiles; larger → coarser.

Example: near Delhi `lat=28.6139`, `lng=77.2090` with `0.001` gives indices like `28613` and `77209` (indices depend on the formula, not meters — tuning `grid_size` is how you control real-world tile size).

---

## 5. API workflow (happy path)

### Step A — Start a run

- **Request:** `POST /api/start-run/`  
- **Auth:** Basic (valid user).  
- **Body:** empty is fine.

**Server:** creates `RunSession` for `request.user`, returns:

```json
{ "session_id": <id> }
```

Status **201**. The client must keep `session_id` for the next steps.

---

### Step B — Send GPS (repeat many times)

- **Request:** `POST /api/update-location/`  
- **Auth:** Basic.  
- **Body (JSON):** `session_id`, `latitude`, `longitude`

**Server:**

1. Validates `session_id` (integer), lat/lng (numbers in valid ranges).  
2. Loads `RunSession` for **this user** and this `id` → **404** if missing or not yours.  
3. Rejects if the session is already ended → **400**.  
4. In a **database transaction**:  
   - Inserts `LocationPoint`.  
   - Computes `(lat_index, lng_index) = get_tile(lat, lng)`.  
   - `Tile.objects.update_or_create(lat_index=..., lng_index=..., defaults={"owner": request.user})`  
     - New cell → creates tile with this owner.  
     - Existing cell → updates `owner` to this user.

Returns **200** with a short message and tile info (indices + `owner_id`).

---

### Step C — End the run

- **Request:** `POST /api/end-run/`  
- **Auth:** Basic.  
- **Body (JSON):** `session_id`

**Server:** finds the session for this user, sets `end_time` to “now”, saves. Returns **200**. Further `update-location` calls for that session are rejected (**400**).

---

## 6. Error handling (what you should expect)

| Situation | Typical response |
|-----------|------------------|
| No / wrong Basic Auth | **401** |
| Missing `session_id` where required | **400** |
| `session_id` not an integer | **400** |
| Session not found or not owned by user | **404** |
| Invalid lat/lng or out of range | **400** |
| Update after run ended | **400** |
| End run when already ended | **400** |

Errors are JSON objects with an `error` or `detail` field depending on DRF vs. custom messages.

---

## 7. How to run and verify locally

From the `backend` directory (where `manage.py` lives):

```text
python manage.py migrate
python manage.py runserver
```

Base URL: `http://127.0.0.1:8000/`

Endpoints:

- `POST /api/start-run/`
- `POST /api/update-location/`
- `POST /api/end-run/`

Use Basic Auth in Postman, or PowerShell `Invoke-RestMethod` with an `Authorization: Basic ...` header and JSON bodies for update/end.

---

## 8. Design notes

- **Why Basic Auth by default?** It is simple for development and tools; production often switches to token/JWT — the view logic (sessions, points, tiles) stays the same.  
- **Why `update_or_create` on Tile?** It matches the product rule: one owner per grid cell; last write wins when someone runs through that cell.  
- **Serializers** are defined for all models so you can later add list/detail APIs or nested responses without rewriting model code.

---

*Generated for the KABZAA backend. Adjust `grid_size` and auth method as your product hardens.*
