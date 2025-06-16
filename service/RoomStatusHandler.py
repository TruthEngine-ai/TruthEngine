from typing import Dict, Any, List, Optional
from model.entity.Scripts import GameRooms, ScriptClues, CharacterStageGoals,ScriptStages
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message

# 导入拆解的构建方法
from .room_status_handler.script_builder import build_script_info
from .room_status_handler.players_builder import build_players_info
from .room_status_handler.characters_builder import build_characters_info, build_detailed_characters_info
from .room_status_handler.timeline_builder import build_story_timeline_info
from .room_status_handler.stage_builder import build_stage_info
from .room_status_handler.clues_builder import build_clues_info
from .room_status_handler.voting_builder import build_voting_info, build_game_result
from .room_status_handler.search_builder import build_searchable_info

class RoomStatusHandler:
    """房间状态处理器"""
    
    async def send_room_status(self, room_code: str, user_id: int):
        """发送房间当前状态给指定用户"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related(
                'script', 'host_user', 'players__user', 'players__character', 'current_stage'
            )
            
            # 构建基础房间信息
            base_room_info = {
                "code": room.room_code,
                "status": room.status,
                "max_players": room.max_players,
                "host_user_id": room.host_user_id,
                "ai_dm_personality": room.ai_dm_personality,
                "game_settings": room.game_setting,
                "started_at": room.started_at.isoformat() if room.started_at else None,
                "finished_at": room.finished_at.isoformat() if room.finished_at else None
            }
            
            # 根据房间状态组装不同的数据
            room_status_data = await self._build_room_status_by_phase(room, base_room_info, user_id)

            await manager.send_personal_message(
                create_message(MessageType.ROOM_STATUS, room_status_data), 
                user_id
            )
            
        except Exception as e:
            print(f"获取房间状态失败: {str(e)}")
            await manager.send_personal_message(
                create_error_message(f"获取房间状态失败: {str(e)}"),
                user_id
            )
    
    async def broadcast_room_status(self, room_code: str):
        """向房间内所有用户广播房间状态"""
        try:
            connected_users = manager.get_room_users(room_code)
            for user_id in connected_users:
                await self.send_room_status(room_code, user_id)
        except Exception as e:
            print(f"广播房间状态失败: {str(e)}")
    
    async def _build_room_status_by_phase(self, room: GameRooms, base_info: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        """根据房间阶段构建不同的状态数据"""
        status_data = {
            "room": base_info,
            "script": await build_script_info(room.script) if room.script else None
        }
        
        if room.status == "等待中":
            # 等待中阶段：返回基础房间信息和玩家信息
            status_data["players"] = await build_players_info(room)
            
        elif room.status == "生成剧本中":
            # 生成剧本中：返回基础房间信息和玩家信息
            status_data["players"] = await build_players_info(room)
            
        elif room.status == "选择角色":
            # 选择角色阶段：返回角色信息和玩家信息
            status_data["players"] = await build_players_info(room)
            status_data["characters"] = await build_characters_info(room)
            
        elif room.status == "进行中":
            # 进行中阶段：返回完整的游戏信息
            status_data["players"] = await build_players_info(room)
            status_data["story_timeline"] = await build_story_timeline_info(room.script, user_id, room)
            status_data["characters"] = await build_detailed_characters_info(room, user_id)
            status_data["current_stage"] = await build_stage_info(room, user_id)
            status_data["clues"] = await build_clues_info(room, user_id)
            
        elif room.status == "搜证中":
            # 搜证阶段：返回搜证相关信息
            status_data["players"] = await build_players_info(room)
            status_data["story_timeline"] = await build_story_timeline_info(room.script, user_id, room)
            status_data["characters"] = await build_detailed_characters_info(room, user_id)
            status_data["current_stage"] = await build_stage_info(room, user_id)
            status_data["search_info"] = await build_searchable_info(room, user_id)

        elif room.status == "投票中":
            # 投票阶段：返回投票相关信息
            status_data["players"] = await build_players_info(room)
            status_data["characters"] = await build_detailed_characters_info(room, user_id)
            status_data["story_timeline"] = await build_story_timeline_info(room.script, user_id, room)
            status_data["voting_info"] = await build_voting_info(room)
            
        elif room.status in ["已结束"]:
            # 结束阶段：返回结果信息
            status_data["players"] = await build_players_info(room)
            status_data["story_timeline"] = await build_story_timeline_info(room.script, user_id, room)
            status_data["characters"] = await build_detailed_characters_info(room, user_id)
            status_data["current_stage"] = await build_stage_info(room, user_id)
            status_data["clues"] = await build_clues_info(room, user_id)
            status_data["solution"] = room.script.solution
        
        return status_data

# 全局房间状态处理器实例
room_status_handler = RoomStatusHandler()
 
