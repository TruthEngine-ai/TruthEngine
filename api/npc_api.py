from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import AIConfig
from utils.auth_util import get_current_user
from model.entity.Scripts import Users

router = APIRouter(prefix="/npc", tags=["NPC管理"])

@router.get("/aiconfigs", summary="获取所有启用的AI配置")
async def get_enabled_ai_configs(
    current_user: Users = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    获取所有启用的AI配置列表
    
    Returns:
        List[Dict]: AI配置列表，包含id、name、personality_type、strategy_type等信息
    """
    try:
        # 查询所有启用的AI配置
        ai_configs = await AIConfig.filter(is_enabled=True).all()
        
        # 格式化返回数据
        result = []
        for config in ai_configs:
            result.append({
                "id": config.id,
                "name": config.name,
                "personality_type": config.personality_type,
                "strategy_type": config.strategy_type,
                "response_random": config.response_random,
                "response_interval": config.response_interval,
                "created_at": config.created_at.isoformat() if config.created_at else None,
                "updated_at": config.updated_at.isoformat() if config.updated_at else None
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取AI配置失败: {str(e)}")

@router.get("/aiconfigs/{config_id}", summary="获取指定AI配置详情")
async def get_ai_config_detail(
    config_id: int,
    current_user: Users = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取指定AI配置的详细信息
    
    Args:
        config_id: AI配置ID
        
    Returns:
        Dict: AI配置详细信息
    """
    try:
        config = await AIConfig.get(id=config_id, is_enabled=True)
        
        return {
            "id": config.id,
            "name": config.name,
            "personality_type": config.personality_type,
            "strategy_type": config.strategy_type,
            "base_prompt": config.base_prompt,
            "response_templates": config.response_templates,
            "behavior_rules": config.behavior_rules,
            "response_random": config.response_random,
            "response_interval": config.response_interval,
            "created_at": config.created_at.isoformat() if config.created_at else None,
            "updated_at": config.updated_at.isoformat() if config.updated_at else None
        }
        
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="AI配置不存在或已禁用")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取AI配置详情失败: {str(e)}")
