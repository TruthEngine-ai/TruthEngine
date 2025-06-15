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
    CharacterStageGoals, ScriptClues, Users, GameRooms, ScriptTimeline
)
from model.dto.response import ApiResponse
from model.dto.ScriptsDto import CreateScriptRequest, GenerateScriptResponse
from conf.config import settings
from .auth_api import get_current_user

router = APIRouter(prefix="/api/scripts", tags=["剧本管理"])



async def call_ai_api(prompt: str, max_retries: int = 1) -> str:
    """调用 AI 接口生成剧本内容，使用流式调用并带重试机制"""
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
            {"role": "user", "content": prompt},
        ],
        "temperature": settings.API_TEMPERATURE,
        "max_tokens": 65000,
        "max_output_tokens": 65000,  # 设置最大输出令牌数
        "stream": True  # 启用流式输出
    }
    
    logging.info(f"调用 AI API: {settings.API_URL}，模型: {settings.API_MODEL}（流式模式）")
    
    # 优化超时设置
    timeout = httpx.Timeout(
        connect=600.0,    # 连接超时（10分钟）
        read=1800.0,     # 读取超时（30分钟）- 流式调用需要更长时间
        write=600.0,      # 写入超时
        pool=600.0        # 连接池超时
    )
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                logging.info(f"AI API 流式调用尝试 {attempt + 1}/{max_retries}")
                
                async with client.stream('POST', settings.API_URL, json=payload, headers=headers) as response:
                    response.raise_for_status()
                    
                    # 收集流式响应
                    full_content = ""
                    async for chunk in response.aiter_text():
                        if chunk.strip():
                            # 处理每个数据块
                            for line in chunk.strip().split('\n'):
                                if line.startswith('data: '):
                                    data_content = line[6:].strip()
                                    if data_content == '[DONE]':
                                        continue
                                    
                                    try:
                                        # 解析每个流式响应块
                                        chunk_data = json.loads(data_content)
                                        if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                            delta = chunk_data['choices'][0].get('delta', {})
                                            content = delta.get('content', '')
                                            if content:
                                                full_content += content
                                    except json.JSONDecodeError:
                                        # 忽略无法解析的块
                                        continue
                    
                    if not full_content.strip():
                        raise ValueError("流式响应为空")
                    
                    logging.info(f"AI API 流式调用成功，返回内容长度: {len(full_content)}")
                    return full_content
                
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
        except (json.JSONDecodeError, ValueError) as e:
            last_error = f"响应解析错误: {str(e)}"
            logging.error(f"流式响应解析错误: {str(e)}")
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
    # """获取系统提示词"""
    return """# 角色
你是一位精通悬疑故事创作和逻辑游戏设计的AI剧本大师。你的核心优势在于构建严密的故事逻辑链和富有戏剧性的角色冲突。

# 任务
你的任务是根据用户提供的输入，生成一个完整、严谨、且充满戏剧性的AI剧本杀剧本。输出内容必须严格遵循指定的JSON格式，以便程序能够直接解析。

# 输入变量
你将根据以下用户提供的变量来创作剧本：
- **剧本主题 (Theme)**: 例如 "孤岛山庄", "赛博朋克都市", "民国旧案", "魔法学院"
- **玩家人数 (Player Count)**: 一个数字，例如 6
- **剧本难度 (Difficulty)**: '新手', '进阶', '烧脑'
- **AI主持人性格 (AI DM Personality)**: '严肃', '幽默', '神秘'
- **游戏时长 (Duration Mins)**: '30', '45', '60'

# 核心原则
1.  **JSON格式**: 你的最终输出必须是一个完整的、无语法错误的JSON对象。禁止在JSON代码块前后添加任何额外的解释或文字。
2.  **全局逻辑自洽 (最重要!)**: 这是最高原则。故事的`overview`、所有角色的背景、个人任务(`character_goals`)和时间线(`timeline`)必须形成一个无懈可击的逻辑闭环。凶手的真实行为必须与所有无法被伪造的线索相符。
3.  **任务驱动**: 每个角色在剧本中都应有明确的个人任务(`character_goals`)，这些任务是玩家的行动指南。凶手的任务应围绕掩盖罪行和嫁祸他人展开；其他角色的任务则可能包含洗清嫌疑、寻找真相、保护秘密或实现个人目的。
4.  **线索的目的性**: 每个线索的存在都必须有其目的。线索**必须**是角色完成其个人阶段任务(`character_goals`)的关键，或是推动主线剧情、指向/排除嫌疑人的核心。避免出现与任何任务、人物、时间线都无关的无效线索。
5.  **唯一凶手**: 在所有角色中，必须有且仅有一个角色的 `is_murderer` 字段为 `true`。
6.  **凶手时间线伪装**: 凶手角色必须有两条时间线记录。一条是公开的、经过伪造的伪证词 (`is_public: true`)，另一条是隐藏的、真实的作案时间线 (`is_public: false`)。其他所有非凶手角色只应有一条公开的时间线。
7.  **叙事递进**: 故事阶段(`stages`)必须有清晰的逻辑递进关系（例如：案发 -> 初步调查 -> 深层秘密 -> 指认凶手），形成一个完整的故事链。
8.  **结构完整性**: 必须包含所有指定的模块。线索需通过`is_public`和`owner_character_name`字段区分公开与私有。每个阶段至少有一个新线索，且每个角色至少持有一个私有线索。

# 输出JSON结构模板
请严格按照以下结构填充内容：

{
  "script": {
    "title": "剧本标题",
    "description": "吸引人的剧本简介，介绍背景和悬念。",
    "player_count": "[玩家人数]",
    "difficulty": "[剧本难度]",
    "tags": "根据主题生成的标签，用逗号分隔，例如'现代,悬疑,本格'",
    "ai_dm_personality": "[AI主持人性格]",
    "duration_mins": "[游戏时长]"
  },
  "story": {
    "overview": "对案件的整体说明。例如：'今日凌晨，户部尚书张敬之被发现死在锁月亭旁的古井中。他身着朝服，头颅有明显钝器伤痕。仵作初步推断死亡时间为昨晚子时（23:00-01:00）。现场发现一把沾血的玉如意...'",
    "timeline": [
      {
        "character": "角色A名称",
        "is_public": true,
        "statement": "角色A的公开时间线陈述。"
      },
      {
        "character": "凶手角色名称",
        "is_public": true,
        "statement": "凶手伪造的公开时间线陈述。"
      },
      {
        "character": "凶手角色名称",
        "is_public": false,
        "statement": "凶手真实的作案时间线，仅供AI和最终复盘使用。"
      }
    ]
  },
  "characters": [
    {
      "name": "角色A名称",
      "gender": "男/女/不限",
      "is_murderer": false,
      "backstory": "角色的详细背景故事，只有该玩家可见。包含其秘密和动机。",
      "public_info": "所有玩家可见的角色介绍，例如身份、职业、与死者的关系。",
      "character_goals": [
        {
          "stage_number": 1,
          "goal": "第一阶段的个人任务。例如：'找到证据，证明你昨晚亥时后没有离开过东偏殿。'"
        },
        {
          "stage_number": 2,
          "goal": "第二阶段的个人任务。例如：'查明密信的寄件人是谁，并找出他/她的目的。'"
        }
      ]
    }
  ],
  "stages": [
    {
      "stage_number": 1,
      "name": "第一幕：迷雾初现",
      "opening_narrative": "本阶段的开场白，由AI主持人朗读，需要符合其性格。描述场景、气氛和刚刚发生的事件。",
      "stage_goal": "本阶段的总体目标，供AI理解，例如：'让玩家熟悉各自身份并进行第一轮搜证，初步锁定嫌疑人范围。'"
    }
  ],
  "clues": [
    {
      "name": "公开线索名称，例如'沾血的玉如意'",
      "description": "线索的详细描述，例如'一把上等和田玉雕琢的如意，底部沾有血迹。如意上刻有一个小小的'瑾'字。'",
      "discovery_stage_id": 1,
      "discovery_location": "发现地点，例如'锁月亭古井旁'",
      "is_public": true,
      "owner_character_name": null
    },
    {
      "name": "私有线索名称，例如'一封密信'",
      "description": "线索的详细描述，例如'在你枕下发现一封密信，上面写着：张大人，您若再逼迫我，休怪我鱼死网破。信没有署名。'",
      "discovery_stage_id": 1,
      "discovery_location": "角色A的房间",
      "is_public": false,
      "owner_character_name": "角色A名称"
    }
  ],
  "solution": {
    "answer": "凶手揭晓，如'凶手是翠屏。'",
    "reasoning": "案件详细复盘，必须形成严密的证据链。清晰地阐述动机、作案手法和时间线。最重要的是，必须明确指出【哪个线索】证明了【哪个论点】，最终所有论点如何共同指向真凶，并排除其他所有人。例如：'翠屏的作案动机是[动机]。作案手法是[手法]。证据链如下：1. 【线索A：带血的匕首】是真正的凶器，这与翠屏的个人任务【隐藏匕首】相关联，证明她接触过凶器。2. 【线索B：李清然的证词】提到在子时听到湖边有异响，这与翠屏伪造的【在西偏殿从未离开】的时间线产生矛盾。3. 【线索C：玉如意】上的'瑾'字是为了嫁祸李瑾瑜，但【线索D：密信残片】的内容只有翠屏和死者知道，证明她与死者有直接冲突。通过以上线索，可以构建出翠屏的完整作案过程并排除其他嫌疑人。'"
  }
}"""

