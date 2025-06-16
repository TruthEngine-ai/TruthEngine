from typing import Dict, Any
from model.entity.Scripts import ScriptStages

async def build_script_info(script) -> Dict[str, Any]:
    """构建剧本基础信息"""
    if not script:
        return None
    
    # 获取剧本的总阶段数
    total_stages = await ScriptStages.filter(script=script).count()
    
    return {
        "id": script.id,
        "title": script.title,
        "description": script.description,
        "player_count_min": script.player_count_min,
        "player_count_max": script.player_count_max,
        "duration_mins": script.duration_mins,
        "difficulty": script.difficulty,
        "tags": script.tags.split(',') ,
        "overview": script.overview,
        "total_stages":total_stages
    }
