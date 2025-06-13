from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from typing import Annotated

import random
import string
import json
from datetime import datetime, timedelta
from tortoise.exceptions import DoesNotExist, IntegrityError

from model.entity.Scripts import GameRooms, Users, Scripts, GamePlayers
from model.dto.response import (
    ApiResponse
)
from model.dto.RoomDto import (
    CreateRoomResponse, JoinRoomResponse, LeaveRoomResponse,
    RoomListResponse, RoomDetailResponse, DeleteRoomResponse, CleanupRoomResponse
)
from .auth_api import get_current_user
from models.database import User as UserModel
from websocket.connection_manager import manager
from websocket.notification_types import MessageType, create_message

router = APIRouter(prefix="/api/room", tags=["房间管理"])

# 请求模型
class CreateRoomRequest(BaseModel):
    room_password: Optional[str] = ""
    ai_dm_personality: Optional[str] = "严肃"
    player_count_max : int
    game_type: Optional[str] = "script"

class JoinRoomRequest(BaseModel):
    room_code: str
    room_password: Optional[str] = ""

class RoomResponse(BaseModel):
    room_code: str
    script_title: str
    host_nickname: str
    player_count: int
    max_players: int
    status: str
    created_at: datetime

class UpdateRoomSettingsRequest(BaseModel):
    theme: Optional[str] = None
    difficulty: Optional[str] = None
    ai_dm_personality: Optional[str] = None
    duration_mins: Optional[int] = None

