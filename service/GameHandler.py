import json
from typing import Dict, Any
from datetime import datetime
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers, GameLogs, ScriptCharacters,ScriptClues
from websocket.connection_manager import manager
from model.ws.notification_types import (
    MessageType, create_message, create_error_message, create_formatted_data
)
from utils.game_log_util import game_log_util

from service.AIHandler import ai_handler

# 导入各个处理器
from .game_handler.ChatHandler import chat_handler
from .game_handler.CharacterHandler import character_handler
from .game_handler.ReadyHandler import ready_handler
from .game_handler.GameControlHandler import game_control_handler
from .game_handler.SearchHandler import search_handler
from .game_handler.MessageHandler import message_handler
from .game_handler.VoteHandler import vote_handler
from .game_handler.RoomSettingsHandler import room_settings_handler
from .game_handler.ScriptGeneratorHandler import script_generator_handler
from .game_handler.ClueSearchHandler import clue_search_handler
from .game_handler.NPCHandler import npc_handler

class GameHandler:
    async def handle_message(self, websocket, room_code: str, user_id: int, message: Dict[str, Any]):
        """处理游戏消息"""
        message_type = message.get("type")
        
        # 根据消息类型记录日志
        try:
            room = await GameRooms.get(room_code=room_code)
            player = None
            
            # 获取发送消息的玩家信息
            try:
                player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            except DoesNotExist:
                pass
            
            # 根据不同消息类型记录相应日志
            if message_type in [
                MessageType.READY.value, 
                MessageType.SELECT_CHARACTER.value, 
                MessageType.START_GAME.value,
                MessageType.UPDATE_ROOM_SETTINGS.value,
                MessageType.GENERATE_SCRIPT.value,
                MessageType.NEXT_STAGE.value,
                MessageType.SEARCH_BEGIN.value,
                MessageType.SEARCH_END.value,
                MessageType.SEARCH_SCRIPT_CLUE.value,
                MessageType.ADD_NPC.value,
                MessageType.REMOVE_NPC.value
            ]:
                # 系统消息类型
                await game_log_util.create_system_log(
                    room=room,
                    content=f"用户 {player.user.nickname if player else user_id} 执行了操作：{message_type}",
                    player=player
                )
            elif message_type == MessageType.CHAT.value:
                # 公共聊天
                if player:
                    await game_log_util.create_chat_log(
                        room=room,
                        sender_player=player,
                        content=message.get("data", {}).get("message", "")
                    )
            elif message_type == MessageType.PRIVATE_MESSAGE.value:
                # 私聊消息 - 在具体处理方法中记录，因为需要接收者信息
                pass
            elif message_type == MessageType.GAME_VOTE.value:
                # 投票行动
                if player:
                    await game_log_util.create_action_log(
                        room=room,
                        player=player,
                        action_content=f"进行投票操作"
                    )
            elif message_type == MessageType.PLAYER_ACTION.value:
                # 玩家行动
                if player:
                    await game_log_util.create_action_log(
                        room=room,
                        player=player,
                        action_content=message.get("data", {}).get("action", "")
                    )
        except Exception as e:
            print(f"记录游戏日志失败: {str(e)}")
        
        handlers = {
            MessageType.CHAT.value: chat_handler.handle_chat,
            MessageType.READY.value: ready_handler.handle_ready,
            MessageType.SELECT_CHARACTER.value: character_handler.handle_select_character,
            MessageType.START_GAME.value: game_control_handler.handle_start_game,
            MessageType.PLAYER_ACTION.value: message_handler.handle_player_action,
            MessageType.PRIVATE_MESSAGE.value: message_handler.handle_private_message,
            MessageType.GAME_VOTE.value: vote_handler.handle_game_vote,
            MessageType.UPDATE_ROOM_SETTINGS.value: room_settings_handler.handle_update_room_settings,
            MessageType.GENERATE_SCRIPT.value: script_generator_handler.handle_generate_script,
            MessageType.NEXT_STAGE.value: game_control_handler.handle_next_stage,
            MessageType.START_VOTE.value: vote_handler.handle_start_vote,
            MessageType.END_VOTE.value: vote_handler.handle_end_vote,
            MessageType.SEARCH_BEGIN.value: search_handler.handle_search_begin,
            MessageType.SEARCH_END.value: search_handler.handle_search_end,
            MessageType.SEARCH_SCRIPT_CLUE.value: clue_search_handler.handle_search_script_clue,
            MessageType.ADD_NPC.value: npc_handler.handle_add_npc,
            MessageType.REMOVE_NPC.value: npc_handler.handle_remove_npc,
        }
        
        handler = handlers.get(message_type)
        if handler:
            await handler(room_code, user_id, message.get("data", {}))
            # 处理完消息后，触发AI响应
            if message_type in [MessageType.CHAT.value, MessageType.PRIVATE_MESSAGE.value]:
                await ai_handler.handle_player_message(room_code, user_id, message)
        else:
            await manager.send_personal_message(
                create_error_message(f"未知消息类型: {message_type}"), 
                user_id
            )

# 全局游戏处理器实例
game_handler = GameHandler()
