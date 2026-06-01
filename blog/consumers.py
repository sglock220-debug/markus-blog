import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

# Global state to keep track of active workers and clients
active_workers = {}

class YoloWorkerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope.get('query_string', b'').decode()
        params = dict(x.split('=') for x in query_string.split('&') if '=' in x)
        token = params.get('token')

        if token != settings.YOLO_WORKER_TOKEN:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add("yolo_workers", self.channel_name)
        active_workers[self.channel_name] = self
        await self.accept()
        print(f"YOLO Worker connected: {self.channel_name}")

    async def disconnect(self, close_code):
        if self.channel_name in active_workers:
            del active_workers[self.channel_name]
        await self.channel_layer.group_discard("yolo_workers", self.channel_name)
        print(f"YOLO Worker disconnected: {self.channel_name}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get("type") == "result":
            # Forward the result to the specific client that requested it
            client_channel = data.get("client_channel")
            task_id = data.get("task_id")
            
            # Also support the old HTTP view future signaling
            from .views import task_results
            if task_id and task_id in task_results:
                future = task_results[task_id]
                if not future.done():
                    future.set_result(data)

            if client_channel:
                await self.channel_layer.send(
                    client_channel,
                    {
                        "type": "task_result",
                        "data": data
                    }
                )

    async def send_task(self, event):
        await self.send(text_data=json.dumps(event["data"]))

class YoloClientConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        print(f"YOLO Client connected: {self.channel_name}")

    async def disconnect(self, close_code):
        print(f"YOLO Client disconnected: {self.channel_name}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get("type") == "detect":
                # Add this client's channel name to the task
                data["client_channel"] = self.channel_name
                
                # Check if workers are available
                if not active_workers:
                    await self.send(text_data=json.dumps({
                        "type": "error",
                        "error": "YOLO worker offline"
                    }))
                    return

                # Forward to workers
                await self.channel_layer.group_send(
                    "yolo_workers",
                    {
                        "type": "send_task",
                        "data": data
                    }
                )
        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "error": str(e)
            }))

    async def task_result(self, event):
        # Send result back to the browser
        await self.send(text_data=json.dumps(event["data"]))
