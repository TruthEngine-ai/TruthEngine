from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class ReadyHandler:
    async def handle_ready(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理准备状态"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            player.is_ready = data.get("ready", False)
            await player.save()
            
            # 通知房间内所有用户
            ready_status = "准备就绪" if player.is_ready else "取消准备"
            await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_READY,
                create_formatted_data(
                    message=f"{player.user.nickname} {ready_status}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
            # 检查是否所有玩家都准备好了
            all_players = await GamePlayers.filter(room=room).prefetch_related('character')
            all_ready = all(p.is_ready and p.character for p in all_players)
            
            if all_ready and len(all_players) >= room.script.player_count_min:
                await manager.broadcast_to_room(room_code, create_message(MessageType.ALL_READY,
                    create_formatted_data(
                        message="所有玩家已准备就绪，可以开始游戏！",
                        send_id=None,
                        send_nickname="系统"
                    )
                ))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

# 全局准备处理器实例
ready_handler = ReadyHandler()
