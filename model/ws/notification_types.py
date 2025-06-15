from enum import Enum
from typing import Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field

class MessageType(str, Enum):
    """消息类型枚举"""
    # 连接相关
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    
    # 房间状态相关
    ROOM_STATUS = "room_status"
    ROOM_SETTINGS_UPDATED = "room_settings_updated"
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
    
    #搜证相关
    SEARCH_BEGIN = "search_begin"
    SEARCH_END = "search_end"
    SEARCH_SCRIPT_CLUE = "search_script_clue"
    
    # AI DM相关
    AI_MESSAGE = "ai_message"
    AI_PROMPT = "ai_prompt"
    
    # 房间设置相关
    UPDATE_ROOM_SETTINGS = "update_room_settings"
    
    
    # 游戏状态相关
    GAME_STATUS = "game_status"
    GAME_PHASE_CHANGED = "game_phase_changed"  # 游戏阶段变更
    NEXT_STAGE = "next_stage"  # 进入下一阶段
    
    # 剧本生成相关
    GENERATE_SCRIPT = "generate_script"
    SCRIPT_GENERATION_STARTED = "script_generation_started"
    SCRIPT_GENERATION_COMPLETED = "script_generation_completed"
    SCRIPT_GENERATION_FAILED = "script_generation_failed"

# 接收消息数据模型
class ChatMessageData(BaseModel):
    """聊天消息数据"""
    message: str = Field(..., min_length=1, max_length=1000)

class SelectCharacterData(BaseModel):
    """选择角色数据"""
    character_id: int = Field(..., gt=0)

class ReadyData(BaseModel):
    """准备状态数据"""
    ready: bool

class StartGameData(BaseModel):
    """开始游戏数据"""
    pass

class PlayerActionData(BaseModel):
    """玩家行动数据"""
    action: str = Field(..., min_length=1, max_length=500)

class PrivateMessageData(BaseModel):
    """私聊消息数据"""
    recipient_id: int = Field(..., gt=0)
    message: str = Field(..., min_length=1, max_length=1000)

class GameVoteData(BaseModel):
    """游戏投票数据"""
    vote_type: str = Field(..., min_length=1)
    option: str = Field(..., min_length=1)

class UpdateRoomSettingsData(BaseModel):
    """更新房间设置数据"""
    theme: Optional[str] = Field(None, max_length=100)
    difficulty: Optional[str] = Field(None)
    ai_dm_personality: Optional[str] = Field(None, max_length=100)
    duration_mins: Optional[int] = Field(None, gt=0, le=480)

class GenerateScriptData(BaseModel):
    """生成剧本数据"""
    theme: str = Field(..., min_length=1, max_length=100)
    difficulty: str 
    ai_dm_personality: str = Field(..., min_length=1, max_length=100)
    duration_mins: int = Field(..., gt=0, le=480)

class RequestGameStatusData(BaseModel):
    """请求游戏状态数据"""
    pass

class SearchScriptClueData(BaseModel):
    """搜查线索数据"""
    clue_id: int = Field(..., gt=0)

# 接收消息类型映射
INCOMING_MESSAGE_TYPES = {
    MessageType.CHAT: ChatMessageData,
    MessageType.SELECT_CHARACTER: SelectCharacterData,
    MessageType.READY: ReadyData,
    MessageType.START_GAME: StartGameData,
    MessageType.PLAYER_ACTION: PlayerActionData,
    MessageType.PRIVATE_MESSAGE: PrivateMessageData,
    MessageType.GAME_VOTE: GameVoteData,
    MessageType.UPDATE_ROOM_SETTINGS: UpdateRoomSettingsData,
    MessageType.GENERATE_SCRIPT: None,  # 生成剧本不需要额外数据，使用空数据模型
    MessageType.SEARCH_BEGIN: None,  # 搜证开始不需要额外数据，使用空数据模型
    MessageType.SEARCH_END: None,  # 搜证结束不需要额外数据，使用空数据模型
    MessageType.SEARCH_SCRIPT_CLUE: SearchScriptClueData,  # 搜查线索需要线索ID
    MessageType.NEXT_STAGE: None,
}

