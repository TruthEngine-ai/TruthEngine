from typing import Dict, List, Optional
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime
from model.ws.notification_types import MessageType, create_message, create_formatted_data
from model.entity.Scripts import Users as UserModel

class ConnectionManager:
    def __init__(self):
        # 房间连接映射 {room_code: {user_id: websocket}}
        self.room_connections: Dict[str, Dict[int, WebSocket]] = {}
        # 用户房间映射 {user_id: room_code}
        self.user_rooms: Dict[int, str] = {}

    async def register_connection(self, websocket: WebSocket, room_code: str, user_id: int):
        """注册用户连接到房间（不调用accept）"""
        user = await UserModel.filter(id=user_id, is_active=True).first()
        if room_code not in self.room_connections:
            self.room_connections[room_code] = {}
        
        self.room_connections[room_code][user_id] = websocket
        self.user_rooms[user_id] = room_code
        
        # 通知房间内其他用户有新用户加入
        await self.broadcast_to_room(room_code, create_message(MessageType.PLAYER_JOINED, 
            create_formatted_data(
                message=f"{user.nickname} 加入了房间",
                send_id=None,
                send_nickname="系统"
            )
        ), exclude_user=user_id)
        
        # 广播房间状态更新
        await self._broadcast_room_status_after_delay(room_code)

    async def connect(self, websocket: WebSocket, room_code: str, user_id: int):
        """用户连接到房间（兼容旧接口，包含accept调用）"""
        await websocket.accept()
        await self.register_connection(websocket, room_code, user_id)

    async def disconnect(self, user_id: int):
        """用户断开连接"""
        if user_id in self.user_rooms:
            room_code = self.user_rooms[user_id]
            
            if room_code in self.room_connections and user_id in self.room_connections[room_code]:
                del self.room_connections[room_code][user_id]
                
                # 如果房间没有连接了，删除房间
                if not self.room_connections[room_code]:
                    del self.room_connections[room_code]
                else:
                    user = await UserModel.filter(id=user_id, is_active=True).first()
                    # 通知房间内其他用户有用户离开
                    await self.broadcast_to_room(room_code, create_message(MessageType.PLAYER_LEFT,
                        create_formatted_data(
                            message=f"用户 {user.nickname} 离线",
                            send_id=None,
                            send_nickname="系统"
                        )
                    ))
                    
                    # 广播房间状态更新
                    await self._broadcast_room_status_after_delay(room_code)
            
            del self.user_rooms[user_id]

    async def _broadcast_room_status_after_delay(self, room_code: str):
        """延迟广播房间状态（避免循环导入）"""
        async def delayed_broadcast():
            await asyncio.sleep(0.1)  # 短暂延迟确保数据库操作完成
            try:
                from service.RoomStatusHandler import room_status_handler
                await room_status_handler.broadcast_room_status(room_code)
            except Exception as e:
                print(f"延迟广播房间状态失败: {str(e)}")
        
        # 创建异步任务
        asyncio.create_task(delayed_broadcast())

    async def send_personal_message(self, message: dict, user_id: int):
        """发送个人消息"""
        if user_id in self.user_rooms:
            room_code = self.user_rooms[user_id]
            if room_code in self.room_connections and user_id in self.room_connections[room_code]:
                websocket = self.room_connections[room_code][user_id]
                try:
                    await websocket.send_text(json.dumps(message, ensure_ascii=False))
                except:
                    # 连接已断开，清理
                    await self.disconnect(user_id)

    async def broadcast_to_room(self, room_code: str, message: dict, exclude_user: Optional[int] = None):
        """向房间内所有用户广播消息"""
        if room_code in self.room_connections:
            disconnected_users = []
            
            for user_id, websocket in self.room_connections[room_code].items():
                if exclude_user and user_id == exclude_user:
                    continue
                    
                try:
                    await websocket.send_text(json.dumps(message, ensure_ascii=False))
                except:
                    # 连接已断开，记录待清理的用户
                    disconnected_users.append(user_id)
            
            # 清理断开的连接
            for user_id in disconnected_users:
                await self.disconnect(user_id)


    def get_room_users(self, room_code: str) -> List[int]:
        """获取房间内的用户列表"""
        if room_code in self.room_connections:
            return list(self.room_connections[room_code].keys())
        return []

    def is_user_connected(self, user_id: int) -> bool:
        """检查用户是否在线"""
        return user_id in self.user_rooms

# 全局连接管理器实例
manager = ConnectionManager()
