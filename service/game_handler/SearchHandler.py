from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class SearchHandler:
    async def handle_search_begin(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理开始搜证"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related('script__stages')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以开始搜证"), 
                    user_id
                )
                return
            
            # 开始搜证
            room.status = "搜证中"
            await room.save()
            
            # 通知所有玩家搜证开始
            await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_STARTED,
                create_formatted_data(
                    message=f"搜证开始！",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间不存在"), 
                user_id
            )

    async def handle_search_end(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理结束搜证"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related('script__stages')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以结束搜证"), 
                    user_id
                )
                return
            
            # 结束搜证
            room.status = "进行中"
            await room.save()
            
            # 通知所有玩家搜证结束
            await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_STARTED,
                create_formatted_data(
                    message=f"搜证结束！",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间不存在"), 
                user_id
            )

# 全局搜证处理器实例
search_handler = SearchHandler()
