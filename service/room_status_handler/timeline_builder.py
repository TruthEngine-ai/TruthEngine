from typing import Dict, Any
from model.entity.Scripts import GameRooms

async def build_story_timeline_info(script, user_id: int, room: GameRooms) -> Dict[str, Any]:
    """构建剧本时间线信息"""
    if not script:
        return {"public": [], "private": []}
    
    # 获取当前用户的角色
    current_character = None
    for player in room.players:
        if player.user.id == user_id and player.character:
            current_character = player.character
            break
    
    from model.entity.Scripts import ScriptTimeline
    
    # 获取公开时间线，预加载 character 关系
    public_timeline = await ScriptTimeline.filter(
        script=script,
        is_public=True
    ).prefetch_related('character').order_by('created_at').all()
    
    # 获取当前角色的私有时间线，预加载 character 关系
    private_timeline = []
    if current_character:
        private_timeline = await ScriptTimeline.filter(
            script=script,
            character=current_character,
            is_public=False
        ).prefetch_related('character').order_by('created_at').all()
    
    # 构建公开时间线信息
    public_events = []
    for event in public_timeline:
        public_events.append({
            "id": event.id,
            "event_description": event.event_description,
            "sys_description": event.sys_description,
            "character_name": event.character.name if event.character else None,
            "is_public": event.is_public,
            "created_at": event.created_at.isoformat()
        })
    
    # 构建私有时间线信息
    private_events = []
    for event in private_timeline:
        private_events.append({
            "id": event.id,
            "event_description": event.event_description,
            "sys_description": event.sys_description,
            "character_name": event.character.name if event.character else None,
            "is_public": event.is_public,
            "created_at": event.created_at.isoformat()
        })
    
    return {
        "public": public_events,
        "private": private_events
    }
