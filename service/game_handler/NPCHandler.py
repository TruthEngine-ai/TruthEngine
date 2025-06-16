from typing import Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers, Users, AIConfig
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class NPCHandler:
    async def handle_add_npc(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理添加NPC"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以添加NPC"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status not in ['等待中', '选择角色']:
                await manager.send_personal_message(
                    create_error_message("只能在等待中或选择角色阶段添加NPC"), 
                    user_id
                )
                return
            
            # 检查房间是否已满
            current_player_count = await GamePlayers.filter(room=room).count()
            if current_player_count >= room.max_players:
                await manager.send_personal_message(
                    create_error_message("房间已满，无法添加NPC"), 
                    user_id
                )
                return
            
            aiconfig_id = data.get("aiconfig_id")
            if not aiconfig_id:
                await manager.send_personal_message(
                    create_error_message("缺少AI配置ID"), 
                    user_id
                )
                return
            
            # 验证AI配置是否存在
            try:
                ai_config = await AIConfig.get(id=aiconfig_id)
            except DoesNotExist:
                await manager.send_personal_message(
                    create_error_message("AI配置不存在"), 
                    user_id
                )
                return
            
            # 创建NPC用户
            npc_username = f"npc_{room_code}_{ai_config.name}_{current_player_count}"
            npc_nickname = f"NPC-{ai_config.name}"
            
            # 检查用户名是否已存在
            existing_user = await Users.filter(username=npc_username).first()
            if existing_user:
                npc_user = existing_user
            else:
                npc_user = await Users.create(
                    username=npc_username,
                    password_hash="npc_password_hash",  # NPC不需要真实密码
                    nickname=npc_nickname,
                    email=f"{npc_username}@npc.local",
                    is_visitor=True
                )
            
            # 添加NPC到房间
            npc_player = await GamePlayers.create(
                room=room,
                user=npc_user,
                is_npc=True,
                aiconfig=ai_config,
                is_ready=True  # NPC默认准备就绪
            )
            
            # 通知房间内所有用户NPC已添加
            await manager.broadcast_to_room(room_code, create_message(MessageType.NPC_ADDED,
                create_formatted_data(
                    message=f"{player.user.nickname} 添加了NPC：{npc_nickname}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )
        except Exception as e:
            await manager.send_personal_message(
                create_error_message(f"添加NPC失败：{str(e)}"), 
                user_id
            )

    async def handle_remove_npc(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理移除NPC"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以移除NPC"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status not in ['等待中']:
                await manager.send_personal_message(
                    create_error_message("只能在《等待中》阶段移除NPC"), 
                    user_id
                )
                return
            
            player_id = data.get("player_id")
            if not player_id:
                await manager.send_personal_message(
                    create_error_message("缺少玩家ID"), 
                    user_id
                )
                return
            
            # 查找要移除的NPC
            try:
                npc_player = await GamePlayers.get(
                    id=player_id,
                    room=room, 
                    is_npc=True
                ).prefetch_related('user')
            except DoesNotExist:
                await manager.send_personal_message(
                    create_error_message("NPC不存在或不属于该房间"), 
                    user_id
                )
                return
            
            npc_nickname = npc_player.user.nickname
            
            # 移除NPC
            await npc_player.delete()
            
            # 通知房间内所有用户NPC已移除
            await manager.broadcast_to_room(room_code, create_message(MessageType.NPC_REMOVED,
                create_formatted_data(
                    message=f"{player.user.nickname} 移除了NPC：{npc_nickname}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )
        except Exception as e:
            await manager.send_personal_message(
                create_error_message(f"移除NPC失败：{str(e)}"), 
                user_id
            )

# 全局NPC处理器实例
npc_handler = NPCHandler()
