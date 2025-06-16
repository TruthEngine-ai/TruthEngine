from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers, ScriptClues
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data
from utils.game_log_util import game_log_util

class ClueSearchHandler:
    async def handle_search_script_clue(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理搜查线索"""
        try:
            from model.entity.Scripts import SearchActions, CharacterStageGoals
            
            room = await GameRooms.get(room_code=room_code).prefetch_related('current_stage', 'script')
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user', 'character')
            
            # 检查房间状态
            if room.status != "搜证中":
                await manager.send_personal_message(
                    create_error_message("当前不在搜证阶段"), 
                    user_id
                )
                return
            
            # 检查用户是否有角色
            if not player.character:
                await manager.send_personal_message(
                    create_error_message("用户未选择角色"), 
                    user_id
                )
                return
            
            # 获取线索ID
            clue_id = data.get("clue_id")
            if not clue_id:
                await manager.send_personal_message(
                    create_error_message("缺少线索ID"), 
                    user_id
                )
                return
            
            # 验证线索是否存在且属于当前剧本
            try:
                clue = await ScriptClues.get(id=clue_id, script=room.script).prefetch_related('character', 'discovery_stage')
            except DoesNotExist:
                await manager.send_personal_message(
                    create_error_message("线索不存在或不属于当前剧本"), 
                    user_id
                )
                return
            
            # 检查线索是否可在当前阶段搜查
            if clue.discovery_stage and clue.discovery_stage.stage_number > room.current_stage.stage_number:
                await manager.send_personal_message(
                    create_error_message("该线索在当前阶段不可搜查"), 
                    user_id
                )
                return
            
            # 检查用户是否已经搜查过这个线索
            existing_search = await SearchActions.filter(
                game_player=player,
                clues_found=clue
            ).first()
            
            if existing_search:
                await manager.send_personal_message(
                    create_error_message("已经搜查过该线索"), 
                    user_id
                )
                return
            
            # 获取当前用户在当前阶段的搜查次数限制
            stage_goal = await CharacterStageGoals.filter(
                character=player.character,
                stage=room.current_stage
            ).first()
            
            if not stage_goal or stage_goal.search_attempts <= 0:
                await manager.send_personal_message(
                    create_error_message("当前阶段搜查次数已用完"), 
                    user_id
                )
                return
            
            # 找到线索的拥有者
            searchable_player = None
            if clue.character:
                searchable_player = await GamePlayers.filter(
                    room=room,
                    character=clue.character
                ).first()
            
            if not searchable_player:
                await manager.send_personal_message(
                    create_error_message("无法找到线索的拥有者"), 
                    user_id
                )
                return
            
            # 创建搜查记录
            search_action = await SearchActions.create(
                game_player=player,
                searchable_player=searchable_player,
                clues_found=clue,
                is_public=False,
                stage=room.current_stage
            )
            
            # 减少搜查次数
            stage_goal.search_attempts -= 1
            await stage_goal.save()
            
            # 记录搜查日志
            await game_log_util.create_clue_log(
                room=room,
                player=player,
                clue=clue,
                content=f"搜查到线索：{clue.name}"
            )
            
            # 通知用户搜查成功
            await manager.send_personal_message(create_message(MessageType.CLUE_DISCOVERED,
                create_formatted_data(
                    message=f"成功搜查到线索：{clue.name}",
                    send_id=None,
                    send_nickname="系统"
                )
            ), user_id)
            
            # 如果是公开搜查，通知房间内所有用户
            if search_action.is_public:
                await manager.broadcast_to_room(room_code, create_message(MessageType.CLUE_DISCOVERED,
                    create_formatted_data(
                        message=f"{player.user.nickname} 公开搜查到线索：{clue.name}",
                        send_id=None,
                        send_nickname="系统"
                    )
                ), exclude_user=user_id)
            
            # 更新房间状态给当前用户
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.send_room_status(room_code, user_id)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )
        except Exception as e:
            await manager.send_personal_message(
                create_error_message(f"搜查线索失败：{str(e)}"), 
                user_id
            )

# 全局线索搜查处理器实例
clue_search_handler = ClueSearchHandler()
