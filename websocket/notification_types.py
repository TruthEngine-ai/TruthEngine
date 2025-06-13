from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel

class MessageType(str, Enum):
    """消息类型枚举"""
    # 连接相关
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    
    # 房间状态相关
    ROOM_STATUS = "room_status"
    PLAYER_JOINED = "player_joined"
    PLAYER_LEFT = "player_left"
    ROOM_DISSOLVED = "room_dissolved"
    
    # 聊天相关
    CHAT = "chat"
    PRIVATE_MESSAGE = "private_message"
    
    # 角色选择相关
    SELECT_CHARACTER = "select_character"
    CHARACTER_SELECTED = "character_selected"
    CHARACTER_DESELECTED = "character_deselected"
    
    # 准备状态相关
    READY = "ready"
    PLAYER_READY = "player_ready"
    ALL_READY = "all_ready"
    
    # 游戏流程相关
    START_GAME = "start_game"
    GAME_STARTED = "game_started"
    GAME_ENDED = "game_ended"
    STAGE_CHANGED = "stage_changed"
    
    # 玩家行动相关
    PLAYER_ACTION = "player_action"
    ACTION_RESULT = "action_result"
    
    # 投票相关
    GAME_VOTE = "game_vote"
    VOTE_STARTED = "vote_started"
    VOTE_UPDATED = "vote_updated"
    VOTE_ENDED = "vote_ended"
    
    # 线索相关
    CLUE_DISCOVERED = "clue_discovered"
    CLUE_SHARED = "clue_shared"
    
    # AI DM相关
    AI_MESSAGE = "ai_message"
    AI_PROMPT = "ai_prompt"

class NotificationData(BaseModel):
    """通知数据基类"""
    pass

class ConnectionData(NotificationData):
    """连接通知数据"""
    room_code: str
    user_id: int
    nickname: str

class ErrorData(NotificationData):
    """错误通知数据"""
    message: str
    code: Optional[str] = None

class RoomStatusData(NotificationData):
    """房间状态数据"""
    room: Dict[str, Any]
    script: Optional[Dict[str, Any]]
    players: list
    characters: list

class PlayerJoinedData(NotificationData):
    """玩家加入数据"""
    user_id: int
    nickname: str
    avatar_url: Optional[str] = None

class PlayerLeftData(NotificationData):
    """玩家离开数据"""
    user_id: int
    nickname: str
    is_host_transfer: bool = False
    new_host_id: Optional[int] = None

class ChatData(NotificationData):
    """聊天数据"""
    user_id: int
    nickname: str
    message: str
    timestamp: str

class PrivateMessageData(NotificationData):
    """私聊数据"""
    sender_id: int
    sender_nickname: str
    recipient_id: int
    message: str
    timestamp: str

class CharacterSelectedData(NotificationData):
    """角色选择数据"""
    user_id: int
    character_id: int
    character_name: str

class PlayerReadyData(NotificationData):
    """玩家准备数据"""
    user_id: int
    ready: bool

class AllReadyData(NotificationData):
    """全部准备数据"""
    can_start: bool

class GameStartedData(NotificationData):
    """游戏开始数据"""
    stage_name: str
    stage_narrative: str
    current_stage_number: int

class StageChangedData(NotificationData):
    """阶段变更数据"""
    stage_number: int
    stage_name: str
    stage_narrative: str
    stage_goal: str

class PlayerActionData(NotificationData):
    """玩家行动数据"""
    user_id: int
    nickname: str
    action: str
    timestamp: str

class VoteStartedData(NotificationData):
    """投票开始数据"""
    vote_type: str
    vote_title: str
    options: list
    duration: int

class VoteUpdatedData(NotificationData):
    """投票更新数据"""
    vote_id: str
    user_id: int
    option: str
    current_votes: Dict[str, int]

class ClueDiscoveredData(NotificationData):
    """线索发现数据"""
    clue_id: int
    clue_name: str
    clue_description: str
    discoverer_id: int
    location: str

class AIMessageData(NotificationData):
    """AI消息数据"""
    message: str
    message_type: str
    target_user_id: Optional[int] = None  # None表示广播

# 接收消息类型映射
INCOMING_MESSAGE_TYPES = {
    MessageType.CHAT: ChatData,
    MessageType.SELECT_CHARACTER: dict,  # {"character_id": int}
    MessageType.READY: dict,  # {"ready": bool}
    MessageType.START_GAME: dict,  # {}
    MessageType.PLAYER_ACTION: dict,  # {"action": str}
    MessageType.PRIVATE_MESSAGE: dict,  # {"recipient_id": int, "message": str}
    MessageType.GAME_VOTE: dict,  # {"vote_type": str, "option": str}
}

# 发出消息类型映射
OUTGOING_MESSAGE_TYPES = {
    MessageType.CONNECTED: ConnectionData,
    MessageType.ERROR: ErrorData,
    MessageType.ROOM_STATUS: RoomStatusData,
    MessageType.PLAYER_JOINED: PlayerJoinedData,
    MessageType.PLAYER_LEFT: PlayerLeftData,
    MessageType.CHAT: ChatData,
    MessageType.PRIVATE_MESSAGE: PrivateMessageData,
    MessageType.CHARACTER_SELECTED: CharacterSelectedData,
    MessageType.PLAYER_READY: PlayerReadyData,
    MessageType.ALL_READY: AllReadyData,
    MessageType.GAME_STARTED: GameStartedData,
    MessageType.STAGE_CHANGED: StageChangedData,
    MessageType.PLAYER_ACTION: PlayerActionData,
    MessageType.VOTE_STARTED: VoteStartedData,
    MessageType.VOTE_UPDATED: VoteUpdatedData,
    MessageType.CLUE_DISCOVERED: ClueDiscoveredData,
    MessageType.AI_MESSAGE: AIMessageData,
}

class WebSocketMessage(BaseModel):
    """WebSocket消息统一格式"""
    type: str
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

def create_message(message_type: MessageType, data: Any = None) -> Dict[str, Any]:
    """创建标准WebSocket消息"""
    from datetime import datetime
    
    message = {
        "type": message_type.value,
        "timestamp": datetime.now().isoformat()
    }
    
    if data is not None:
        message["data"] = data
    
    return message

def create_error_message(error_msg: str, error_code: Optional[str] = None) -> Dict[str, Any]:
    """创建错误消息"""
    return create_message(MessageType.ERROR, {
        "message": error_msg,
        "code": error_code
    })

def create_success_message(message_type: MessageType, data: Any) -> Dict[str, Any]:
    """创建成功消息"""
    return create_message(message_type, data)

# 消息验证函数
def validate_incoming_message(message_type: str, data: Dict[str, Any]) -> bool:
    """验证接收到的消息格式"""
    try:
        msg_type = MessageType(message_type)
        if msg_type in INCOMING_MESSAGE_TYPES:
            return True
        return False
    except ValueError:
        return False

def validate_outgoing_message(message_type: MessageType, data: Any) -> bool:
    """验证发出消息格式"""
    try:
        if message_type in OUTGOING_MESSAGE_TYPES:
            data_class = OUTGOING_MESSAGE_TYPES[message_type]
            if data_class == dict:
                return isinstance(data, dict)
            else:
                # 对于有具体数据类的，可以进行更严格的验证
                return True
        return False
    except Exception:
        return False