def create_user_prompt(theme: str, player_count: int, difficulty: str, ai_personality: str, duration_mins: int) -> str:
    # """创建用户提示词"""
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
        
        # print(f"AI 响应内容: {script_data}")  # 调试输出，查看 AI 返回的内容
        
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
                status="草稿",
                overview=script_data["story"]["overview"], 
                solution = script_data["solution"]
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
                character = characters_map.get(clue_data["owner_character_name"])
                await ScriptClues.create(
                    script=script,
                    name=clue_data["name"],
                    description=clue_data["description"],
                    discovery_stage=discovery_stage,
                    discovery_location=clue_data["discovery_location"],
                    is_public=clue_data["is_public"],
                    # clue_goal_connection = clue_data["clue_goal_connection"],
                    character = character if character else None
                )
            
            # 创建剧本时间线
            if "story" in script_data and "timeline" in script_data["story"]:
                for timeline_data in script_data["story"]["timeline"]:
                    character = characters_map.get(timeline_data["character"])
                    if character:
                        await ScriptTimeline.create(
                            script=script,
                            character=character,
                            event_description=timeline_data.get("statement", ""),
                            sys_description=timeline_data.get("statement", ""),
                            is_public=timeline_data.get("is_public", True)
                        )
                    else:
                        # 如果没有找到对应角色，记录日志但不影响流程
                        logging.warning(f"未找到角色 '{timeline_data.get('character')}' 对应的时间线数据")
            
            # 创建角色阶段目标
            for char_data in script_data["characters"]:
                character = characters_map.get(char_data["name"])
                if character and "character_goals" in char_data:
                    for goal_data in char_data["character_goals"]:
                        stage = stages_map.get(goal_data["stage_number"])
                        if stage:
                            await CharacterStageGoals.create(
                                character=character,
                                stage=stage,
                                goal_description=goal_data["goal"],
                                is_mandatory=True,
                                search_attempts=1  # 默认每阶段1次搜查机会
                            )
                        else:
                            logging.warning(f"未找到阶段 {goal_data['stage_number']} 对应的角色任务数据")
            
            return script.id
            
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI 响应 JSON 解析失败: {str(e)}")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"AI 响应缺少必要字段: {str(e)}")
    except IntegrityError as e:
        raise HTTPException(status_code=500, detail=f"数据库保存失败: {str(e)}")

