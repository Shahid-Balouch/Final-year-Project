# AI Surviallance System — Complete User Guide (How To Use Everything)

AI Surviallance System is an AI-powered surveillance system. It takes video from **any camera** (your laptop webcam, online RTSP/IP cameras, or another phone/browser acting as a camera), streams it into a dashboard, and runs **AI models on every frame** to:

- detect persons and objects in real time (YOLO),
- recognize faces and match them against a **Watchlist** (FaceNet),
- re-identify the same person across multiple camera feeds,
- understand what a person looks like in plain English (CLIP) so you can search "man in red shirt",
- fire **alerts** with snapshot evidence (dashboard, sound beep, email).

This guide explains every page, every feature, and how to get the most out of each one.

---

## Table of Contents

1. [What the system does (high level)](#1-what-the-system-does)
2. [How a camera frame is processed (the AI pipeline)](#2-the-ai-pipeline)
3. [What the system can detect](#3-what-the-system-can-detect)
4. [Accounts & roles](#4-accounts--roles)
5. [First run: how to get in](#5-first-run--how-to-get-in)
6. [Page-by-page walkthrough](#6-page-by-page-walkthrough)
7. [How to add cameras](#7-how-to-add-cameras)
8. [Core workflows / cool features](#8-core-workflows--cool-features)
9. [Sending alerts (sound / email / dashboard)](#9-alerts--notifications)
10. [Detection Modes & Thresholds](#10-detection-modes--thresholds)
11. [Settings explained](#11-settings-explained)
12. [Data storage & retention](#12-data-storage--retention)
13. [API quick reference](#13-api-quick-reference)
14. [Troubleshooting & notes](#14-troubleshooting--notes)

---

## 1. What the system does

You connect cameras, the system watches them continuously, and the moment something happens it **notifies you and records evidence**.

```
[Camera feed]  ──►  [AI Pipeline]  ──►  [Dashboard + Alerts + Email + Sound]
    │                    │
 webcam / RTSP /         │   YOLO    → who/what is in the frame
 phone-as-camera         │   MTCNN   → find faces
                         │   FaceNet → who is this person (watchlist match?)
                         │   CLIP    → describe appearance ("red shirt")
```

- **Live monitoring** – see all camera feeds in one grid with bounding boxes + confidence %.
- **Automatic alerting** – activity (person/weapon/etc.) and watchlist matches generate an incident record with a snapshot image.
- **Person tracking (Re-ID)** – every face is given an ID (`P-001`…). The same person appearing on another camera keeps the same ID, so you can follow them across your network.
- **Watchlist** – upload face photos; the system flags when a known person is on camera.
- **Tactical focus** – click a person in the log and the system locks onto them across all feeds.
- **Semantic search** – type a description like *"person in red shirt"* and get ranked matches.
- **Privacy Guard** – blur all non-authorized faces live (GDPR-style).
- **Alerts log** – every incident with image evidence, filterable + exportable (CSV/PDF).
- **Analytics** – charts of detection activity, severity mix, live log.
- **Org hub** – give external agencies (police/hospital) a filtered, read-only incident feed.
- **Admin tools** – user management, system health/capacity, camera & threshold configuration.

---

## 2. The AI pipeline

Every ~2nd frame of each connected feed is processed asynchronously:

1. **YOLO object detection + tracking** (`_process_detections`, camera_engine.py:596)
   - Uses `model.track(...)` so objects keep stable IDs between frames.
   - Draws a **red box** for danger classes, **green box** otherwise, e.g. `PERSON 87%`.
2. **Face detection** (`_process_face_search`, camera_engine.py:615)
   - MTCNN locates faces, FaceNet produces a 512-dim embedding.
   - Compares against Watchlist (cosine similarity; match if > 0.70).
   - Runs Re-ID to assign a persistent person ID even if not on the watchlist.
3. **Semantic attributes (CLIP)** (`_extract_semantic_embedding`, camera_engine.py:705)
   - For each *new* person, an appearance embedding is computed → enables text search.
4. **Alert generation** (`_handle_alerts`, camera_engine.py:524)
   - Activity alert (cooldown ~3 s) or Watchlist match alert (once per person encounter).
   - Saves a JPEG **evidence snapshot** (base64), coordinates, feed id, timestamp.
5. **Broadcast** – alert goes to the SQLite history + all connected dashboards via WebSocket; optional email + sound.

The top-left HUD on a feed shows source type and latency, and boxes show e.g. `PERSON 87%`, `TARGET: <name>`, `FOCUS: P-012`.

---

## 3. What the system can detect

### Object classes (YOLO model)
- With the bundled **pretrained `yolo11n` model**, classes are the 80 COCO categories: `person`, `bicycle`, `car`, `motorcycle`, `bus`, `truck`, etc.
- The original project expected a **custom-trained model** (`model/S2 Model/best.pt`) that recognizes security-relevant classes — `gun`, `knife`, `violence`, `smoking`. That file was not included in the clone; the setup dropped in the pretrained model so everything runs. If you re-train/provide your custom weights and place them at `model/S2 Model/best.pt`, those classes appear automatically in Settings / Alert severity.
- **Weapons are handled specially in code**: if a `gun` or `knife` class exists, the detection threshold is automatically lowered to **0.25** (high sensitivity) instead of the normal 0.5 (camera_engine.py:608).

### Faces (MTCNN + FaceNet)
- Detects all faces, extracts 80×80 crops, matches against your Watchlist.
- Threshold `FACENET_THRESHOLD = 0.70`.

### Persons & Re-ID
- Every face becomes a person entry in the Re-ID buffer with a stable ID (`P-001`, `P-002`, …).
- Same person on another feed keeps the same ID (cosine similarity > 0.75).
- Entries expire after **10 minutes** of inactivity; people who vanish for > 2 min are treated as a new encounter, > 5 min trigger a `REAPPEARED` event.

### Semantic attributes (CLIP)
- Clothing color, carried objects, body type, etc. (ViT-B-32 CLIP embedding) — powers natural-language search.

> **Tip:** with the fallback COCO model the AI detects *people and general objects* reliably. Face ID, watchlist, tracking, tactical focus and semantic search all still work — only the weapon/violence *labels* are missing until you supply the custom model.

---

## 4. Accounts & roles

| Role | Who it is for | What they see / can do |
|---|---|---|
| **Admin** | Owner / master operator | Everything: Monitor, Cameras, Alerts, Analytics, Watchlist, **Settings**, **Users**, **System Health**, **Organization Controls**. Can delete alerts permanently. |
| **User** | Regular operator | Monitor, Cameras, Alerts, Analytics, Watchlist. Cannot see Settings, Users, System Health. |
| **Organization** | External agency (police, hospital, security agency) | Redirected to a dedicated **read-only live incident feed** (`Organization Feed`). Receives only the notification types an admin allowed for them. |

- **Admin approval workflow:** when an admin signs up (other than the very first user), the account is `PENDING_APPROVAL` until an existing admin approves it in **Users** page. Organization/user accounts get `is_approved = True` directly.
- **Email verification:** signup normally emails a 6-digit code for verification. Because SMTP is dummy in `.env`, signup currently won't complete through the UI — see [Troubleshooting](#14-troubleshooting--notes).

---

## 5. First run — how to get in

Start backend then frontend (see README), then open **http://localhost:5173**.

Credentials that were pre-created directly in the database (all `is_verified` + `is_approved = true`, so no email needed):

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123` |
| User | `user` | `User@123` |
| Organization | `org` | `Org@123` |

Login flow: `Login` page → token saved → you land on **Monitor**. With `admin` you have full navigation; `org` is redirected to the Organization Feed.

---

## 6. Page-by-page walkthrough

### Landing Page (`/`)
Marketing/landing page. Buttons: **Get Access / Initialize Access** → Signup, **Operator Login** → Login, or **Enter Dashboard** if already logged in.

### Login (`/login`)
- Enter **Username** + **Password** → `POST /api/auth/login`.
- On success stores `token`, `username`, `email`, `role`, `isAdmin` in browser localStorage.
- Link to **Signup** ("Request Access").

### Signup (`/signup`)
- Creates account: Username, Email, Password, **Account type** (`admin` / `user` / `organization`).
- Choosing **organization** reveals Station Type (`Police Station`, `Hospital`, `Security Agency`, `Corporate Office`) + Physical Address.
- Submits → a verification code is "sent" → you're routed to `/verify`. (Needs working SMTP to actually receive it.)

### Verify Email (`/verify`)
- Enter the 6-digit code from the email. On success → Login.

### Remote Camera (`/remote-camera`) — *use your phone as a camera*
This page turns the browser you're on into a remote camera node that sends its camera feed to the backend, which then runs all the AI on it.

**How to use:**
1. Open the page on the device with the camera (e.g., a phone) at `http://<your-PC-IP>:5173/remote-camera`.
2. Press **Initialize Uplink** → browser asks for camera permission.
3. It streams ~10 FPS to the backend over WebSocket. Feed appears in the dashboard as a `remote-*` feed when source is **Remote Node** or **Hybrid**.
4. Press **TERMINATE Uplink** to stop.

> Requires a **secure context** (`https:` or `localhost`) for camera access in the browser.

### Dashboard shell (AppLayout + Sidebar)
- Global state: alerts, detected persons, watchlist, settings, live connection status.
- WebSocket channels: `/ws` (alerts), `/ws/stats` (latency heartbeat), `/ws/persons` (new person events).
- **Alert toast** pops for ~6 s on new incidents; **location modal** opens a Google Maps view of the incident.
- **Sidebar navigation:**
  - Top (everyone): **Monitor**, **Cameras**, **Alerts**, **Analytics**, **Watchlist**
  - Bottom (admin only): **System Health**, **Organizations**, **Settings**, **Users**

### Monitor (`/dashboard`)
The main ops screen.

- **KPI summary**: total nodes, active, live feeds, offline.
- **Local camera card** (built-in): toggle power ⏻, toggle visibility 👁, click to maximize.
- **URL camera cards**: one per added online camera; same power/visibility toggles.
- **Maximize**: click a feed card for a full-screen view with overlay.
- **Alerts panel** + **Persons panel** (if enabled) on the side.

**How to use it:**
1. Turn on the local camera with the power button (or set source to Remote/URL).
2. Watch boxes + confidence on the live feed.
3. Click a person in the Persons panel to **focus** them (see Tactical Focus).
4. Maximize the feed with the most activity.

### Cameras (`/dashboard/cameras`)
Where you add and manage streams. See [How to add cameras](#7-how-to-add-cameras).

- **Local camera card** — built-in webcam, "Analysis" toggle.
- **URL cameras grid** — each has **Analysis** (turn the AI pipeline on/off), **Live/visibility** eye, **Edit**, **Delete**.
- Header KPIs + search + **ADD CAMERA** button.
- Add/Edit modal: `Name` + `RTSP/HTTP stream URL`.

### Alerts (`/dashboard/alerts`)
Historical incident log.

- Metric cards: Total, Critical, Watchlist Matches, Unique feeds.
- **Filter** by severity (ALL / MATCH / CRITICAL / HIGH / ALERT) or search text.
- **Bulk select** with checkboxes → **Delete Selected** (permanent wipe incl. image + biometrics), **Export CSV**, **Export PDF** (incident report with evidence image).
- Click an alert → detail modal with the snapshot image, detections, location; **Download snapshot**.

*Severity rules (AlertsLog):* `MATCH` = watchlist match; `CRITICAL` = detection label contains weapon/knife/gun/pistol; `HIGH` = fight/violence; else `ALERT`.

### Analytics (`/dashboard/analytics`)
Two tabs:

- **Analytics Engine** → charts (threat mix, detection density, performance).
- **Live Incident Log** → real-time list with Total / Critical / WL matches / Today counters, severity filter, CSV export, snapshot view.

### Watchlist (`/dashboard/watchlist`)
Manage the people you're looking for. Initially seeded with a few sample images from `data/watchlist/`.

**Add a target — two ways:**
1. **Upload mode**: click **ADD TARGET** → drop/pick a face photo → (optional) name → Submit. Name auto-generates if empty.
2. **Camera mode**: click the camera tab → capture a photo from your webcam → auto-submits with a generated name.

- **Rename**: edit icon on a card, type new name, save.
- **Delete**: trash icon → confirm.

When a watchlisted face appears in any feed, you get a **TARGET: name** red-corner box and a `WATCHLIST_MATCH` alert. The stored image lives in `data/watchlist/`.

### Settings (`/dashboard/settings`) — admin only
Two-column configuration screen. See [Settings explained](#11-settings-explained) below.

### System Health (`/dashboard/system`) — admin only
Diagnostics panel:

- **Capacity verdict** — how many cameras your hardware can handle (based on GPU VRAM / CPU cores). With CPU-only machines expect `INSUFFICIENT→MINIMAL/MODERATE`.
- **Live performance chart** — latency (ms) + load % over the last 20 samples (fed by the `/ws/stats` heartbeat).
- **Spec cards** — OS, CPU cores/model, RAM, GPU (name/VRAM) or "Not Detected", Storage/Capacity.
- **Status bar** — OS, overall status, active feeds.

### Users (`/dashboard/users`) — admin only
Full account management:

- List all users with **Role** badges + **Status** (Verified / Active / Approved) columns.
- Actions per user:
  - **Approve** — unblock a pending admin account.
  - **Verify** — mark email verified manually.
  - **Toggle Active** — enable/disable login.
  - **Toggle Admin** — grant/revoke admin rights.
  - **Delete** — remove user (with confirmation modal).
- Shows "Admin access required" (403) if a non-admin reaches it.

### Organizations (`/dashboard/organization-controls`) — admin only
Configure what each Organization account can see.

1. Search/select an organization from the list.
2. In the right panel set: **Station Type**, **Physical Address**, and **notifications** checkboxes: `person`, `knife`, `gun`, `smoking`, `violence`, `watchlist_match`.
3. **Save Config** → `POST /api/auth/users/{id}/org-settings`.

The organization will then only receive alerts whose detection labels (or `watchlist_match`) are allowed (filter applied in the WebSocket broadcaster).

### Organization Feed (`/dashboard/organization`)
The restricted landing page for `organization` role users.

- Read-only live incident feed: left = list of alert cards (severity, timestamp, thumbnail, detections, location), right = detail (large evidence image, match type, zone, protocol, detections).
- Receives the same WebSocket alert stream, but filtered to the org's allowed notification types.
- Auto-reconnects every 3 s if disconnected.

---

## 7. How to add cameras

There are **three kinds of cameras**:

### A. Local / USB webcam (built-in)
- On the **Settings** page, **Camera Source**: choose `Local Camera` (value `0`).
- Alternatively switch to `Hybrid` to run local + remote together, or `Auto` (auto-detects).
- Turn it **on** from the **Monitor** camera card power button.

### B. IP / Network camera (RTSP or HTTP MJPEG URL)
On the **Cameras** page:

1. Click **ADD CAMERA**.
2. Give it a **Name** (e.g. "Parking Lot").
3. Paste the **stream URL**. Examples:
   - RTSP: `rtsp://user:pass@192.168.1.20:554/stream1`
   - HTTP MJPEG: `http://192.168.1.20:8080/video.mjpg`
   - HLS/HTTP: `http://host/live/index.m3u8` (best effort)
4. Click save → card appears.
5. Click the card's **Analysis** toggle to start the AI pipeline (feed id becomes `url-<id>`). Backend opens it with OpenCV FFMPEG (`rtsp_transport;tcp`).
6. **Live** eye toggles whether it's displayed on Monitor (only works when active).
7. **Edit** re-creates the entry (delete + re-add — note the camera resets to inactive), **Delete** removes it permanently.

### C. Phone / browser as a camera (Remote Node)
1. Open **`http://<PC-IP>:5173/remote-camera`** on the phone.
2. **Initialize Uplink**, allow camera access → it streams frames to the backend.
3. In **Settings → Camera Source**, switch to **Remote Node** (or **Hybrid**).
4. The feed appears as `remote-<client>` on Monitor.

> The backend also exposes WebRTC endpoints for near-zero-latency streaming:
> - `POST /offer` → pull a feed into a WebRTC peer (used by camera viewer).
> - `POST /ingest` → let a mobile/WebRTC device push its video into the system (feed `remote-*`).
> - HTTP MJPEG fallback: `GET /api/camera/stream/{feed_id}`.

---

## 8. Core workflows / cool features

### Watchlist matching (Person Search)
1. Add faces in **Watchlist**.
2. Any live feed that sees a person matching > 0.70 similarity gets a red `TARGET: name` marker and a `WATCHLIST_MATCH` alert (sound plays **once per person encounter**, then only re-armed after they're gone 2+ minutes).

### Tactical Focus (cross-camera tracking)
1. In the **Persons panel** (Monitor), click a person (they have an ID like `P-012`).
2. The system flags them as `focused_person_id`, shows a **FOCUS: P-012** (yellow) marker, and any feed where that identity reappears is flagged immediately.
3. Check the **Person Log** panel / persons WebSocket events for status `NEW` / `REAPPEARED` / `is_focused`.

### Privacy Guard
- Toggle **Privacy Guard** (in Settings or via `/api/camera/privacy`).
- Every face that is **not** a watchlist target and **not** the focused person gets a heavy Gaussian blur + a `REDACTED` label in the live stream.
- Enabling it also auto-disables the person log (data minimization).

### Natural-language person search ("Semantic Search")
- Enabled by CLIP. Use `GET /api/persons/search?q=...`, e.g. `q=man in red shirt`.
- Returns logged persons ranked by appearance similarity with a score.
- (In the UI this is wired through the app context's semantic search handler; requires a running feed that has logged new persons first — each logged person was embedded by CLIP.)

### Loitering / behavioral awareness
- The Re-ID buffer tracks how long a person stays and when they return (`SHOW_COOLDOWN = 300s`, `STALE_TIMEOUT = 120s`, buffer TTL 600s) and re-emits events for reappearing people. (The README describes a 60-second loitering alarm; the current code implements the re-encounter/cooldown behavior described here.)

---

## 9. Alerts & notifications

- **Dashboard toast + sound** — real-time via `/ws`.
- **Browser beep** — `sound/drop.mp3` played by a subprocess worker (`sound_worker.py`) on alerting classes.
- **Email** — `_send_email_alert()` sends a branded incident email with the snapshot attached when `SMTP_*` is configured. Subjects: `CRITICAL THREAT: WEAPON`, `TARGET LOCATED`, or `Activity Detected`. (With dummy SMTP creds email is skipped/falls back gracefully.)
- **Immediate alert rules**:
  - Activity alert every ~3 s while something is detected.
  - Watchlist match alert logged at most once per 60 s per person.
  - Email throttled to one per 30 s.
- **Cooldown knobs**: `activity_cooldown=3`, `search_cooldown=1.5`, `sound_cooldown=1`, email throttle 30 s.

### Turning alerts on/off
- **Settings page**: Browser Sound toggle, Email Alerts toggle.
- **Per-class sounds**: Settings → Detection Thresholds → per class sound toggle.
- **Per-class thresholds**: slider per class; weapons auto-lowered to 0.25 if present.

---

## 10. Detection Modes & Thresholds

- **Detection mode** (`detection`) — YOLO only (no watchlist matching).
- **Search mode** (`search`) — face matching only.
- **Both** (default) — object detection + face search simultaneously.
- Default per-class threshold 0.5; editable in **Settings** and persisted to DB (`class_thresholds`).
- Mode is persisted (`camera_mode`), loaded at startup, default `both`.

---

## 11. Settings explained

Backend info shown comes from `GET /api/system/info` (SMTP email, local IP, port 8000, privacy, person-log, local camera visibility).

| Card | Controls | Effect |
|---|---|---|
| Operator Profile | — | Shows current user (username, email, access level). |
| Camera Source | select `Local Camera` / `Remote Node` / `Hybrid` | Which input feeds to use; restarts engine. |
| Watchlist Status | "Manage" button | Active target count → jumps to Watchlist page. |
| System Info | — | SMTP link, local IP, port, detection mode. |
| Notifications | Browser Sound, Email Alerts toggles | Enable/disable beep and email alerts. |
| Privacy & Display | Privacy Guard, Person Log Panel toggles | Blur non-authorized faces; show/hide persons side-panel. |
| Data Retention & History | Display Buffer (1–30 d), Retention (7–90 d) sliders + **Apply Changes** | Persists `ui_display_days` + `retention_days`; the retention cleanup background task deletes alerts older than retention (hourly check). |
| Detection Thresholds | per-class sliders + sound toggles + **Save Thresholds** | Adjust confidence cutoffs; persisted to DB. |
| Danger Zone | **Restart System**, **Logout** | Restarts the camera engine, or logs out. |

---

## 12. Data storage & retention

- **SQLite** (`backend/smartsurv.db`) — users, cameras, settings, alerts (with embedded base64 evidence images).
- Alerts are auto-deleted once older than `retention_days` (default 30) by `retention_cleanup_task` (runs every hour).
- Deleting an alert from the UI permanently removes it (including its image/biometric payload from DB).
- **Re-ID buffer is in-memory only** (facial embeddings never persisted); entries expire after 10 minutes inactivity.
- Watchlist images persist on disk in `data/watchlist/`.

---

## 13. API quick reference

Base: `http://localhost:8000` (frontend proxies `/api` to it).

**Auth / users**
`POST /api/auth/signup` · `POST /api/auth/verify` · `POST /api/auth/login` · `GET /api/auth/users` · `POST /api/auth/users/{id}/approve` · `/org-settings` · `/toggle` · `/admin` · `/verify` · `DELETE /api/auth/users/{id}`

**Camera / streams**
`GET /api/camera/stream/{feed_id}` (MJPEG) · `GET /video_feed` · `POST /api/camera/start` · `/stop` · `/mode` · `/source` · `/sound` · `/email` · `/focus` · `/privacy` · `GET /api/camera/feeds` · `/api/camera/local/toggle-visibility` · WebRTC `POST /offer`, `POST /ingest`

**URL cameras**
`GET/POST /api/url-cameras` · `POST /api/url-cameras/{id}/toggle` · `/toggle-visibility` · `DELETE /api/url-cameras/{id}`

**Alerts & settings**
`GET /api/alerts/history` · `DELETE /api/alerts` · `GET/POST /api/settings/data` · `GET/POST /api/settings/ui` · `GET/POST /api/model/thresholds` · `POST /api/model/sounds` · `GET /api/model/classes` · `GET /api/system/info` · `GET /api/system/check`

**Watchlist & search**
`GET/POST /api/watchlist` · `GET /api/watchlist/{name}/image` · `POST /api/watchlist/{name}/rename` · `DELETE /api/watchlist/{name}` · `GET /api/persons/search?q=...`

**WebSockets**
`/ws` (alerts, token-auth'd, org-filtered) · `/ws/stats` (latency heartbeat) · `/ws/persons` (person events) · `/ws/remote-input` (phone-as-camera uplink)

---

## 14. Troubleshooting & notes

1. **Signup fails / email verification** — `.env` SMTP values are dummy. Either:
   - create accounts directly in the DB (as done for `admin`/`user`/`org`), or
   - put real Gmail app-password credentials into `backend/.env` and restart the backend.
2. **No weapon classes** — the custom `model/S2 Model/best.pt` was not included in the repo (gitignored). The pretrained YOLO fallback gives general object/person detection. Place your trained weights at that path to restore gun/knife/violence classes.
3. **Camera won't open** — Windows: ensure the camera isn't already in use; try switching the Source to `0`. RTSP URLs need to be reachable from this PC and may require `rtsp://user:pass@…`.
4. **Remote-camera page shows permission error on non-localhost HTTP** — browsers require HTTPS or localhost for `getUserMedia`; use `https://` or access via `localhost`.
5. **`playsound`** is in `requirements.txt` but unbuildable on Python 3.11 and unused in code — it was skipped during setup.
6. **System Health shows INSUFFICIENT** — expected on CPU-only machines; the app still runs (capacity is a hardware heuristic).
7. **Editing a URL camera** resets it to inactive (the UI implements edit as delete + re-add) — click **Analysis** again after editing.
8. **Fresh database** — remove `backend/smartsurv.db` and restart the backend to wipe all users/alerts/settings and start clean (it recreates tables automatically).

---

*AI Surviallance System — AI-powered intelligent surveillance. For authorized security operations only.*