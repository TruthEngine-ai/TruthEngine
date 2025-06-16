from model.ws.notification_types import MessageType, create_message, create_formatted_data
from websocket.connection_manager import manager
from utils.game_log_util import game_log_util
from typing import Dict, Any, List

class AIResponseExecutor:
    """AI响应执行器"""
    
    async def execute_response(self, ai_player, decision: Dict[str, Any], room):
        """执行AI响应"""
        action_type = decision.get("action_type")
        
        if action_type == "回应私聊":
            await self._execute_private_chat(ai_player, decision, room)
        elif action_type == "主动聊天":
            await self._execute_public_chat(ai_player, decision, room)
        elif action_type == "搜证":
            await self._execute_search(ai_player, decision, room)
        elif action_type == "公开线索":
            await self._execute_reveal_clue(ai_player, decision, room)
    
    async def _execute_private_chat(self, ai_player, decision: Dict[str, Any], room):
        """执行私聊"""
        content = decision.get("content", "")
        recipient_id = decision.get("recipient_id")
        
        # 记录日志
        await game_log_util.create_private_chat_log(
            room=room,
            sender_player=ai_player,
            recipient_user_id=recipient_id,
            content=content
        )
        
        # 发送消息给接收者
        await manager.send_personal_message(
            create_message(MessageType.PRIVATE_MESSAGE, create_formatted_data(
                message=content,
                send_id=ai_player.user_id,
                send_nickname=ai_player.user.nickname,
                recipient_id=recipient_id
            )),
            recipient_id
        )