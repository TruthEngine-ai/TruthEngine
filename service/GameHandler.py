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
                MessageType.SEARCH_SCRIPT_CLUE.value
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
            MessageType.CHAT.value: self.handle_chat,
            MessageType.READY.value: self.handle_ready,
            MessageType.SELECT_CHARACTER.value: self.handle_select_character,
            MessageType.START_GAME.value: self.handle_start_game,
            MessageType.PLAYER_ACTION.value: self.handle_player_action,
            MessageType.PRIVATE_MESSAGE.value: self.handle_private_message,
            MessageType.GAME_VOTE.value: self.handle_game_vote,
            MessageType.UPDATE_ROOM_SETTINGS.value: self.handle_update_room_settings,
            MessageType.GENERATE_SCRIPT.value: self.handle_generate_script,
            MessageType.NEXT_STAGE.value: self.handle_next_stage,
            
            # 线索相关： 公开搜查到的线索
            MessageType.SEARCH_BEGIN.value: self.handle_search_begin,
            MessageType.SEARCH_END.value: self.handle_search_end,
            MessageType.SEARCH_SCRIPT_CLUE.value: self.handle_search_script_clue,
            # 开始搜证
            
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
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user','character')
            
            # 广播消息给房间内所有用户
            nickname = player.character.name+f"({player.user.nickname})" if player.character else player.user.nickname
            await manager.broadcast_to_room(room_code, create_message(MessageType.CHAT,
                create_formatted_data(
                    message=data.get("message", ""),
                    send_id=user_id,
                    send_nickname=nickname
                )
            ))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

    async def handle_select_character(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理角色选择"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
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
                await manager.broadcast_to_room(room_code, create_message(MessageType.CHARACTER_SELECTED,
                    create_formatted_data(
                        message=f"玩家{player.user.nickname}  选择了角色：{character.name}",
                        send_id=None,
                        send_nickname="系统"
                    )
                ))
                
                # 广播房间状态更新
                from .RoomStatusHandler import room_status_handler
                await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间、用户或角色不存在"), 
                user_id
            )

    async def handle_ready(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理准备状态"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            player.is_ready = data.get("ready", False)
            await player.save()
            
            # 通知房间内所有用户
            ready_status = "准备就绪" if player.is_ready else "取消准备"
            await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_READY,
                create_formatted_data(
                    message=f"{player.user.nickname} {ready_status}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from .RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
            # 检查是否所有玩家都准备好了
            all_players = await GamePlayers.filter(room=room).prefetch_related('character')
            all_ready = all(p.is_ready and p.character for p in all_players)
            
            if all_ready and len(all_players) >= room.script.player_count_min:
                await manager.broadcast_to_room(room_code, create_message(MessageType.ALL_READY,
                    create_formatted_data(
                        message="所有玩家已准备就绪，可以开始游戏！",
                        send_id=None,
                        send_nickname="系统"
                    )
                ))
            
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
            await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_STARTED,
                create_formatted_data(
                    message=f"游戏开始！当前阶段：{first_stage.name if first_stage else '游戏开始'}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from .RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间不存在"), 
                user_id
            )
            
    async def handle_search_begin(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理开始搜证"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related('script__stages')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以开始搜证"), 
                    user_id
                )
                return
            
            
            # 开始搜证
            room.status = "搜证中"
            await room.save()
            
            # 通知所有玩家游戏开始
            await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_STARTED,
                create_formatted_data(
                    message=f"搜证开始！",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from .RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间不存在"), 
                user_id
            )


    async def handle_search_end(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理结束搜证"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related('script__stages')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以结束搜证"), 
                    user_id
                )
                return
            
            
            # 开始搜证
            room.status = "进行中"
            await room.save()
            
            # 通知所有玩家游戏开始
            await manager.broadcast_to_room(room_code, create_message(MessageType.GAME_STARTED,
                create_formatted_data(
                    message=f"搜证结束！",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from .RoomStatusHandler import room_status_handler
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
            from .RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
            
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
            recipient = await GamePlayers.get(room=room, user_id=recipient_id).prefetch_related('user')
            
            # 使用工具类记录私聊日志
            await game_log_util.create_private_chat_log(
                room=room,
                sender_player=sender,
                recipient_player=recipient,
                content=data.get("message", "")
            )
            
            # 发送给接收者
            await manager.send_personal_message(create_message(MessageType.PRIVATE_MESSAGE,
                create_formatted_data(
                    message=data.get("message", ""),
                    send_id=user_id,
                    send_nickname=sender.user.nickname,
                    recipient_id=recipient_id,
                    recipient_nickname=recipient.user.nickname
                )
            ), recipient_id)
            
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
            
            # 广播行动给房间内所有用户
            await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_ACTION,
                create_formatted_data(
                    message=f"{player.user.nickname} 执行了行动：{data.get('action', '')}",
                    send_id=user_id,
                    send_nickname=player.user.nickname
                )
            ))
            
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
            await manager.broadcast_to_room(room_code, create_message(MessageType.ROOM_SETTINGS_UPDATED,
                create_formatted_data(
                    message=f"{player.user.nickname} 更新了房间设置",
                    send_id=user_id,
                    send_nickname=player.user.nickname
                )
            ))
            
            # 广播房间状态更新
            from .RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

    async def handle_generate_script(self, room_code: str, user_id: int, data: Dict[str, Any] = None):
        """处理剧本生成请求"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以生成剧本"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status != '等待中':
                await manager.send_personal_message(
                    create_error_message("只能在等待中状态生成剧本"), 
                    user_id
                )
                return
            
            # 检查是否已有剧本
            if room.script_id:
                await manager.send_personal_message(
                    create_error_message("房间已有剧本，无法重复生成"), 
                    user_id
                )
                return
            
            game_setting = room.game_setting 
            if not game_setting:
                await manager.send_personal_message(
                    create_error_message("房间未设置游戏参数，请先设置游戏参数"), 
                    user_id
                )
                return
                
            # 验证数据
            required_fields = ['theme', 'difficulty', 'ai_dm_personality', 'duration_mins','special_rules']
            for field in required_fields:
                if field not in game_setting:
                    await manager.send_personal_message(
                        create_error_message(f"缺少必要参数: {field}"), 
                        user_id
                    )
                    return
                
            room.status = "生成剧本中"
            await room.save()
            
            # 通知房间内所有用户剧本生成开始
            await manager.broadcast_to_room(room_code, create_message(MessageType.SCRIPT_GENERATION_STARTED,
                create_formatted_data(
                    message=f"{player.user.nickname} 开始生成剧本...",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            from websocket.websocket_routes import broadcast_room_status
            await broadcast_room_status(room_code)
            
            # 异步调用剧本生成API
            import asyncio
            asyncio.create_task(self._generate_script_async(room_code, user_id, room.game_setting))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

    async def _generate_script_async(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """异步生成剧本"""
        try:
            # 导入剧本生成相关模块
            from api.scripts_api import call_ai_api, parse_and_save_script, create_user_prompt
            
            # 获取房间信息
            room = await GameRooms.get(room_code=room_code)
            
            # 创建用户提示词
            user_prompt = create_user_prompt(
                data["theme"],
                room.max_players,
                data["difficulty"],
                data["ai_dm_personality"],
                data["duration_mins"]
            )
            
            # 调用 AI 接口生成剧本
            ai_response = await call_ai_api(user_prompt)
            # ai_response = None
            # # 保存AI响应到test.json文件
            # with open("test.json", "w", encoding="utf-8") as f:
            #     f.write(ai_response)
                
            # 从文件读取AI响应用于测试
            try:
                with open("test.json", "r", encoding="utf-8") as f:
                    ai_response = f.read()
            except FileNotFoundError:
                raise Exception("test.json文件不存在")
            except Exception as e:
                raise Exception(f"读取test.json文件失败: {str(e)}")
            # 解析并保存到数据库
            script_id = await parse_and_save_script(ai_response, user_id, room.max_players, data["duration_mins"])
            # 将剧本关联到房间
            room.script_id = script_id
            room.status = "选择角色"
            await room.save()
            
            # 获取生成的剧本信息
            from model.entity.Scripts import Scripts
            script = await Scripts.get(id=script_id).prefetch_related('characters')
            
            # 通知房间内所有用户剧本生成完成
            await manager.broadcast_to_room(room_code, create_message(MessageType.SCRIPT_GENERATION_COMPLETED,
                create_formatted_data(
                    message=f"剧本生成完成：{script.title}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from .RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except Exception as e:
            # 剧本生成失败时恢复房间状态
            print(f"剧本生成失败: {str(e)}")
            try:
                room = await GameRooms.get(room_code=room_code)
                room.status = "等待中"
                await room.save()
            except:
                pass
                
            # 通知房间内所有用户剧本生成失败
            await manager.broadcast_to_room(room_code, create_message(MessageType.SCRIPT_GENERATION_FAILED,
                create_formatted_data(
                    message=f"剧本生成失败：{str(e)}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
             # 广播房间状态更新
            from .RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)

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
                clue = await ScriptClues.get(id=clue_id, script=room.script) .prefetch_related('character', 'discovery_stage')
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
                is_public=False,  # 默认为私有搜查，可以后续扩展为用户选择
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
            from .RoomStatusHandler import room_status_handler
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

# 全局游戏处理器实例
game_handler = GameHandler()
