from pydantic import BaseModel

from .response import ApiResponse


class CreateScriptRequest(BaseModel):
    theme: str
    player_count: int
    difficulty: str
    ai_dm_personality: str
    author_id: int
    duration_mins: int = 90  # 添加游戏时长参数，默认90分钟

class GenerateScript(BaseModel):
    script_id: int
    # title: str
    script_info: str
    
class GenerateScriptResponse(ApiResponse[GenerateScript]):
    pass