def generate_room_code() -> str:
    """生成6位房间码"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def get_or_create_guest_user() -> Users:
    """获取或创建游客用户"""
    guest_username = f"guest_{random.randint(100000, 999999)}"
    try:
        guest = await Users.create(
            username=guest_username,
            password_hash="",
            nickname=f"游客{random.randint(1000, 9999)}",
            email=f"{guest_username}@guest.com"
        )
        return guest
    except IntegrityError:
        # 如果用户名重复，递归重试
        return await get_or_create_guest_user()

@router.post("/create", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest, current_user: Annotated[UserModel, Depends(get_current_user)] ):
    """创建房间"""
    try:
        # 生成唯一房间码
        while True:
            room_code = generate_room_code()
            existing_room = await GameRooms.filter(room_code=room_code).first()
            if not existing_room:
                break
        
        # 处理游戏设置
        game_setting = None
        if request.game_type == "script":
            game_setting = {
                "theme": "",
                "difficulty":  "", 
                "ai_dm_personality": "",
                "duration_mins": 0
            }
        
        # 创建房间
        room = await GameRooms.create(
            room_code=room_code,
            room_password=request.room_password or "",
            host_user=current_user,
            ai_dm_personality=request.ai_dm_personality,
            player_count_max=request.player_count_max,
            game_setting=game_setting
        )
        
        # 房主自动加入房间
        await GamePlayers.create(
            room=room,
            user=current_user,
            character=None  # 角色选择阶段再分配
        )
        
        return ApiResponse(
            code=200,
            msg="房间创建成功",
            data={
                "room_code": room_code,
                "host_id": current_user.id
            }
        )
        
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="剧本不存在")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建房间失败: {str(e)}")

@router.post("/join", response_model=JoinRoomResponse)
async def join_room(request: JoinRoomRequest, current_user: Annotated[UserModel, Depends(get_current_user)] ):
    """用户加入游戏房间"""
    try:
        # 查找房间
        room = await GameRooms.get(room_code=request.room_code).prefetch_related('script', 'players')
        
        # 验证房间状态
        if room.status not in ['等待中']:
            raise HTTPException(status_code=400, detail="房间不允许加入")
        
        # 验证房间密码
        if room.room_password and room.room_password != request.room_password:
            raise HTTPException(status_code=400, detail="房间密码错误")
        
        # 检查用户是否已在房间中
        existing_player = await GamePlayers.filter(room=room, user=current_user).first()
        if existing_player:
            raise HTTPException(status_code=400, detail="用户已在房间中")
        
        # 检查房间人数限制
        current_players = await GamePlayers.filter(room=room).count()
        if current_players >= room.max_players:
            raise HTTPException(status_code=400, detail="房间已满")
        
        # 加入房间（暂不分配角色）
        await GamePlayers.create(
            room=room,
            user=current_user,
            character=None  # 角色选择阶段再分配
        )
        
        # 通过WebSocket通知房间内其他用户
        await manager.broadcast_to_room(request.room_code, create_message(MessageType.PLAYER_JOINED, {
            "user_id": current_user.id,
            "nickname": current_user.nickname,
            "avatar_url": current_user.avatar_url
        }), exclude_user=current_user.id)
        
        return ApiResponse(
            code=200,
            msg="加入房间成功",
            data={
                "room_code": room.room_code,
                "user_id": current_user.id
            }
        )
        
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="房间不存在")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"加入房间失败: {str(e)}")

@router.post("/leave", response_model=LeaveRoomResponse)
async def leave_room(room_code: str, current_user: Annotated[UserModel, Depends(get_current_user)]):
    """退出房间"""
    try:
        room = await GameRooms.get(room_code=room_code)
        
        # 查找玩家记录
        player = await GamePlayers.filter(room=room, user=current_user).first()
        if not player:
            raise HTTPException(status_code=404, detail="用户不在此房间中")
        
        # 断开用户的WebSocket连接
        await manager.disconnect(current_user.id)
        
        # # 通知房间内其他用户有用户离开
        # await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_LEFT, {
        #     "user_id": current_user.id,
        #     "nickname": current_user.nickname
        # }))
        
        # 删除玩家记录
        await player.delete()
        
        # 如果是房主离开且房间还有其他玩家，转移房主
        if room.host_user_id == current_user.id:
            remaining_players = await GamePlayers.filter(room=room).prefetch_related('user')
            if remaining_players:
                # 转移给第一个剩余玩家
                new_host = remaining_players[0].user
                room.host_user = new_host
                await room.save()
                
                # 通知房间内用户房主转移
                await manager.broadcast_to_room(room_code, create_message(MessageType.PLAYER_LEFT, {
                    "user_id": current_user.id,
                    "nickname": current_user.nickname,
                    "is_host_transfer": True,
                    "new_host_id": new_host.id
                }))
                
                # 广播房间状态更新
                from websocket.websocket_routes import broadcast_room_status
                await broadcast_room_status(room_code)
            else:
                # 房间无人，删除房间
                await room.delete()
                return ApiResponse(
                    code=200,
                    msg="退出房间成功，房间已解散",
                    data={"room_dissolved": True}
                )
        else:
            # 非房主离开，只需广播房间状态更新
            from websocket.websocket_routes import broadcast_room_status
            await broadcast_room_status(room_code)
        
        return ApiResponse(
            code=200,
            msg="退出房间成功",
            data={"room_dissolved": False}
        )
        
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="房间或用户不存在")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"退出房间失败: {str(e)}")

@router.get("/list", response_model=RoomListResponse)
async def get_room_list(page: int = 1, page_size: int = 20, status: Optional[str] = None):
    """获取房间列表"""
    try:
        offset = (page - 1) * page_size
        
        # 构建查询条件
        query = GameRooms.all().prefetch_related('script', 'host_user', 'players')
        if status:
            query = query.filter(status=status)
        
        # 获取房间列表
        rooms = await query.offset(offset).limit(page_size)
        total = await GameRooms.all().count()
        
        room_list = []
        for room in rooms:
            # 添加空值检查
            
            player_count = len(room.players) if hasattr(room, 'players') else 0
            room_list.append({
                "room_code": room.room_code,
                "script_title": "" if not room.script else room.script.title,
                "host_nickname": room.host_user.nickname,
                "player_count": player_count,
                "max_players": room.max_players,
                "status": room.status,
                "has_password": bool(room.room_password),
                "created_at": room.created_at
            })
        
        return ApiResponse(
            code=200,
            msg="获取房间列表成功",
            data={
                "rooms": room_list,
                "total": total,
                "page": page,
                "page_size": page_size
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取房间列表失败: {str(e)}")

@router.delete("/delete/{room_code}", response_model=DeleteRoomResponse)
async def delete_room(room_code: str,current_user: Annotated[UserModel, Depends(get_current_user)]):
    """删除房间"""
    try:
        room = await GameRooms.get(room_code=room_code)
        
        # 验证是否为房主
        if room.host_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="只有房主可以删除房间")
        
        # 删除相关的玩家记录
        await GamePlayers.filter(room=room).delete()
        
        # 删除房间
        await room.delete()
        
        return ApiResponse(
            code=200,
            msg="房间删除成功",
            data={"room_code": room_code}
        )
        
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="房间不存在")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除房间失败: {str(e)}")

@router.get("/info/{room_code}", response_model=RoomDetailResponse)
async def get_room_info(room_code: str):
    """获取房间详细信息"""
    try:
        room = await GameRooms.get(room_code=room_code).prefetch_related(
            'script', 'host_user', 'players__user', 'players__character'
        )
        
        # 构建玩家列表
        players = []
        for player in room.players:
            players.append({
                "user_id": player.user.id,
                "nickname": player.user.nickname,
                "avatar_url": player.user.avatar_url,
                "character_name": player.character.name if player.character else None,
                "is_ready": player.is_ready,
                "is_host": player.user.id == room.host_user_id
            })
        
        return ApiResponse(
            code=200,
            msg="获取房间信息成功",
            data={
                "room_code": room.room_code,
                "status": room.status,
                "current_round": room.current_stage.name if room.current_stage else None,
                "ai_dm_personality": room.ai_dm_personality,
                "has_password": bool(room.room_password),
                "script": None if not room.script else {
                    "id": room.script.id,
                    "title": room.script.title,
                    "description": room.script.description,
                    "player_count_min": room.script.player_count_min,
                    "player_count_max": room.script.player_count_max,
                    "duration_mins": room.script.duration_mins,
                    "difficulty": room.script.difficulty
                },
                "host": {
                    "id": room.host_user.id,
                    "nickname": room.host_user.nickname,
                    "avatar_url": room.host_user.avatar_url
                },
                "players": players,
                "created_at": room.created_at,
                "started_at": room.started_at
            }
        )
        
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="房间不存在")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取房间信息失败: {str(e)}")

@router.post("/cleanup", response_model=CleanupRoomResponse)
async def cleanup_expired_rooms():
    """清理长时间未活动的房间"""
    try:
        # 删除24小时前创建且状态为等待中的房间
        expire_time = datetime.now() - timedelta(hours=24)
        expired_rooms = await GameRooms.filter(
            created_at__lt=expire_time,
            status='等待中'
        )
        
        deleted_count = 0
        for room in expired_rooms:
            await GamePlayers.filter(room=room).delete()
            await room.delete()
            deleted_count += 1
        
        return ApiResponse(
            code=200,
            msg=f"清理完成，删除了{deleted_count}个过期房间",
            data={"deleted_count": deleted_count}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理房间失败: {str(e)}")

@router.put("/settings/{room_code}")
async def update_room_settings(
    room_code: str, 
    request: UpdateRoomSettingsRequest,
    current_user: Annotated[UserModel, Depends(get_current_user)]
):
    """修改房间设置"""
    try:
        room = await GameRooms.get(room_code=room_code)
        
        # 验证是否为房主
        if room.host_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="只有房主可以修改房间设置")
        
        # 验证房间状态
        if room.status != '等待中':
            raise HTTPException(status_code=400, detail="只能在等待中状态修改房间设置")
        
        # 更新游戏设置
        current_settings = room.game_setting or {}
        
        if request.theme is not None:
            current_settings["theme"] = request.theme
        if request.difficulty is not None:
            current_settings["difficulty"] = request.difficulty
        if request.ai_dm_personality is not None:
            current_settings["ai_dm_personality"] = request.ai_dm_personality
            room.ai_dm_personality = request.ai_dm_personality  # 同时更新主字段
        if request.duration_mins is not None:
            current_settings["duration_mins"] = request.duration_mins
        
        room.game_setting = current_settings
        await room.save()
        
        # 广播房间状态更新
        from websocket.websocket_routes import broadcast_room_status
        await broadcast_room_status(room_code)
        
        # 通过WebSocket通知房间内所有用户设置已更新
        await manager.broadcast_to_room(room_code, create_message(MessageType.ROOM_SETTINGS_UPDATED, {
            "updated_by": current_user.id,
            "updated_by_nickname": current_user.nickname,
            "settings": current_settings
        }))
        
        return ApiResponse(
            code=200,
            msg="房间设置更新成功",
            data={
                "room_code": room_code,
                "game_setting": current_settings
            }
        )
        
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="房间不存在")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新房间设置失败: {str(e)}")



