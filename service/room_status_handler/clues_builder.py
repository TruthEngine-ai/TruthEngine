from typing import Dict, List, Any
from model.entity.Scripts import GameRooms, ScriptClues

async def build_clues_info(room: GameRooms, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
    """构建线索信息（包含当前阶段及之前所有阶段的线索）"""
    if not room.current_stage or not room.script:
        return {"public": [], "private": [], "searched": [], "public_by_stage": {}, "private_by_stage": {}, "searched_by_stage": {}}
    
    # 获取当前用户的角色和游戏玩家信息
    current_character = None
    current_player = None
    for player in room.players:
        if player.user.id == user_id:
            current_player = player
            if player.character:
                current_character = player.character
            break
    
    # 获取当前阶段及之前所有阶段的公开线索
    public_clues = await ScriptClues.filter(
        script=room.script,
        discovery_stage__stage_number__lte=room.current_stage.stage_number,
        is_public=True
    ).prefetch_related('discovery_stage').order_by('discovery_stage__stage_number').all()
    
    # 获取当前用户在当前阶段及之前所有阶段的私有线索
    private_clues = []
    if current_character:
        private_clues = await ScriptClues.filter(
            script=room.script,
            discovery_stage__stage_number__lte=room.current_stage.stage_number,
            is_public=False,
            character=current_character
        ).prefetch_related('discovery_stage').order_by('discovery_stage__stage_number').all()
    
    # 获取搜查到的线索
    searched_clues = []
    searched_public_clues = []
    if current_player:
        from model.entity.Scripts import SearchActions
        
        # 获取当前用户进行的搜查行动
        search_actions = await SearchActions.filter(
            game_player=current_player,
            stage__stage_number__lte=room.current_stage.stage_number
        ).prefetch_related('clues_found', 'clues_found__discovery_stage', 'stage','searchable_player__character').order_by('stage__stage_number').all()
        
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
                    "searched_from": action.searchable_player.character.name if action.searchable_player else "未知",
                    "is_public_search": action.is_public
                }
                
                searched_clues.append(clue_info)
                
                # 如果搜查线索是公开的，也添加到公开线索中
                if action.is_public:
                    searched_public_clues.append(clue_info)
    
    # 合并公开线索和搜查出的公开线索
    all_public_clues = []
    
    # 添加原始公开线索
    for clue in public_clues:
        all_public_clues.append({
            "id": clue.id,
            "name": clue.name,
            "description": clue.description,
            "image_url": clue.image_url,
            "discovery_location": clue.discovery_location,
            "discovery_stage": clue.discovery_stage.name if clue.discovery_stage else "未知阶段",
            "stage_number": clue.discovery_stage.stage_number if clue.discovery_stage else 0,
            "source": "script"  # 标记来源为剧本
        })
    
    # 添加搜查出的公开线索
    for clue in searched_public_clues:
        clue["source"] = "search"  # 标记来源为搜查
        all_public_clues.append(clue)
    
    # 构建私有线索信息
    private_clues_flat = []
    for clue in private_clues:
        private_clues_flat.append({
            "id": clue.id,
            "name": clue.name,
            "description": clue.description,
            "image_url": clue.image_url,
            "discovery_location": clue.discovery_location,
            "discovery_stage": clue.discovery_stage.name if clue.discovery_stage else "未知阶段",
            "stage_number": clue.discovery_stage.stage_number if clue.discovery_stage else 0,
            "source": "script"
        })
    
    # 按阶段分组公开线索
    public_clues_by_stage = {}
    for clue in all_public_clues:
        stage_name = clue["discovery_stage"]
        if stage_name not in public_clues_by_stage:
            public_clues_by_stage[stage_name] = []
        public_clues_by_stage[stage_name].append(clue)
    
    # 按阶段分组私有线索
    private_clues_by_stage = {}
    for clue in private_clues_flat:
        stage_name = clue["discovery_stage"]
        if stage_name not in private_clues_by_stage:
            private_clues_by_stage[stage_name] = []
        private_clues_by_stage[stage_name].append(clue)
    
    # 按阶段分组搜查线索
    searched_clues_by_stage = {}
    for clue in searched_clues:
        stage_name = clue["discovery_stage"]
        if stage_name not in searched_clues_by_stage:
            searched_clues_by_stage[stage_name] = []
        searched_clues_by_stage[stage_name].append(clue)
    
    return {
        "public": all_public_clues,
        "private": private_clues_flat,
        "searched": searched_clues,  # 所有搜查到的线索（包括公开和私有）
        "public_by_stage": public_clues_by_stage,
        "private_by_stage": private_clues_by_stage,
        "searched_by_stage": searched_clues_by_stage
    }
