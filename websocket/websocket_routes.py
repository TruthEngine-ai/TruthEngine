from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Annotated
import json

from .connection_manager import manager
from service.GameHandler import game_handler
from service.RoomStatusHandler import room_status_handler
from api.auth_api import get_current_user
from model.entity.Scripts import GameRooms, GamePlayers
from utils.auth_util import decode_token
from model.ws.notification_types import MessageType, create_message, create_error_message, validate_incoming_message, parse_incoming_message, create_formatted_data

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
        await manager.send_personal_message(create_message(MessageType.CONNECTED,
            create_formatted_data(
                message=f"欢迎 {user.nickname} 进入房间",
                send_id=None,
                send_nickname="系统"
            )
        ), user.id)
        
        # 发送当前房间状态
        await room_status_handler.send_room_status(room_code, user.id)
        
        # 监听消息
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # 验证消息格式
                message_type = message.get("type")
                if message_type == "ping":
                    continue
                message_data = message.get("data", {})
                
                print(f"接收到消息: {message_type} - {message_data}")
                
                is_valid, error_msg = validate_incoming_message(message_type, message_data)
                if not is_valid:
                    await manager.send_personal_message(
                        create_error_message(error_msg),
                        user.id
                    )
                    continue
                
                # 解析消息数据
                parsed_data = parse_incoming_message(message_type, message_data)
                if parsed_data is None:
                    await manager.send_personal_message(
                        create_error_message("消息解析失败"),
                        user.id
                    )
                    continue
                
                # 将解析后的数据转换为字典传递给处理器
                await game_handler.handle_message(
                    websocket, 
                    room_code, 
                    user.id, 
                    {
                        "type": message_type,
                        "data": parsed_data.dict() if hasattr(parsed_data, 'dict') else {}
                    }
                )
                
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

# 向外暴露的函数，保持兼容性
async def send_room_status(room_code: str, user_id: int):
    """发送房间当前状态给指定用户"""
    await room_status_handler.send_room_status(room_code, user_id)

async def broadcast_room_status(room_code: str):
    """向房间内所有用户广播房间状态"""
    await room_status_handler.broadcast_room_status(room_code)

