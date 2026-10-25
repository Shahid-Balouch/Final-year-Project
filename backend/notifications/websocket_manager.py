import json as _json
import threading


class ConnectionManager:
    """Singleton WebSocket connection manager for real-time notification broadcasting."""

    def __init__(self):
        self.active_connections = []
        self._lock = threading.Lock()

    async def connect(self, websocket):
        await websocket.accept()
        with self._lock:
            self.active_connections.append(websocket)

    def disconnect(self, websocket):
        with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send a message to all connected WebSocket clients."""
        with self._lock:
            conns = list(self.active_connections)
        dead = []
        for ws in conns:
            try:
                await ws.send_text(_json.dumps(message, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_to_owner(self, message: dict):
        """Alias for broadcast — sends to all connected owners."""
        await self.broadcast(message)


manager = ConnectionManager()
