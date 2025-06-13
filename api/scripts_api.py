from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Annotated
import json
import httpx
import asyncio
import logging
from tortoise.exceptions import IntegrityError
from tortoise.transactions import in_transaction

from model.entity.Scripts import (
    Scripts, ScriptStages, ScriptCharacters, 
    CharacterStageGoals, ScriptClues, Users, GameRooms
)
from model.dto.response import ApiResponse
from model.dto.ScriptsDto import CreateScriptRequest, GenerateScriptResponse
from conf.config import settings
from .auth_api import get_current_user
from models.database import User as UserModel

router = APIRouter(prefix="/api/scripts", tags=["剧本管理"])



async def call_ai_api(prompt: str, max_retries: int = 1) -> str:
    """调用 AI 接口生成剧本内容，带重试机制"""
    if not settings.API_URL or not settings.API_KEY:
        raise HTTPException(status_code=500, detail="AI 配置未设置")
    
    headers = {
        "Authorization": f"Bearer {settings.API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": settings.API_MODEL,
        "messages": [
            {"role": "system", "content": get_system_prompt()},
            {"role": "user", "content": prompt}
        ],
        "temperature": settings.API_TEMPERATURE,
        "max_tokens": 4096
    }
    
    # 优化超时设置
    timeout = httpx.Timeout(
        connect=60.0,    # 连接超时（1分钟）
        read=900.0,      # 读取超时（15分钟）
        write=60.0,      # 写入超时
        pool=60.0        # 连接池超时
    )
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                logging.info(f"AI API 调用尝试 {attempt + 1}/{max_retries}")
                
                response = await client.post(settings.API_URL, json=payload, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                logging.info(f"AI API 调用成功，返回内容长度: {len(content)}")
                return content
                
        except httpx.ConnectTimeout:
            last_error = "连接超时"
            logging.warning(f"第 {attempt + 1} 次尝试连接超时")
        except httpx.ReadTimeout:
            last_error = "读取超时"
            logging.warning(f"第 {attempt + 1} 次尝试读取超时")
        except httpx.RemoteProtocolError as e:
            last_error = f"协议错误: {str(e)}"
            logging.warning(f"第 {attempt + 1} 次尝试协议错误: {str(e)}")
        except httpx.NetworkError as e:
            last_error = f"网络错误: {str(e)}"
            logging.warning(f"第 {attempt + 1} 次尝试网络错误: {str(e)}")
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP 状态错误: {e.response.status_code}"
            logging.error(f"HTTP 错误 {e.response.status_code}: {e.response.text}")
            # 对于 4xx 错误，不重试
            if 400 <= e.response.status_code < 500:
                raise HTTPException(status_code=500, detail=f"AI 接口调用失败: {last_error}")
        except KeyError as e:
            last_error = f"响应格式错误: {str(e)}"
            logging.error(f"AI 响应格式错误: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI 响应格式错误: {str(e)}")
        except Exception as e:
            last_error = f"未知错误: {str(e)}"
            logging.error(f"第 {attempt + 1} 次尝试未知错误: {str(e)}")
        
        # 如果不是最后一次尝试，等待后重试
        if attempt < max_retries - 1:
            wait_time = (attempt + 1) * 5  # 递增等待时间：5秒、10秒、15秒
            logging.info(f"等待 {wait_time} 秒后重试...")
            await asyncio.sleep(wait_time)
    
    # 所有重试都失败了
    raise HTTPException(status_code=500, detail=f"AI 接口调用失败，已重试 {max_retries} 次。最后错误: {last_error}")

def get_system_prompt() -> str:
    """获取系统提示词"""
    return """# 角色
你是一位精通悬疑故事创作和逻辑游戏设计的AI剧本大师。

# 任务
你的任务是根据用户提供的输入，生成一个完整、严谨、且充满戏剧性的AI剧本杀剧本。输出内容必须严格遵循指定的JSON格式，以便程序能够直接解析并存入数据库。

# 输入变量
你将根据以下用户提供的变量来创作剧本：
- **剧本主题 (Theme)**: 例如 "孤岛山庄", "赛博朋克都市", "民国旧案", "魔法学院"
- **玩家人数 (Player Count)**: 一个数字，例如 6
- **剧本难度 (Difficulty)**: '新手', '进阶', '烧脑'
- **AI主持人性格 (AI DM Personality)**: '严肃', '幽默', '神秘'
- **游戏时长 (Duration Mins)**: '30', '45', '60'

# 核心规则
1.  **JSON格式**: 你的最终输出必须是一个完整的、无语法错误的JSON对象。不要在JSON代码块前后添加任何额外的解释或文字。
2.  **逻辑自洽 (最重要!)**: 每个阶段 (`stages`) 中可被发现的线索 (`clues`) 必须是玩家完成该阶段个人任务 (`character_stage_goals`) 的关键。你必须在每个线索的 `clue_goal_connection` 字段中明确说明该线索如何帮助哪个角色完成哪个任务。这是确保剧本可玩性的核心。
3.  **唯一凶手**: 在所有角色中，必须有且仅有一个角色的 `is_murderer` 字段为 `true`。
4.  **叙事递进**: 故事阶段 (`stages`) 必须有清晰的逻辑递进关系（例如：案发 -> 初步调查 -> 深层秘密 -> 指认凶手），形成一个完整的故事链。
5.  **角色一致性**: 角色的背景故事 (`backstory`) 和公开信息 (`public_info`) 必须与其在各个阶段的任务 (`goal_description`) 保持高度一致，不能出现逻辑矛盾。

# 输出JSON结构模板
请严格按照以下结构填充内容：

{
  "script": {
    "title": "剧本标题",
    "description": "吸引人的剧本简介，介绍背景和悬念。",
    "player_count": [玩家人数],
    "difficulty": "[剧本难度]",
    "tags": "根据主题生成的标签，用逗号分隔，例如'现代,悬疑,本格'",
    "ai_dm_personality": "[AI主持人性格]"
    "duration_mins":"[游戏时长]"
  },
  "characters": [
    {
      "name": "角色A名称",
      "gender": "男/女/不限",
      "is_murderer": false,
      "backstory": "角色的详细背景故事，只有该玩家可见。",
      "public_info": "所有玩家可见的角色介绍，例如身份、职业、与死者的关系。"
    }
  ],
  "stages": [
    {
      "stage_number": 1,
      "name": "第一幕：迷雾初现",
      "opening_narrative": "本阶段的开场白，由AI主持人朗读，需要符合其性格。描述场景、气氛和刚刚发生的事件。",
      "stage_goal": "本阶段的总体目标，供AI理解，例如：'让玩家熟悉各自身份并进行第一轮自我介绍，初步锁定嫌疑人范围。'"
    }
  ],
  "clues": [
    {
      "name": "线索1名称，例如'一张撕碎的照片'",
      "description": "线索的详细描述，例如'照片被撕成两半，一半是死者，另一半的边缘可以看到一只戴着红宝石戒指的手。'",
      "discovery_stage_id": 1,
      "discovery_location": "发现地点，例如'死者的卧室'",
      "is_public": true,
      "clue_goal_connection": "【关键逻辑】解释此线索如何帮助玩家完成任务。例如：'此线索帮助【角色B】完成ta在阶段1的任务"寻找证明自己清白的证据"，因为戒指是【角色C】的。'"
    }
  ],
  "character_stage_goals": [
    {
      "character_name": "角色A名称",
      "stage_number": 1,
      "goal_description": "角色A在阶段1的私密任务/剧本。例如：'你的任务是隐藏你昨晚去过死者房间的事实，并想办法引导大家怀疑【角色B】。'"
    }
  ]
}"""

def create_user_prompt(theme: str, player_count: int, difficulty: str, ai_personality: str, duration_mins: int) -> str:
    """创建用户提示词"""
    return f"""# 开始生成
现在，请根据以下输入生成剧本：
- **剧本主题**: {theme}
- **玩家人数**: {player_count}
- **剧本难度**: {difficulty}
- **AI主持人性格**: {ai_personality}
- **游戏时长**: {duration_mins}分钟"""

async def parse_and_save_script(ai_response: str, author_id: int, play_count:int, duration_mins: int) -> int:
    """解析 AI 响应并保存到数据库"""
    try:
        # 清理 AI 响应，移除可能的代码块标记
        response_content = ai_response.strip()
        if response_content.startswith("```json"):
            response_content = response_content[7:]
        if response_content.endswith("```"):
            response_content = response_content[:-3]
        response_content = response_content.strip()
        
        # 解析 JSON
        script_data = json.loads(response_content)
        
        async with in_transaction():
            # 验证作者存在
            author = await Users.get(id=author_id)
            
            # 创建剧本主体
            script = await Scripts.create(
                title=script_data["script"]["title"],
                description=script_data["script"]["description"],
                player_count_min=play_count,#script_data["script"]["player_count"],
                player_count_max=play_count,#script_data["script"]["player_count"],
                duration_mins=duration_mins,  # 使用传入的时长参数
                difficulty=script_data["script"]["difficulty"],
                tags=script_data["script"]["tags"],
                author=author,
                status="草稿"
            )
            
            # 创建故事阶段
            stages_map = {}
            for stage_data in script_data["stages"]:
                stage = await ScriptStages.create(
                    script=script,
                    stage_number=stage_data["stage_number"],
                    name=stage_data["name"],
                    opening_narrative=stage_data["opening_narrative"],
                    stage_goal=stage_data["stage_goal"]
                )
                stages_map[stage_data["stage_number"]] = stage
            
            # 创建角色
            characters_map = {}
            for char_data in script_data["characters"]:
                character = await ScriptCharacters.create(
                    script=script,
                    name=char_data["name"],
                    gender=char_data["gender"],
                    is_murderer=char_data["is_murderer"],
                    backstory=char_data["backstory"],
                    public_info=char_data["public_info"]
                )
                characters_map[char_data["name"]] = character
            
            # 创建线索
            for clue_data in script_data["clues"]:
                discovery_stage = stages_map.get(clue_data["discovery_stage_id"])
                await ScriptClues.create(
                    script=script,
                    name=clue_data["name"],
                    description=clue_data["description"],
                    discovery_stage=discovery_stage,
                    discovery_location=clue_data["discovery_location"],
                    is_public=clue_data["is_public"]
                )
            
            # 创建角色阶段目标
            for goal_data in script_data["character_stage_goals"]:
                character = characters_map.get(goal_data["character_name"])
                stage = stages_map.get(goal_data["stage_number"])
                if character and stage:
                    await CharacterStageGoals.create(
                        character=character,
                        stage=stage,
                        goal_description=goal_data["goal_description"],
                        is_mandatory=True
                    )
            
            return script.id
            
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI 响应 JSON 解析失败: {str(e)}")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"AI 响应缺少必要字段: {str(e)}")
    except IntegrityError as e:
        raise HTTPException(status_code=500, detail=f"数据库保存失败: {str(e)}")

@router.post("/generate", response_model=ApiResponse)
async def generate_script(request: CreateScriptRequest, current_user: Annotated[UserModel, Depends(get_current_user)]):
    """生成剧本"""
    try:
        # 验证房间存在且用户为房主
        room = await GameRooms.get(room_code=request.room_code)
        if room.host_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="只有房主可以生成剧本")
        
        # 创建用户提示词
        user_prompt = create_user_prompt(
            request.theme,
            room.max_players,
            request.difficulty,
            request.ai_dm_personality,
            request.duration_mins
        )
        
        # 调用 AI 接口
        # ai_response = await call_ai_api(user_prompt)
        
        # print(f"AI Response: {ai_response}")
        # # 解析并保存到数据库
        # script_id = await parse_and_save_script(ai_response, current_user.id, root.max_player, request.duration_mins)
        
        script_id = 4 # 模拟生成的剧本ID
        
        # 将剧本关联到房间
        room = await GameRooms.get(room_code=request.room_code)
        room.script_id = script_id
        await room.save()
        
        # 获取生成的剧本信息和角色信息
        script = await Scripts.get(id=script_id).prefetch_related('characters')
        
        # 构建角色信息列表
        characters = []
        for character in script.characters:
            characters.append({
                "id": character.id,
                "name": character.name,
                "gender": character.gender,
                "public_info": character.public_info
            })
        
        return ApiResponse(
            code=200,
            msg="剧本生成成功",
            data={
                "script_id": script.id,
                "characters": characters
            }
        )
        
    except HTTPException:
        raise   
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成剧本失败: {str(e)}")











