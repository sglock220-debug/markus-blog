import asyncio
import base64
import json
import cv2
import numpy as np
import websockets
import os
import argparse
from ultralytics import YOLO

# --- CONFIGURATION ---
TOKEN = "cyber-yolo-secret-token-2026" # Must match YOLO_WORKER_TOKEN in settings.py

def get_ws_url():
    parser = argparse.ArgumentParser(description="YOLO Local Worker")
    parser.add_argument("--target", type=str, choices=["local", "ali"], default="local", 
                        help="Target server: 'local' for 127.0.0.1:8001, 'ali' for 118.178.236.60")
    args = parser.parse_args()

    if args.target == "ali":
        server_ip = "118.178.236.60"
        url = f"ws://{server_ip}/ws/yolo-worker/?token={TOKEN}"
    else:
        url = f"ws://127.0.0.1:8001/ws/yolo-worker/?token={TOKEN}"
    
    print(f"--- YOLO Worker Startup ---")
    print(f"Target Mode: {args.target}")
    print(f"Server URL : {url}")
    print(f"---------------------------")
    return url

print("Loading YOLO11n model...")
model = YOLO("yolo11n.pt")
print("Model loaded.")

async def main(server_ws):
    print(f"Connecting to {server_ws}...")
    try:
        async with websockets.connect(server_ws, max_size=10 * 1024 * 1024) as ws:
            print("YOLO worker connected to server.")

            async for message in ws:
                data = json.loads(message)

                if data.get("type") != "detect":
                    continue

                task_id = data["task_id"]
                client_channel = data.get("client_channel")
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
                        "client_channel": client_channel,
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
                        "client_channel": client_channel,
                        "error": str(e),
                        "detections": [],
                        "width": 0,
                        "height": 0
                    }))

    except Exception as e:
        print(f"Connection error: {e}")
        print("Retrying in 5 seconds...")
        await asyncio.sleep(5)
        await main(server_ws)

if __name__ == "__main__":
    ws_url = get_ws_url()
    try:
        asyncio.run(main(ws_url))
    except KeyboardInterrupt:
        print("Worker stopped by user.")
