from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers, ScriptCharacters
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class CharacterHandler:
    async def handle_select_character(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理角色选择"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            character_id = data.get("character_id")
            
            if character_id:
                # 检查角色是否已被选择
                existing_player = await GamePlayers.filter(
                    room=room, character_id=character_id
                ).first()
                
                if existing_player and existing_player.user_id != user_id:
                    await manager.send_personal_message(
                        create_error_message("该角色已被其他玩家选择"), 
                        user_id
                    )
                    return
                
                # 分配角色
                character = await ScriptCharacters.get(id=character_id)
                player.character = character
                await player.save()
                
                # 通知房间内所有用户
                await manager.broadcast_to_room(room_code, create_message(MessageType.CHARACTER_SELECTED,
                    create_formatted_data(
                        message=f"玩家{player.user.nickname}  选择了角色：{character.name}",
                        send_id=None,
                        send_nickname="系统"
                    )
                ))
                
                # 广播房间状态更新
                from ..RoomStatusHandler import room_status_handler
                await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间、用户或角色不存在"), 
                user_id
            )

# 全局角色处理器实例
character_handler = CharacterHandler()
