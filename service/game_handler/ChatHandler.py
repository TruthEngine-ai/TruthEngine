from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class ChatHandler:
    async def handle_chat(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理聊天消息"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user','character')
            
            # 广播消息给房间内所有用户
            nickname = player.character.name+f"({player.user.nickname})" if player.character else player.user.nickname
            await manager.broadcast_to_room(room_code, create_message(MessageType.CHAT,
                create_formatted_data(
                    message=data.get("message", ""),
                    send_id=user_id,
                    send_nickname=nickname
                )
            ))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

# 全局聊天处理器实例
chat_handler = ChatHandler()
