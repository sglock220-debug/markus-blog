import asyncio
import base64
import json
import cv2
import numpy as np
import websockets
import os
import signal
from ultralytics import YOLO
from collections import deque

# --- CONFIGURATION FROM ENV ---
TOKEN = os.getenv("YOLO_WORKER_TOKEN", "cyber-yolo-secret-token-2026")
LOCAL_WS_URL = os.getenv("YOLO_LOCAL_WS_URL", "ws://127.0.0.1:8001/ws/yolo-worker/")
REMOTE_WS_URL = os.getenv("YOLO_REMOTE_WS_URL", "wss://www.izawa2000.com/ws/yolo-worker/")

ENABLE_LOCAL = os.getenv("YOLO_ENABLE_LOCAL", "true").lower() == "true"
ENABLE_REMOTE = os.getenv("YOLO_ENABLE_REMOTE", "true").lower() == "true"

# --- GLOBAL RESOURCES ---
print("Loading YOLO11n model...")
model = YOLO("yolo11n.pt")
print("Model loaded.")

# Async lock to prevent concurrent inference (thread-safety/VRAM safety)
inference_lock = asyncio.Lock()

# Better deduplication helper
class TaskCache:
    def __init__(self, size=1000):
        self.cache = set()
        self.history = deque(maxlen=size)
    
    def is_duplicate(self, task_id):
        if task_id in self.cache:
            return True
        if len(self.history) >= self.history.maxlen:
            oldest = self.history.popleft()
            self.cache.discard(oldest)
        self.cache.add(task_id)
        self.history.append(task_id)
        return False

task_cache = TaskCache()

async def worker_loop(label, url):
    # Mask token for logging
    masked_url = url
    if "token=" in url:
        # If token was in URL, mask it. But here we append it.
        pass
    
    # Standardize URL with token
    connector_url = f"{url.rstrip('/')}/?token={TOKEN}"
    
    print(f"{label} Target URL: {url}")
    
    while True:
        try:
            print(f"{label} Connecting...")
            async with websockets.connect(connector_url, max_size=10 * 1024 * 1024) as ws:
                print(f"{label} Connected")
                
                async for message in ws:
                    try:
                        data = json.loads(message)
                        if data.get("type") != "detect":
                            continue
                        
                        task_id = data.get("task_id")
                        if not task_id:
                            continue
                        
                        # Deduplication check
                        if task_cache.is_duplicate(task_id):
                            # print(f"{label} Skipping duplicate task {task_id}")
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

                        # Send result back to the same WebSocket
                        await ws.send(json.dumps({
                            "type": "result",
                            "task_id": task_id,
                            "client_channel": client_channel,
                            "detections": detections,
                            "width": w,
                            "height": h
                        }))
                        # print(f"{label} Task {task_id} processed")

                    except Exception as e:
                        print(f"{label} Error processing task: {e}")
                        # Try to send error result if possible
                        try:
                            if 'task_id' in locals():
                                await ws.send(json.dumps({
                                    "type": "result",
                                    "task_id": task_id,
                                    "client_channel": data.get("client_channel"),
                                    "error": str(e),
                                    "detections": [],
                                    "width": 0,
                                    "height": 0
                                }))
                        except:
                            pass

        except Exception as e:
            print(f"{label} Connection error: {e}")
            print(f"{label} Retrying in 5 seconds...")
            await asyncio.sleep(5)

async def main():
    print(f"--- YOLO Multi-Worker Startup ---")
    print(f"LOCAL  Enabled: {ENABLE_LOCAL}")
    print(f"REMOTE Enabled: {ENABLE_REMOTE}")
    # Don't print token for security
    print(f"Token: {'*' * 8}{TOKEN[-4:] if len(TOKEN) > 4 else ''}")
    print(f"---------------------------------")

    tasks = []
    if ENABLE_LOCAL:
        tasks.append(worker_loop("[LOCAL]", LOCAL_WS_URL))
    
    if ENABLE_REMOTE:
        tasks.append(worker_loop("[REMOTE]", REMOTE_WS_URL))

    if not tasks:
        print("No workers enabled. Exiting.")
        return

    # Run both loops
    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        print("\nTasks cancelled.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nWorker stopped by user (Ctrl+C).")
