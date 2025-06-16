from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data
from utils.game_log_util import game_log_util

class MessageHandler:
    async def handle_private_message(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理私聊消息"""
        try:
            room = await GameRooms.get(room_code=room_code)
            sender = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            recipient_id = data.get("recipient_id")
            recipient = await GamePlayers.get(room=room, user_id=recipient_id).prefetch_related('user')
            
            # 使用工具类记录私聊日志
            await game_log_util.create_private_chat_log(
                room=room,
                sender_player=sender,
                recipient_player=recipient,
                content=data.get("message", "")
            )
            
            # 发送给接收者
            await manager.send_personal_message(create_message(MessageType.PRIVATE_MESSAGE,
                create_formatted_data(
                    message=data.get("message", ""),
                    send_id=user_id,
                    send_nickname=sender.user.nickname,
                    recipient_id=recipient_id,
                    recipient_nickname=recipient.user.nickname
                )
            ), recipient_id)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

    async def handle_player_action(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理玩家行动"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 广播行动给房间内所有用户
            await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_ACTION,
                create_formatted_data(
                    message=f"{player.user.nickname} 执行了行动：{data.get('action', '')}",
                    send_id=user_id,
                    send_nickname=player.user.nickname
                )
            ))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

# 全局消息处理器实例
message_handler = MessageHandler()