# 发出消息类型映射 - 使用标准格式
OUTGOING_MESSAGE_TYPES = {
    MessageType.CONNECTED: dict,
    MessageType.ERROR: dict,
    MessageType.ROOM_STATUS: dict,
    MessageType.ROOM_SETTINGS_UPDATED: dict,
    MessageType.PLAYER_JOINED: dict,
    MessageType.PLAYER_LEFT: dict,
    MessageType.CHAT: dict,
    MessageType.PRIVATE_MESSAGE: dict,
    MessageType.CHARACTER_SELECTED: dict,
    MessageType.PLAYER_READY: dict,
    MessageType.ALL_READY: dict,
    MessageType.GAME_STARTED: dict,
    
    MessageType.STAGE_CHANGED: dict,
    MessageType.PLAYER_ACTION: dict,
    MessageType.VOTE_STARTED: dict,
    MessageType.VOTE_UPDATED: dict,
    MessageType.CLUE_DISCOVERED: dict,
    MessageType.AI_MESSAGE: dict,
    MessageType.SCRIPT_GENERATION_STARTED: dict,
    MessageType.SCRIPT_GENERATION_COMPLETED: dict,
    MessageType.SCRIPT_GENERATION_FAILED: dict,
}

def create_message(message_type: MessageType, data: Any = None) -> Dict[str, Any]:
    """创建标准WebSocket消息"""
    from datetime import datetime
    
    # 对于状态类消息，保持原有data结构
    if message_type in [MessageType.ROOM_STATUS]:
        return {
            "type": message_type.value,
            "data": data
        }
    
    # 其他消息类型使用统一格式（data已经被预格式化）
    message = {
        "type": message_type.value,
        "data": data if data else {
            "message": "",
            "datetime": datetime.now().isoformat(),
            "send_id": None,
            "send_nickname": "",
            "recipient_id": None,
            "recipient_nickname": ""
        }
    }
    
    return message

def create_formatted_data(message: str, send_id: Optional[int] = None, send_nickname: str = "", 
                         recipient_id: Optional[int] = None, recipient_nickname: str = "") -> Dict[str, Any]:
    """创建格式化的消息数据"""
    from datetime import datetime
    
    return {
        "message": message,
        "datetime": datetime.now().isoformat(),
        "send_id": send_id,
        "send_nickname": send_nickname,
        "recipient_id": recipient_id,
        "recipient_nickname": recipient_nickname
    }

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
def validate_incoming_message(message_type: str, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """验证接收到的消息格式"""
    try:
        msg_type = MessageType(message_type)
        if msg_type not in INCOMING_MESSAGE_TYPES:
            return False, f"不支持的消息类型: {message_type}"
        
        data_class = INCOMING_MESSAGE_TYPES[msg_type]
        try:
            # 使用pydantic进行数据验证
            if hasattr(data_class, 'parse_obj'):
                data_class.parse_obj(data)
            return True, None
        except Exception as e:
            return False, f"数据格式错误: {str(e)}"
            
    except ValueError:
        return False, f"无效的消息类型: {message_type}"

def parse_incoming_message(message_type: str, data: Dict[str, Any]) -> Any:
    """解析并验证接收到的消息数据"""
    try:
        msg_type = MessageType(message_type)
        if msg_type in INCOMING_MESSAGE_TYPES:
            data_class = INCOMING_MESSAGE_TYPES[msg_type]
            if hasattr(data_class, 'parse_obj'):
                return data_class.parse_obj(data)
            else:
                # 对于普通dict类型，直接返回数据
                return {}
        elif message_type == MessageType.NEXT_STAGE.value:
            return NextStageData()
        elif message_type == MessageType.REQUEST_GAME_STATUS.value:
            return RequestGameStatusData()
        
        return None
    except Exception as e:
        print(f"解析消息数据失败: {str(e)}")
        return None


