import asyncio
import base64
import json
import cv2
import numpy as np
import websockets
import os
from ultralytics import YOLO

# --- CONFIGURATION ---
# Replace with your actual server IP or domain
SERVER_IP = "118.178.236.60" # Example IP, adjust to your actual server
TOKEN = "cyber-yolo-secret-token-2026" # Must match YOLO_WORKER_TOKEN in settings.py
SERVER_WS = f"ws://{SERVER_IP}/ws/yolo-worker/?token={TOKEN}"

print("Loading YOLO11n model...")
model = YOLO("yolo11n.pt")
print("Model loaded.")

async def main():
    print(f"Connecting to {SERVER_WS}...")
    try:
        async with websockets.connect(SERVER_WS, max_size=10 * 1024 * 1024) as ws:
            print("YOLO worker connected to server.")

            async for message in ws:
                data = json.loads(message)

                if data.get("type") != "detect":
                    continue

                task_id = data["task_id"]
                classes = data.get("classes") or [0]
                conf = data.get("conf", 0.5)

                # Decode image
                try:
                    img_bytes = base64.b64decode(data["image"])
                    arr = np.frombuffer(img_bytes, dtype=np.uint8)
                    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

                    if frame is None:
                        raise ValueError("Decoded frame is None")

                    h, w = frame.shape[:2]

                    # Inference
                    results = model(frame, conf=conf, classes=classes, verbose=False)

                    detections = []
                    for box in results[0].boxes:
                        cls_id = int(box.cls[0])
                        score = float(box.conf[0])
                        x1, y1, x2, y2 = map(float, box.xyxy[0])
                        label = model.names.get(cls_id, str(cls_id)).upper()

                        detections.append({
                            "label": label,
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
                        "detections": detections,
                        "width": w,
                        "height": h
                    }))
                    # print(f"Task {task_id} processed: {len(detections)} targets found.")

                except Exception as e:
                    print(f"Error processing task {task_id}: {e}")
                    await ws.send(json.dumps({
                        "type": "result",
                        "task_id": task_id,
                        "error": str(e),
                        "detections": [],
                        "width": 0,
                        "height": 0
                    }))

    except Exception as e:
        print(f"Connection error: {e}")
        print("Retrying in 5 seconds...")
        await asyncio.sleep(5)
        await main()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Worker stopped by user.")
