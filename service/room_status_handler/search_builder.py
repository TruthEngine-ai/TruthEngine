from typing import Dict, Any
from model.entity.Scripts import GameRooms, ScriptClues, CharacterStageGoals
from websocket.connection_manager import manager

async def build_searchable_info(room: GameRooms, user_id: int) -> Dict[str, Any]:
    """构建搜证阶段的搜证信息"""
    if not room.current_stage or not room.script:
        return {"searchable_characters": [], "available_clues": [], "owned_clues": []}
    
    # 获取当前用户的角色和游戏玩家信息
    current_character = None
    current_player = None
    for player in room.players:
        if player.user.id == user_id:
            current_player = player
            if player.character:
                current_character = player.character
            break
    
    if not current_player or not current_character:
        return {"searchable_characters": [], "available_clues": [], "owned_clues": []}
    
    # 构建可搜证角色列表（除了自己）
    searchable_characters = []
    for player in room.players:
        if player.character and player.user.id != user_id :
            searchable_characters.append({
                "user_id": player.user.id,
                "nickname": player.user.nickname,
                "character_name": player.character.name,
                "character_id": player.character.id,
                "is_online": manager.is_user_connected(player.user.id)
            })
    
    # 获取当前用户已搜查到的线索
    owned_clues = []
    if current_player: 
        from model.entity.Scripts import SearchActions
        
        # 获取当前用户进行的搜查行动
        search_actions = await SearchActions.filter(
            game_player=current_player,
            stage__stage_number__lte=room.current_stage.stage_number
        ).prefetch_related('clues_found', 'clues_found__discovery_stage', 'stage', 'searchable_player__user','searchable_player__character').order_by('stage__stage_number').all()

        for action in search_actions:
            if action.clues_found:
                clue_info = {
                    "id": action.clues_found.id,
                    "name": action.clues_found.name,
                    "description": action.clues_found.description,
                    "image_url": action.clues_found.image_url,
                    "discovery_location": action.clues_found.discovery_location,
                    "discovery_stage": action.stage.name if action.stage else "未知阶段",
                    "stage_number": action.stage.stage_number if action.stage else 0,
                    "searched_from": action.searchable_player.user.nickname if action.searchable_player else "未知",
                    "searched_from_character": action.searchable_player.character.name if action.searchable_player and action.searchable_player.character else "未知角色",
                    "is_public_search": action.is_public,
                    "search_timestamp": action.created_at.isoformat()
                }
                owned_clues.append(clue_info)
    
    # 获取其他角色的未拥有线索（不包含具体内容，只显示线索名称和来源）
    available_clues = []
    
    # 获取当前阶段及之前所有阶段的所有线索（按角色分组）
    for searchable_char in searchable_characters:
        # 获取该角色在当前阶段及之前的私有线索
        char_clues = await ScriptClues.filter(
            script=room.script,
            discovery_stage__stage_number__lte=room.current_stage.stage_number,
            is_public=False,
            character_id=searchable_char["character_id"]
        ).prefetch_related('discovery_stage').order_by('discovery_stage__stage_number').all()
        
        for clue in char_clues:
            # 检查当前用户是否已经搜查到这个线索
            already_owned = any(owned_clue["id"] == clue.id for owned_clue in owned_clues)
            
            if not already_owned:
                clue_info = {
                    "id": clue.id,
                    "name": clue.name,
                    "discovery_location": clue.discovery_location,
                    "discovery_stage": clue.discovery_stage.name if clue.discovery_stage else "未知阶段",
                    "stage_number": clue.discovery_stage.stage_number if clue.discovery_stage else 0,
                    "owner_character": searchable_char["character_name"],
                    "owner_user_id": searchable_char["user_id"],
                    "owner_nickname": searchable_char["nickname"]
                    # 注意：这里不包含 description 和具体内容
                }
                available_clues.append(clue_info)
    
    # 按阶段分组可搜证线索
    available_clues_by_stage = {}
    for clue in available_clues:
        stage_name = clue["discovery_stage"]
        if stage_name not in available_clues_by_stage:
            available_clues_by_stage[stage_name] = []
        available_clues_by_stage[stage_name].append(clue)
    
    # 按阶段分组已拥有线索
    owned_clues_by_stage = {}
    for clue in owned_clues:
        stage_name = clue["discovery_stage"]
        if stage_name not in owned_clues_by_stage:
            owned_clues_by_stage[stage_name] = []
        owned_clues_by_stage[stage_name].append(clue)
    
    # 获取当前角色的搜查次数限制
    search_attempts_left = 0
    if current_character and room.current_stage:
        stage_goal = await CharacterStageGoals.filter(
            character=current_character,
            stage=room.current_stage
        ).first()
        if stage_goal:
            search_attempts_left = stage_goal.search_attempts
    
    return {
        "searchable_characters": searchable_characters,
        "available_clues": available_clues,
        "owned_clues": owned_clues,
        "available_clues_by_stage": available_clues_by_stage,
        "owned_clues_by_stage": owned_clues_by_stage,
        "search_attempts_left": search_attempts_left
    }
