import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

# Global state to keep track of the active worker
# For simplicity, we assume one worker. In production, use Redis.
active_workers = {}

class YoloWorkerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Check token in query string
        query_string = self.scope.get('query_string', b'').decode()
        params = dict(x.split('=') for x in query_string.split('&') if '=' in x)
        token = params.get('token')

        if token != settings.YOLO_WORKER_TOKEN:
            await self.close(code=4003) # Forbidden
            return

        self.worker_id = "local-laptop" # Could be dynamic
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
            # Signal the waiting view that the result is ready
            from .views import task_results
            task_id = data.get("task_id")
            if task_id and task_id in task_results:
                future = task_results[task_id]
                if not future.done():
                    future.set_result(data)

    async def send_task(self, event):
        # Called when a task is sent to the 'yolo_workers' group
        await self.send(text_data=json.dumps(event["data"]))