@router.post("/generate", response_model=ApiResponse)
async def generate_script(request: CreateScriptRequest, current_user: Annotated[Users, Depends(get_current_user)]):
    """生成剧本"""
    try:
        # 验证房间存在且用户为房主
        room = await GameRooms.get(room_code=request.room_code)
        if room.host_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="只有房主可以生成剧本")
        
        # 通知WebSocket（如果房间有连接的用户）
        try:
            from websocket.connection_manager import manager
            from model.ws.notification_types import MessageType, create_message, create_formatted_data
            
            # 获取用户昵称
            user = await Users.get(id=current_user.id)
            
            # 通知剧本生成开始
            await manager.broadcast_to_room(request.room_code, create_message(MessageType.SCRIPT_GENERATION_STARTED,
                create_formatted_data(
                    message=f"{user.nickname} 开始生成剧本...",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
        except Exception as ws_error:
            # WebSocket通知失败不影响主流程
            print(f"WebSocket通知失败: {str(ws_error)}")
        
        # 创建用户提示词
        user_prompt = create_user_prompt(
            request.theme,
            room.max_players,
            request.difficulty,
            request.ai_dm_personality,
            request.duration_mins
        )
        
        # 调用 AI 接口
        ai_response = await call_ai_api(user_prompt)
        print(f"AI Response: {ai_response}")
        # 解析并保存到数据库
        script_id = await parse_and_save_script(ai_response, current_user.id, room.max_players, request.duration_mins)
        
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
        
        # 通知WebSocket剧本生成完成
        try:
            await manager.broadcast_to_room(request.room_code, create_message(MessageType.SCRIPT_GENERATION_COMPLETED,
                create_formatted_data(
                    message=f"剧本生成完成：{script.title}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from websocket.websocket_routes import broadcast_room_status
            await broadcast_room_status(request.room_code)
        except Exception as ws_error:
            print(f"WebSocket通知失败: {str(ws_error)}")
        
        return ApiResponse(
            code=200,
            msg="剧本生成成功",
            data={
                "script_id": script.id,
                "characters": characters
            }
        )
        
    except HTTPException:
        # 通知WebSocket剧本生成失败
        try:
            await manager.broadcast_to_room(request.room_code, create_message(MessageType.SCRIPT_GENERATION_FAILED,
                create_formatted_data(
                    message="剧本生成失败",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
        except:
            pass
        raise   
    except Exception as e:
        # 通知WebSocket剧本生成失败
        try:
            await manager.broadcast_to_room(request.room_code, create_message(MessageType.SCRIPT_GENERATION_FAILED,
                create_formatted_data(
                    message=str(e),
                    send_id=None,
                    send_nickname="系统"
                )
            ))
        except:
            pass
        raise HTTPException(status_code=500, detail=f"生成剧本失败: {str(e)}")
















