from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Annotated
import json

from .connection_manager import manager
from .game_handler import game_handler
from api.auth_api import get_current_user
from model.entity.Scripts import GameRooms, GamePlayers
from models.database import User as UserModel
from utils.auth_util import decode_token
from .notification_types import MessageType, create_message, create_error_message, validate_incoming_message

router = APIRouter()

async def get_current_user_ws(token: str):
    """WebSocket版本的用户认证"""
    try:
        token_data = decode_token(token)
        if not token_data:
            return None
        
        from api.auth_api import get_user
        user = await get_user(token_data.username)
        return user
    except:
        return None

@router.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, token: str):
    """WebSocket连接端点"""
    # 验证用户身份
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=4001, reason="未授权")
        return
    
    # 验证房间存在且用户在房间中
    try:
        room = await GameRooms.get(room_code=room_code)
        player = await GamePlayers.get(room=room, user_id=user.id)
    except:
        await websocket.close(code=4004, reason="房间不存在或用户不在房间中")
        return
    
    # 先接受连接
    await websocket.accept()
    
    try:
        # 建立连接管理
        await manager.register_connection(websocket, room_code, user.id)
        
        # 发送连接成功消息
        await manager.send_personal_message(create_message(MessageType.CONNECTED, {
            "room_code": room_code,
            "user_id": user.id,
            "nickname": user.nickname
        }), user.id)
        
        # 发送当前房间状态
        await send_room_status(room_code, user.id)
        
        # 监听消息
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # 验证消息格式
                message_type = message.get("type")
                if not validate_incoming_message(message_type, message.get("data", {})):
                    await manager.send_personal_message(
                        create_error_message("无效的消息格式"),
                        user.id
                    )
                    continue
                
                await game_handler.handle_message(websocket, room_code, user.id, message)
                
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    create_error_message("无效的JSON格式"),
                    user.id
                )
                
    except WebSocketDisconnect:
        await manager.disconnect(user.id)
    except Exception as e:
        print(f"WebSocket连接异常: {str(e)}")
        await manager.disconnect(user.id)

async def send_room_status(room_code: str, user_id: int):
    """发送房间当前状态给指定用户"""
    await _send_room_status_internal(room_code, user_id)

async def broadcast_room_status(room_code: str):
    """向房间内所有用户广播房间状态"""
    try:
        # 获取房间内所有在线用户
        connected_users = manager.get_room_users(room_code)
        for user_id in connected_users:
            await _send_room_status_internal(room_code, user_id)
    except Exception as e:
        print(f"广播房间状态失败: {str(e)}")

async def _send_room_status_internal(room_code: str, user_id: int):
    """内部函数：发送房间状态"""
    try:
        room = await GameRooms.get(room_code=room_code).prefetch_related(
            'script', 'host_user', 'players__user', 'players__character', 'current_stage'
        )
        
        # 构建玩家列表
        players = []
        for player in room.players:
            players.append({
                "user_id": player.user.id,
                "nickname": player.user.nickname,
                "character_name": player.character.name if player.character else None,
                "character_id": player.character.id if player.character else None,
                "is_ready": player.is_ready,
                "is_host": player.user.id == room.host_user_id,
                "is_online": manager.is_user_connected(player.user.id)
            })
        
        # 构建角色列表（如果有剧本的话）
        characters = []
        if room.script:
            script_characters = await room.script.characters.all()
            for char in script_characters:
                # 检查角色是否已被选择
                selected_by = None
                for player in room.players:
                    if player.character_id == char.id:
                        selected_by = player.user.id
                        break
                
                characters.append({
                    "id": char.id,
                    "name": char.name,
                    "gender": char.gender,
                    "public_info": char.public_info,
                    "selected_by": selected_by
                })
        
        await manager.send_personal_message(create_message(MessageType.ROOM_STATUS, {
            "room": {
                "code": room.room_code,
                "status": room.status,
                "current_stage": room.current_stage.name if room.current_stage else None,
                "ai_dm_personality": room.ai_dm_personality,
                "game_settings": room.game_setting,
                "max_players": room.max_players,
            },
            "script": {
                "id": room.script.id,
                "title": room.script.title,
                "description": room.script.description
            } if room.script else None,
            "players": players,
            "characters": characters
        }), user_id)
        
    except Exception as e:
        await manager.send_personal_message(
            create_error_message(f"获取房间状态失败: {str(e)}"),
            user_id
        )
