import asyncio
from typing import Set
from service.AIHandler import ai_handler


class AIScheduler:
    """AI调度器"""
    
    def __init__(self):
        self.active_rooms: Set[str] = set()
        self.scheduler_task = None
    
    async def start_scheduler(self):
        """启动调度器"""
        if self.scheduler_task is None:
            self.scheduler_task = asyncio.create_task(self._scheduler_loop())
    
    async def stop_scheduler(self):
        """停止调度器"""
        if self.scheduler_task:
            self.scheduler_task.cancel()
            self.scheduler_task = None
    
    async def add_room(self, room_code: str):
        """添加房间到调度"""
        self.active_rooms.add(room_code)
    
    async def remove_room(self, room_code: str):
        """从调度中移除房间"""
        self.active_rooms.discard(room_code)
    
    async def _scheduler_loop(self):
        """调度循环"""
        while True:
            try:
                for room_code in list(self.active_rooms):
                    await ai_handler.trigger_ai_autonomous_action(room_code)
                
                await asyncio.sleep(30)  # 每30秒检查一次
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"AI调度器异常: {str(e)}")
                await asyncio.sleep(10)

# 全局调度器实例
ai_scheduler = AIScheduler()