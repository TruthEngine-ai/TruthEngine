from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .response import ApiResponse

# 房间相关的数据模型
class CreateRoomData(BaseModel):
    room_code: str
    host_id: int

class CreateRoomResponse(ApiResponse[CreateRoomData]):
    pass

class JoinRoomData(BaseModel):
    room_code: str
    user_id: int

class JoinRoomResponse(ApiResponse[JoinRoomData]):
    pass

class LeaveRoomData(BaseModel):
    room_dissolved: bool

class LeaveRoomResponse(ApiResponse[LeaveRoomData]):
    pass

class ScriptInfo(BaseModel):
    id: int
    title: str
    description: str
    player_count_min: int
    player_count_max: int
    duration_mins: int
    difficulty: str

class HostInfo(BaseModel):
    id: int
    nickname: str
    avatar_url: Optional[str] = None

class PlayerInfo(BaseModel):
    user_id: int
    nickname: str
    avatar_url: Optional[str] = None
    character_name: Optional[str] = None
    is_ready: bool
    is_host: bool

class RoomDetailData(BaseModel):
    room_code: str
    status: str
    current_round: Optional[int] = None
    ai_dm_personality: str
    has_password: bool
    script: Optional[ScriptInfo] = None
    host: HostInfo
    players: List[PlayerInfo]
    created_at: datetime
    started_at: Optional[datetime] = None

class RoomDetailResponse(ApiResponse[RoomDetailData]):
    pass

class RoomListItem(BaseModel):
    room_code: str
    script_title: str
    host_nickname: str
    player_count: int
    max_players: Optional[int]
    status: str
    has_password: bool
    created_at: datetime

class RoomListData(BaseModel):
    rooms: List[RoomListItem]
    total: int
    page: int
    page_size: int

class RoomListResponse(ApiResponse[RoomListData]):
    pass

class DeleteRoomData(BaseModel):
    room_code: str

class DeleteRoomResponse(ApiResponse[DeleteRoomData]):
    pass

class CleanupRoomData(BaseModel):
    deleted_count: int

class CleanupRoomResponse(ApiResponse[CleanupRoomData]):
    pass
