"""
Standalone Fake Alert Generator.

Connects to ws://localhost:8000/ws/notifications and sends fake JSON alert
payloads to simulate real-time notifications for testing the frontend
NotificationCenter / NotificationBell and the backend dispatcher.

Usage:
    python backend/tests/mock_alert_sender.py

Requires:  websockets  (add to requirements.txt)
           The FastAPI backend must be running on port 8000.
"""
import asyncio
import json
import time

try:
    import websockets
except ImportError:  # pragma: no cover
    raise SystemExit("websockets is not installed. Run: pip install websockets")

WS_URL = "ws://localhost:8000/ws/notifications"

FAKE_ALERTS = [
    {
        "type": "alert",
        "severity": "critical",
        "camera": "cam-1",
        "zone": {"label": "Server Room"},
        "timestamp": time.time(),
        "snapshot_url": "/snapshots/fake_critical.jpg",
        "snapshot_path": None,
        "message": "Unknown person in Server Room",
        "violations": [
            {"rule": "restricted_zone_intrusion", "severity": "critical", "description": "Unknown person in restricted zone 'Server Room'"}
        ],
        "requires_ack": True,
        "acknowledged": False,
    },
    {
        "type": "alert",
        "severity": "high",
        "camera": "cam-2",
        "zone": {"label": "ICU"},
        "timestamp": time.time(),
        "snapshot_url": "/snapshots/fake_high.jpg",
        "snapshot_path": None,
        "message": "Staff Ali entered ICU without permission",
        "violations": [
            {"rule": "restricted_zone_intrusion", "severity": "high", "description": "Staff Ali in restricted zone 'ICU'"}
        ],
        "requires_ack": True,
        "acknowledged": False,
    },
    {
        "type": "alert",
        "severity": "medium",
        "camera": "cam-0",
        "zone": {"label": "Main Gate"},
        "timestamp": time.time(),
        "snapshot_url": "/snapshots/fake_medium.jpg",
        "snapshot_path": None,
        "message": "Loitering detected at Main Gate",
        "violations": [
            {"rule": "loitering", "severity": "medium", "description": "Person loitering 2000s in 'Main Gate'"}
        ],
        "requires_ack": False,
        "acknowledged": False,
    },
]


async def send_alerts():
    print(f"[*] Connecting to {WS_URL} ...")
    async with websockets.connect(WS_URL) as ws:
        print("[*] Connected. Sending 3 fake alerts (2s interval)...")
        for idx, alert in enumerate(FAKE_ALERTS, start=1):
            payload = json.dumps(alert, default=str)
            await ws.send(payload)
            print(f"    [{idx}/3] Sent {alert['severity'].upper()}: {alert['message']}")
            if idx < len(FAKE_ALERTS):
                await asyncio.sleep(2)
        print("[*] All alerts sent. Keeping connection open for 3s...")
        await asyncio.sleep(3)
    print("[*] Disconnected.")


if __name__ == "__main__":
    asyncio.run(send_alerts())
