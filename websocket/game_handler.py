import json
from typing import Dict, Any
from datetime import datetime
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers, GameLogs, ScriptCharacters
from .connection_manager import manager
from .notification_types import (
    MessageType, create_message, create_error_message,
    ChatData, PlayerActionData, CharacterSelectedData,
    PlayerReadyData, AllReadyData, GameStartedData, PrivateMessageData
)

class GameHandler:
    async def handle_message(self, websocket, room_code: str, user_id: int, message: Dict[str, Any]):
        """处理游戏消息"""
        message_type = message.get("type")
        
        handlers = {
            MessageType.CHAT.value: self.handle_chat,
            MessageType.READY.value: self.handle_ready,
            MessageType.SELECT_CHARACTER.value: self.handle_select_character,
            MessageType.START_GAME.value: self.handle_start_game,
            MessageType.PLAYER_ACTION.value: self.handle_player_action,
            MessageType.PRIVATE_MESSAGE.value: self.handle_private_message,
            MessageType.GAME_VOTE.value: self.handle_game_vote,
            MessageType.UPDATE_ROOM_SETTINGS.value: self.handle_update_room_settings
        }
        
        handler = handlers.get(message_type)
        if handler:
            await handler(room_code, user_id, message.get("data", {}))
        else:
            await manager.send_personal_message(
                create_error_message(f"未知消息类型: {message_type}"), 
                user_id
            )

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
            await manager.broadcast_to_room(room_code, create_message(MessageType.CHAT, {
                "user_id": user_id,
                "nickname": player.user.nickname,
                "message": data.get("message", ""),
                "timestamp": datetime.now().isoformat()
            }))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

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
                    await manager.send_personal_message(
                        create_error_message("该角色已被其他玩家选择"), 
                        user_id
                    )
                    return
                
                # 分配角色
                character = await ScriptCharacters.get(id=character_id)
                player.character = character
                await player.save()
                
                # 通知房间内所有用户
                await manager.broadcast_to_room(room_code, create_message(MessageType.CHARACTER_SELECTED, {
                    "user_id": user_id,
                    "character_id": character_id,
                    "character_name": character.name
                }))
                
                # 广播房间状态更新
                from .websocket_routes import broadcast_room_status
                await broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间、用户或角色不存在"), 
                user_id
            )

    async def handle_ready(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理准备状态"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id)
            
            player.is_ready = data.get("ready", False)
            await player.save()
            
            # 通知房间内所有用户
            await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_READY, {
                "user_id": user_id,
                "ready": player.is_ready
            }))
            
            # 广播房间状态更新
            from .websocket_routes import broadcast_room_status
            await broadcast_room_status(room_code)
            
            # 检查是否所有玩家都准备好了
            all_players = await GamePlayers.filter(room=room).prefetch_related('character')
            all_ready = all(p.is_ready and p.character for p in all_players)
            
            if all_ready and len(all_players) >= room.script.player_count_min:
                await manager.broadcast_to_room(room_code, create_message(MessageType.ALL_READY, {
                    "can_start": True
                }))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

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
            all_players = await GamePlayers.filter(room=room).prefetch_related('character')
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
            await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_STARTED, {
                "stage_name": first_stage.name if first_stage else "游戏开始",
                "stage_narrative": first_stage.opening_narrative if first_stage else "",
                "current_stage_number": first_stage.stage_number if first_stage else 1
            }))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间不存在"), 
                user_id
            )

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
            await manager.send_personal_message(create_message(MessageType.PRIVATE_MESSAGE, {
                "sender_id": user_id,
                "sender_nickname": sender.user.nickname,
                "recipient_id": recipient_id,
                "message": data.get("message", ""),
                "timestamp": datetime.now().isoformat()
            }), recipient_id)
            
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
            
            # 保存行动记录
            await GameLogs.create(
                room=room,
                sender_game_player=player,
                message_type="行动宣告",
                content=data.get("action", "")
            )
            
            # 广播行动给房间内所有用户
            await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_ACTION, {
                "user_id": user_id,
                "nickname": player.user.nickname,
                "action": data.get("action", ""),
                "timestamp": datetime.now().isoformat()
            }))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

    async def handle_game_vote(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理游戏投票"""
        # TODO: 实现投票逻辑
        pass

    async def handle_update_room_settings(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理房间设置更新"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以修改房间设置"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status != '等待中':
                await manager.send_personal_message(
                    create_error_message("只能在等待中状态修改房间设置"), 
                    user_id
                )
                return
            
            # 更新游戏设置
            current_settings = room.game_setting or {}
            
            if "theme" in data and data["theme"] is not None:
                current_settings["theme"] = data["theme"]
            if "difficulty" in data and data["difficulty"] is not None:
                current_settings["difficulty"] = data["difficulty"]
            if "ai_dm_personality" in data and data["ai_dm_personality"] is not None:
                current_settings["ai_dm_personality"] = data["ai_dm_personality"]
                room.ai_dm_personality = data["ai_dm_personality"]  # 同时更新主字段
            if "duration_mins" in data and data["duration_mins"] is not None:
                current_settings["duration_mins"] = data["duration_mins"]
            
            room.game_setting = current_settings
            await room.save()
            
            # 广播设置更新给房间内所有用户
            await manager.broadcast_to_room(room_code, create_message(MessageType.ROOM_SETTINGS_UPDATED, {
                "updated_by": user_id,
                "updated_by_nickname": player.user.nickname,
                "settings": current_settings
            }))
            
            # 广播房间状态更新
            from .websocket_routes import broadcast_room_status
            await broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

# 全局游戏处理器实例
game_handler = GameHandler()
