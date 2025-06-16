from typing import List, Dict, Any
from model.entity.Scripts import GameRooms

async def build_characters_info(room: GameRooms) -> List[Dict[str, Any]]:
    """构建角色选择阶段的角色信息"""
    characters = []
    if room.script:
        script_characters = await room.script.characters.all()
        for char in script_characters:
            # 检查角色是否已被选择
            selected_by = None
            for player in room.players:
                if player.character_id == char.id:
                    selected_by = player.user.id
                    break
            
            characters.append({
                "id": char.id,
                "name": char.name,
                "gender": char.gender,
                "public_info": char.public_info,
                "selected_by": selected_by
            })
    return characters

async def build_detailed_characters_info(room: GameRooms, user_id: int) -> List[Dict[str, Any]]:
    """构建游戏进行中的详细角色信息"""
    characters_info = []
    
    # 获取当前用户的游戏玩家信息
    current_player = None
    for player in room.players:
        if player.user.id == user_id:
            current_player = player
            break
    
    for player in room.players:
        if player.character:
            char_info = {
                "player_nickname": player.user.nickname,
                "character_name": player.character.name,
                "character_id": player.character.id,
                "gender": player.character.gender,
                "public_info": player.character.public_info,
                "is_alive": player.is_alive,
                "is_self": player.user.id == user_id
            }
            
            # 如果是当前用户，添加私有信息
            if player.user.id == user_id:
                char_info["backstory"] = player.character.backstory
                char_info["is_murderer"] = player.character.is_murderer
            
            characters_info.append(char_info)
    
    return characters_info
