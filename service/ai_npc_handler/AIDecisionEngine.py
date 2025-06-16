import json
import random
from typing import Dict, Any, Optional
from model.entity.Scripts import AIInteractions

class AIDecisionEngine:
    """AI决策引擎"""
    
    async def make_decision(self, ai_player,room,trigger_player_id, context: Dict[str, Any]) -> Dict[str, Any]:
        """基于上下文做出决策"""
        trigger_message = context.get("trigger_message", {})
        message_type = trigger_message.get("type")
        
        
        
        decision = {"action_type": "无行动", "should_act": False}
        if message_type == "private_message":
            decision=  await self._decide_private_chat_response(ai_player, context)
        elif message_type == "chat":
            decision=  await self._decide_public_chat_response(ai_player, context)
        else:
            decision=  {"action_type": "无行动", "should_act": False}
                    # 记录交互
                    
        interaction = await AIInteractions.create(
            room=room,
            ai_player=ai_player,
            trigger_player_id=trigger_player_id,
            interaction_type=decision.get("action_type"),
            context_data=context,
            ai_response=decision
        )
        return decision
    
    async def make_autonomous_decision(self, ai_player, context: Dict[str, Any]) -> Dict[str, Any]:
        """自主决策"""
        game_status = context.get("game_info", {}).get("status")
        
        if game_status == "进行中":
            return await self._decide_autonomous_action(ai_player, context)
        elif game_status == "搜证中":
            return await self._decide_search_action(ai_player, context)
        elif game_status == "投票中":
            return await self._decide_vote_action(ai_player, context)
        
        return {"action_type": "无行动", "should_act": False}
    
    async def _decide_private_chat_response(self, ai_player, context: Dict[str, Any]) -> Dict[str, Any]:
        """决策私聊回应"""
        trigger_message = context.get("trigger_message", {})
        message_content = trigger_message.get("data", {}).get("message", "")
        
        # 简化的回应逻辑
        responses = [
            "我明白你的意思。",
            "这个信息很有趣...",
            "我需要仔细考虑一下。",
            "你觉得这和案件有什么关系？"
        ]
        
        return {
            "action_type": "回应私聊",
            "should_act": True,
            "content": random.choice(responses),
            "recipient_id": trigger_message.get("data", {}).get("sender_id")
        }
