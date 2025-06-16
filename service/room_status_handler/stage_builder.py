from typing import Optional, Dict, Any
from model.entity.Scripts import GameRooms, CharacterStageGoals

async def build_stage_info(room: GameRooms, user_id: int = None) -> Optional[Dict[str, Any]]:
    """构建当前阶段信息和历史阶段信息"""
    if not room.current_stage or not room.script:
        return None
    
    # 获取当前用户的角色
    current_character = None
    if user_id:
        for player in room.players:
            if player.user.id == user_id and player.character:
                current_character = player.character
                break
    
    # 获取当前阶段及之前的所有阶段
    stages = await room.script.stages.filter(
        stage_number__lte=room.current_stage.stage_number
    ).order_by('stage_number').all()
    
    # 构建阶段信息列表
    stages_info = []
    for stage in stages:
        stage_info = {
            "stage_number": stage.stage_number,
            "name": stage.name,
            "opening_narrative": stage.opening_narrative,
            "stage_goal": stage.stage_goal,
            "is_evidence": stage.is_evidence,
            "is_current": stage.id == room.current_stage.id
        }
        
        # 如果有当前角色，添加该角色在此阶段的任务
        if current_character:
            stage_goal = await CharacterStageGoals.filter(
                character=current_character,
                stage=stage
            ).first()
            
            if stage_goal:
                stage_info["character_goal"] = {
                    "goal_description": stage_goal.goal_description,
                    "is_mandatory": stage_goal.is_mandatory,
                    "search_attempts": stage_goal.search_attempts
                }
            else:
                stage_info["character_goal"] = None
        
        stages_info.append(stage_info)
    
    # 构建当前阶段的详细信息
    current_stage_info = {
        "stage_number": room.current_stage.stage_number,
        "name": room.current_stage.name,
        "opening_narrative": room.current_stage.opening_narrative,
        "stage_goal": room.current_stage.stage_goal,
        "is_evidence": room.current_stage.is_evidence
    }
    
    # 为当前阶段添加角色任务
    if current_character:
        current_stage_goal = await CharacterStageGoals.filter(
            character=current_character,
            stage=room.current_stage
        ).first()
        
        if current_stage_goal:
            current_stage_info["character_goal"] = {
                "goal_description": current_stage_goal.goal_description,
                "is_mandatory": current_stage_goal.is_mandatory,
                "search_attempts": current_stage_goal.search_attempts
            }
        else:
            current_stage_info["character_goal"] = None
    
    return {
        "current_stage": current_stage_info,
        "all_stages": stages_info
    }
