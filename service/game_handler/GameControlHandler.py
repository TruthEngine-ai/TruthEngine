from typing import Dict, Any
from datetime import datetime
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class GameControlHandler:
    async def handle_start_game(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理开始游戏"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related('script__stages')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以开始游戏"), 
                    user_id
                )
                return
            
            # 检查游戏是否可以开始
            all_players = await GamePlayers.filter(room=room,is_npc = False).prefetch_related('character')
            if not all(p.is_ready and p.character for p in all_players):
                await manager.send_personal_message(
                    create_error_message("还有玩家未准备好或未选择角色"), 
                    user_id
                )
                return
            
            # 开始游戏
            room.status = "进行中"
            room.started_at = datetime.now()
            
            # 设置当前阶段为第一阶段
            first_stage = await room.script.stages.filter(stage_number=1).first()
            if first_stage:
                room.current_stage = first_stage
            
            await room.save()
            
            # 通知所有玩家游戏开始
            await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_STARTED,
                create_formatted_data(
                    message=f"游戏开始！当前阶段：{first_stage.name if first_stage else '游戏开始'}",
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

    async def handle_next_stage(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理进入下一阶段"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related('script__stages', 'current_stage')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以切换游戏阶段"), 
                    user_id
                )
                return
            
            # 检查游戏状态
            if room.status != "进行中":
                await manager.send_personal_message(
                    create_error_message("游戏未在进行中"), 
                    user_id
                )
                return
            
            if not room.current_stage:
                await manager.send_personal_message(
                    create_error_message("当前阶段信息异常"), 
                    user_id
                )
                return
            
            # 获取下一阶段
            next_stage_number = room.current_stage.stage_number + 1
            next_stage = await room.script.stages.filter(stage_number=next_stage_number).first()
            
            if not next_stage:
                # 没有下一阶段，游戏结束
                room.status = "投票中"
                await room.save()
                
                await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_PHASE_CHANGED,
                    create_formatted_data(
                        message="所有阶段已完成，进入最终投票阶段！",
                        send_id=None,
                        send_nickname="系统"
                    )
                ))
            else:
                # 切换到下一阶段
                room.current_stage = next_stage
                await room.save()
                
                await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_PHASE_CHANGED,
                    create_formatted_data(
                        message=f"进入新阶段：{next_stage.name}",
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

# 全局游戏控制处理器实例
game_control_handler = GameControlHandler()
