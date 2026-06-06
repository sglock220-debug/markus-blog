import asyncio
import base64
import json
import cv2
import numpy as np
import websockets
import os
from ultralytics import YOLO
from collections import deque

# --- CONFIGURATION FROM ENV ---
TOKEN = os.getenv("YOLO_WORKER_TOKEN", "cyber-yolo-secret-token-2026")
REMOTE_WS_URL = os.getenv("YOLO_REMOTE_WS_URL", "wss://www.izawa2000.com/ws/yolo-worker/")
LOCAL_WS_URL = os.getenv("YOLO_LOCAL_WS_URL", "ws://127.0.0.1:8001/ws/yolo-worker/")

# --- GLOBAL RESOURCES ---
print("Loading YOLO11n model...")
model = YOLO("yolo11n.pt")
print("Model loaded.")

# Async lock to prevent concurrent inference
inference_lock = asyncio.Lock()

# Task deduplication
class TaskCache:
    def __init__(self, size=1000):
        self.cache = set()
        self.history = deque(maxlen=size)
    
    def is_duplicate(self, task_id):
        if not task_id: return False
        if task_id in self.cache:
            return True
        if len(self.history) >= self.history.maxlen:
            oldest = self.history.popleft()
            self.cache.discard(oldest)
        self.cache.add(task_id)
        self.history.append(task_id)
        return False

task_cache = TaskCache()

async def check_remote_available():
    """Check if REMOTE server is available without holding the connection."""
    connector_url = f"{REMOTE_WS_URL.rstrip('/')}/?token={TOKEN}"
    try:
        async with websockets.connect(connector_url, timeout=3) as ws:
            return True
    except:
        return False

async def handle_connection(ws, label):
    """Handle incoming messages and process YOLO tasks."""
    async for message in ws:
        try:
            data = json.loads(message)
            if data.get("type") != "detect":
                continue
            
            task_id = data.get("task_id")
            if task_cache.is_duplicate(task_id):
                continue

            client_channel = data.get("client_channel")
            classes = data.get("classes") or [0]
            conf = data.get("conf", 0.5)

            # Decode image
            img_bytes = base64.b64decode(data["image"])
            arr = np.frombuffer(img_bytes, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            if frame is None:
                raise ValueError("Decoded frame is None")

            h, w = frame.shape[:2]

            # Inference with Lock
            async with inference_lock:
                results = model(frame, conf=conf, classes=classes, verbose=False)

            detections = []
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                score = float(box.conf[0])
                x1, y1, x2, y2 = map(float, box.xyxy[0])
                label_name = model.names.get(cls_id, str(cls_id)).upper()

                detections.append({
                    "label": label_name,
                    "class_id": cls_id,
                    "score": score,
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                })

            # Send result back
            await ws.send(json.dumps({
                "type": "result",
                "task_id": task_id,
                "client_channel": client_channel,
                "detections": detections,
                "width": w,
                "height": h
            }))

        except Exception as e:
            print(f"{label} Error processing task: {e}")
            try:
                if 'task_id' in locals():
                    await ws.send(json.dumps({
                        "type": "result",
                        "task_id": task_id,
                        "client_channel": data.get("client_channel"),
                        "error": str(e),
                        "detections": [],
                        "width": 0, "height": 0
                    }))
            except: pass

async def remote_check_task(local_ws_task):
    """Background task to check REMOTE availability when LOCAL is active."""
    while not local_ws_task.done():
        await asyncio.sleep(10)
        # print("[LOCAL] Checking whether REMOTE is available...")
        if await check_remote_available():
            print("[REMOTE] Available again")
            local_ws_task.cancel()
            break

async def run_worker():
    print(f"--- YOLO Multi-Server Worker (Remote Priority) ---")
    print(f"REMOTE: {REMOTE_WS_URL}")
    print(f"LOCAL : {LOCAL_WS_URL}")
    masked_token = f"{'*' * 8}{TOKEN[-4:] if len(TOKEN) > 4 else ''}"
    print(f"Token : {masked_token}")
    print(f"--------------------------------------------------")

    while True:
        # 1. Try REMOTE first
        print("[REMOTE] Connecting...")
        connector_url_remote = f"{REMOTE_WS_URL.rstrip('/')}/?token={TOKEN}"
        try:
            async with websockets.connect(connector_url_remote, max_size=10 * 1024 * 1024) as ws:
                print("[REMOTE] Connected")
                await handle_connection(ws, "[REMOTE]")
        except (websockets.exceptions.ConnectionClosed, Exception) as e:
            if isinstance(e, asyncio.CancelledError): raise
            print(f"[REMOTE] Disconnected or failed: {e}")

        # 2. If REMOTE fails, try LOCAL
        print("[LOCAL] Connecting...")
        connector_url_local = f"{LOCAL_WS_URL.rstrip('/')}/?token={TOKEN}"
        try:
            async with websockets.connect(connector_url_local, max_size=10 * 1024 * 1024) as ws:
                print("[LOCAL] Connected")
                
                # Create the message handling task
                handle_task = asyncio.create_task(handle_connection(ws, "[LOCAL]"))
                # Create the remote check task
                check_task = asyncio.create_task(remote_check_task(handle_task))
                
                try:
                    await handle_task
                except asyncio.CancelledError:
                    print("[LOCAL] Disconnecting due to REMOTE availability...")
                finally:
                    if not check_task.done():
                        check_task.cancel()
                    await ws.close()
                    print("[LOCAL] Disconnected")

        except Exception as e:
            if isinstance(e, asyncio.CancelledError): raise
            print(f"[LOCAL] Connection failed: {e}")
        
        print("Waiting 5 seconds before retrying REMOTE...")
        await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        print("\nWorker stopped by user.")
