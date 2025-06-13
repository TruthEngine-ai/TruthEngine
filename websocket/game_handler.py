import json
from typing import Dict, Any
from datetime import datetime
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers, GameLogs, ScriptCharacters
from .connection_manager import manager

class GameHandler:
    async def handle_message(self, websocket, room_code: str, user_id: int, message: Dict[str, Any]):
        """处理游戏消息"""
        message_type = message.get("type")
        
        handlers = {
            "chat": self.handle_chat,
            "select_character": self.handle_select_character,
            "ready": self.handle_ready,
            "start_game": self.handle_start_game,
            "player_action": self.handle_player_action,
            "private_message": self.handle_private_message,
            "game_vote": self.handle_game_vote
        }
        
        handler = handlers.get(message_type)
        if handler:
            await handler(room_code, user_id, message.get("data", {}))
        else:
            await manager.send_personal_message({
                "type": "error",
                "message": f"未知消息类型: {message_type}"
            }, user_id)

    async def handle_chat(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理聊天消息"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 保存聊天记录
            await GameLogs.create(
                room=room,
                sender_game_player=player,
                message_type="公共聊天",
                content=data.get("message", "")
            )
            
            # 广播消息给房间内所有用户
            await manager.broadcast_to_room(room_code, {
                "type": "chat",
                "data": {
                    "user_id": user_id,
                    "nickname": player.user.nickname,
                    "message": data.get("message", ""),
                    "timestamp": datetime.now().isoformat()
                }
            })
            
        except DoesNotExist:
            await manager.send_personal_message({
                "type": "error",
                "message": "房间或用户不存在"
            }, user_id)

    async def handle_select_character(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理角色选择"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id)
            character_id = data.get("character_id")
            
            if character_id:
                # 检查角色是否已被选择
                existing_player = await GamePlayers.filter(
                    room=room, character_id=character_id
                ).first()
                
                if existing_player and existing_player.user_id != user_id:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "该角色已被其他玩家选择"
                    }, user_id)
                    return
                
                # 分配角色
                character = await ScriptCharacters.get(id=character_id)
                player.character = character
                await player.save()
                
                # 通知房间内所有用户
                await manager.broadcast_to_room(room_code, {
                    "type": "character_selected",
                    "data": {
                        "user_id": user_id,
                        "character_id": character_id,
                        "character_name": character.name
                    }
                })
            
        except DoesNotExist:
            await manager.send_personal_message({
                "type": "error",
                "message": "房间、用户或角色不存在"
            }, user_id)

    async def handle_ready(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理准备状态"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id)
            
            player.is_ready = data.get("ready", False)
            await player.save()
            
            # 通知房间内所有用户
            await manager.broadcast_to_room(room_code, {
                "type": "player_ready",
                "data": {
                    "user_id": user_id,
                    "ready": player.is_ready
                }
            })
            
            # 检查是否所有玩家都准备好了
            all_players = await GamePlayers.filter(room=room).prefetch_related('character')
            all_ready = all(p.is_ready and p.character for p in all_players)
            
            if all_ready and len(all_players) >= room.script.player_count_min:
                await manager.broadcast_to_room(room_code, {
                    "type": "all_ready",
                    "data": {"can_start": True}
                })
            
        except DoesNotExist:
            await manager.send_personal_message({
                "type": "error",
                "message": "房间或用户不存在"
            }, user_id)

    async def handle_start_game(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理开始游戏"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related('script__stages')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "只有房主可以开始游戏"
                }, user_id)
                return
            
            # 检查游戏是否可以开始
            all_players = await GamePlayers.filter(room=room).prefetch_related('character')
            if not all(p.is_ready and p.character for p in all_players):
                await manager.send_personal_message({
                    "type": "error",
                    "message": "还有玩家未准备好或未选择角色"
                }, user_id)
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
            await manager.broadcast_to_room(room_code, {
                "type": "game_started",
                "data": {
                    "stage_name": first_stage.name if first_stage else "游戏开始",
                    "stage_narrative": first_stage.opening_narrative if first_stage else ""
                }
            })
            
        except DoesNotExist:
            await manager.send_personal_message({
                "type": "error",
                "message": "房间不存在"
            }, user_id)

    async def handle_private_message(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理私聊消息"""
        try:
            room = await GameRooms.get(room_code=room_code)
            sender = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            recipient_id = data.get("recipient_id")
            recipient = await GamePlayers.get(room=room, user_id=recipient_id)
            
            # 保存私聊记录
            await GameLogs.create(
                room=room,
                sender_game_player=sender,
                recipient_game_player=recipient,
                message_type="私聊",
                content=data.get("message", "")
            )
            
            # 发送给接收者
            await manager.send_personal_message({
                "type": "private_message",
                "data": {
                    "sender_id": user_id,
                    "sender_nickname": sender.user.nickname,
                    "message": data.get("message", ""),
                    "timestamp": datetime.now().isoformat()
                }
            }, recipient_id)
            
        except DoesNotExist:
            await manager.send_personal_message({
                "type": "error",
                "message": "房间或用户不存在"
            }, user_id)

    async def handle_player_action(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理玩家行动"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 保存行动记录
            await GameLogs.create(
                room=room,
                sender_game_player=player,
                message_type="行动宣告",
                content=data.get("action", "")
            )
            
            # 广播行动给房间内所有用户
            await manager.broadcast_to_room(room_code, {
                "type": "player_action",
                "data": {
                    "user_id": user_id,
                    "nickname": player.user.nickname,
                    "action": data.get("action", ""),
                    "timestamp": datetime.now().isoformat()
                }
            })
            
        except DoesNotExist:
            await manager.send_personal_message({
                "type": "error",
                "message": "房间或用户不存在"
            }, user_id)

    async def handle_game_vote(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理游戏投票"""
        # 这里可以实现投票逻辑
        pass

# 全局游戏处理器实例
game_handler = GameHandler()
