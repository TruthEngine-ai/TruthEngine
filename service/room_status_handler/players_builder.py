from typing import List, Dict, Any
from model.entity.Scripts import GameRooms
from websocket.connection_manager import manager

async def build_players_info(room: GameRooms) -> List[Dict[str, Any]]:
    """构建玩家信息"""
    players = []
    for player in room.players:
        player_info = {
            "user_id": player.user.id,
            "nickname": player.user.nickname,
            "avatar_url": player.user.avatar_url,
            "is_ready": player.is_ready,
            "is_host": player.user.id == room.host_user_id,
            "is_online": manager.is_user_connected(player.user.id),
            "is_alive": player.is_alive,
            "character_name": player.character.name if player.character else None,
            "character_id": player.character.id if player.character else None
        }
        players.append(player_info)
    return players
