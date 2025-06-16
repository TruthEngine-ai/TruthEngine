import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers, AIConfig, AIInteractions, ScriptClues
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_formatted_data
from utils.game_log_util import game_log_util
from .ai_npc_handler.AIPromptBuilder import AIPromptBuilder
from .ai_npc_handler.AIDecisionEngine import AIDecisionEngine
from .ai_npc_handler.AIResponseExecutor import AIResponseExecutor

class AIHandler:
    """AI NPC处理器"""
    
    def __init__(self):
        self.prompt_builder = AIPromptBuilder()
        self.decision_engine = AIDecisionEngine()
        self.response_executor = AIResponseExecutor()
    
    async def handle_player_message(self, room_code: str, sender_id: int, message_data: Dict[str, Any]):
        """处理玩家消息，触发AI响应"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related(
                'players__user', 'players__character', 'script', 'current_stage','players__aiconfig'
            )
            
            # 获取房间中的AI玩家
            ai_players = [p for p in room.players if p.is_npc and p.is_alive]
            
            for ai_player in ai_players:
                # 判断是否需要响应
                should_respond = await self._should_ai_respond(
                    ai_player, sender_id, message_data, room
                )
                
                if should_respond:
                    await self._generate_ai_response(ai_player, sender_id, message_data, room)
                    
        except Exception as e:
            print(f"AI处理玩家消息失败: {str(e)}")
    
    async def _should_ai_respond(self, ai_player: GamePlayers, sender_id: int, 
                                message_data: Dict[str, Any], room: GameRooms) -> bool:
        """判断AI是否应该响应"""
        message_type = message_data.get("type")
        
        # 私聊消息必须响应
        if message_type == MessageType.PRIVATE_MESSAGE.value:
            data = message_data.get("data", {})
            if data.get("recipient_id") == ai_player.user_id:
                return True
        
        # 公共聊天随机响应或关键词触发
        if message_type == MessageType.CHAT.value:
            # 基于AI性格决定响应概率
            import random
            return ai_player.aiconfig.respond_probability > random.random()
        return False
    
    async def _generate_ai_response(self, ai_player: GamePlayers, trigger_player_id: int,
                                  message_data: Dict[str, Any], room: GameRooms):
        """生成AI响应"""
        try:
            # 构建上下文
            context = await self.prompt_builder.build_context(ai_player, room, message_data)
            
            # AI决策
            decision = await self.decision_engine.make_decision(ai_player,room, trigger_player_id,context)
            
            # 执行响应
            await self.response_executor.execute_response(ai_player, decision, room)
            
        except Exception as e:
            print(f"生成AI响应失败: {str(e)}")
    
    async def trigger_ai_autonomous_action(self, room_code: str):
        """触发AI自主行动"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related(
                'players__user', 'players__character', 'script', 'current_stage'
            )
            ai_players = [p for p in room.players if p.is_npc and p.is_alive]
            
            for ai_player in ai_players:
                # 检查是否需要自主行动
                if await self._should_ai_act_autonomously(ai_player, room):
                    context = await self.prompt_builder.build_autonomous_context(ai_player, room)
                    decision = await self.decision_engine.make_decision(ai_player,room,None, context)
                    
                    if decision.get("should_act"):
                        await self.response_executor.execute_response(ai_player, decision, room)
                        
        except Exception as e:
            print(f"AI自主行动失败: {str(e)}")
    
    async def _should_ai_act_autonomously(self, ai_player: GamePlayers, room: GameRooms) -> bool:
        """判断AI是否应该自主行动"""
        try:
            # 获取AI玩家最后一次交互记录
            last_interaction = await AIInteractions.filter(
                ai_player=ai_player
            ).order_by('-created_at').first()
            
            if not last_interaction:
                return True
            
            # 计算时间差
            time_diff = datetime.now() - last_interaction.created_at
            
            # 获取AI配置的响应间隔时间（秒）
            response_interval = ai_player.aiconfig.response_interval if ai_player.aiconfig else 90
            
            # 判断是否满足时间间隔
            return time_diff.total_seconds() >= response_interval
            
        except Exception as e:
            print(f"判断AI自主行动失败: {str(e)}")
            return False
    


# 全局AI处理器实例
ai_handler = AIHandler()