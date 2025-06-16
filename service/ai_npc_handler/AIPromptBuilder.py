from typing import Dict, Any, List
from model.entity.Scripts import GameRooms, GamePlayers, GameLogs, ScriptClues

class AIPromptBuilder:
    """AI提示词构建器"""
    
    async def build_context(self, ai_player: GamePlayers, room: GameRooms, 
                           message_data: Dict[str, Any]) -> Dict[str, Any]:
        """构建AI决策上下文"""
        context = {
            "game_info": await self._build_game_info(room),
            "character_info": await self._build_character_info(ai_player),
            "players_info": await self._build_players_info(room),
            "recent_messages": await self._build_recent_messages(room),
            "current_clues": await self._build_current_clues(ai_player, room),
            "trigger_message": message_data,
            "ai_state": ai_player.ai_state or {}
        }
        return context
    
    async def build_autonomous_context(self, ai_player: GamePlayers, room: GameRooms) -> Dict[str, Any]:
        """构建自主行动上下文"""
        context = {
            "game_info": await self._build_game_info(room),
            "character_info": await self._build_character_info(ai_player),
            "players_info": await self._build_players_info(room),
            "recent_messages": await self._build_recent_messages(room),
            "current_clues": await self._build_current_clues(ai_player, room),
            "ai_state": ai_player.ai_state or {},
            "stage_goals": await self._build_stage_goals(ai_player, room)
        }
        return context
    
    async def _build_game_info(self, room: GameRooms) -> Dict[str, Any]:
        """构建游戏信息"""
        return {
            "status": room.status,
            "current_stage": room.current_stage.name if room.current_stage else None,
            "stage_goal": room.current_stage.stage_goal if room.current_stage else None,
            "script_title": room.script.title if room.script else None,
            "script_description": room.script.description if room.script else None
        }
    
    async def _build_character_info(self, ai_player: GamePlayers) -> Dict[str, Any]:
        """构建角色信息"""
        if not ai_player.character:
            return {}
            
        character = ai_player.character
        
        # 获取角色的当前阶段目标
        stage_goals = []
        if hasattr(character, 'stage_goals'):
            stage_goals = [
                {
                    "goal": goal.goal_description,
                    "is_mandatory": goal.is_mandatory,
                    "search_attempts": goal.search_attempts
                }
                for goal in character.stage_goals
            ]
        
        return {
            "name": character.name,
            "gender": character.gender,
            "is_murderer": character.is_murderer,
            "backstory": character.backstory,
            "public_info": character.public_info,
            "stage_goals": stage_goals
        }
    
    async def _build_players_info(self, room: GameRooms) -> List[Dict[str, Any]]:
        """构建玩家信息"""
        players_info = []
        for player in room.players:
            if player.is_alive:
                info = {
                    "user_id": player.user_id,
                    "nickname": player.user.nickname,
                    "character_name": player.character.name if player.character else None,
                    "is_npc": player.is_npc,
                    "is_ready": player.is_ready
                }
                players_info.append(info)
        return players_info
    
    async def _build_recent_messages(self, room: GameRooms, limit: int = 10) -> List[Dict[str, Any]]:
        """构建最近消息"""
        recent_logs = await GameLogs.filter(room=room).order_by('-timestamp').limit(limit).prefetch_related(
            'sender_game_player__user', 'recipient_game_player__user'
        )
        
        messages = []
        for log in reversed(recent_logs):
            message = {
                "type": log.message_type,
                "content": log.content,
                "sender": log.send_nickname or "系统",
                "timestamp": log.timestamp.isoformat(),
                "is_private": log.message_type == "私聊"
            }
            messages.append(message)
        
        return messages
    
    async def _build_current_clues(self, ai_player: GamePlayers, room: GameRooms) -> List[Dict[str, Any]]:
        """构建当前可用线索"""
        if not room.script:
            return []
            
        # 获取当前阶段可发现的线索
        current_stage = room.current_stage
        available_clues = await ScriptClues.filter(
            script=room.script,
            discovery_stage=current_stage
        )
        
        clues_info = []
        for clue in available_clues:
            clue_info = {
                "id": clue.id,
                "name": clue.name,
                "description": clue.description,
                "discovery_location": clue.discovery_location,
                "is_public": clue.is_public,
                "character_related": clue.character_id == ai_player.character_id if ai_player.character else False
            }
            clues_info.append(clue_info)
        
        return clues_info
    
    async def _build_stage_goals(self, ai_player: GamePlayers, room: GameRooms) -> List[Dict[str, Any]]:
        """构建阶段目标"""
        if not ai_player.character or not room.current_stage:
            return []
            
        from model.entity.Scripts import CharacterStageGoals
        goals = await CharacterStageGoals.filter(
            character=ai_player.character,
            stage=room.current_stage
        )
        
        return [
            {
                "description": goal.goal_description,
                "is_mandatory": goal.is_mandatory,
                "search_attempts": goal.search_attempts
            }
            for goal in goals
        ]
        