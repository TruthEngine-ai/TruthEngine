from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class RoomSettingsHandler:
    async def handle_update_room_settings(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理房间设置更新"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以修改房间设置"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status != '等待中':
                await manager.send_personal_message(
                    create_error_message("只能在等待中状态修改房间设置"), 
                    user_id
                )
                return
            
            # 更新游戏设置
            current_settings = room.game_setting or {}
            
            if "theme" in data and data["theme"] is not None:
                current_settings["theme"] = data["theme"]
            if "difficulty" in data and data["difficulty"] is not None:
                current_settings["difficulty"] = data["difficulty"]
            if "ai_dm_personality" in data and data["ai_dm_personality"] is not None:
                current_settings["ai_dm_personality"] = data["ai_dm_personality"]
                room.ai_dm_personality = data["ai_dm_personality"]
            if "duration_mins" in data and data["duration_mins"] is not None:
                current_settings["duration_mins"] = data["duration_mins"]
            
            room.game_setting = current_settings
            await room.save()
            
            # 广播设置更新给房间内所有用户
            await manager.broadcast_to_room(room_code, create_message(MessageType.ROOM_SETTINGS_UPDATED,
                create_formatted_data(
                    message=f"{player.user.nickname} 更新了房间设置",
                    send_id=user_id,
                    send_nickname=player.user.nickname
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

# 全局房间设置处理器实例
room_settings_handler = RoomSettingsHandler()
