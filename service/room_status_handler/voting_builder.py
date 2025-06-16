from typing import Dict, Any
from model.entity.Scripts import GameRooms

async def build_voting_info(room: GameRooms) -> Dict[str, Any]:
    """构建投票信息"""
    from model.entity.Scripts import GameVotes
    
    votes = await GameVotes.filter(room=room).prefetch_related(
        'voter_game_player__user', 'voted_game_player__user'
    ).all()
    
    vote_counts = {}
    vote_details = []
    
    for vote in votes:
        voter_user_id = vote.voter_game_player.user.id
        voter_nickname = vote.voter_game_player.user.nickname
        
        voted_user_id = vote.voted_game_player.user.id
        voted_nickname = vote.voted_game_player.user.nickname
        
        if voted_user_id not in vote_counts:
            vote_counts[voted_user_id] = {
                "user_id": voted_user_id,
                "nickname": voted_nickname,
                "vote_count": 0
            }
        
        vote_counts[voted_user_id]["vote_count"] += 1
        vote_details.append({
            "voter_user_id": voter_user_id,
            "voter_nickname": voter_nickname,
            "voted_user_id": voted_user_id,
            "voted_nickname": voted_nickname,
            "timestamp": vote.timestamp.isoformat()
        })
    
    return {
        "vote_counts": list(vote_counts.values()),
        "vote_details": vote_details,
        "total_votes": len(votes)
    }

async def build_game_result(room: GameRooms) -> Dict[str, Any]:
    """构建游戏结果信息"""
    # 获取凶手角色
    murderer_info = None
    for player in room.players:
        if player.character and player.character.is_murderer:
            murderer_info = {
                "player_nickname": player.user.nickname if player.is_npc else "NPC",
                "character_name": player.character.name
            }
            break
    
    # 获取投票结果
    voting_info = await build_voting_info(room)
    
    # 判断游戏结果
    game_result = "未知"
    if voting_info["vote_counts"]:
        # 找到得票最多的玩家
        max_votes = max(voting_info["vote_counts"], key=lambda x: x["vote_count"])
        if murderer_info and max_votes["nickname"] == murderer_info["player_nickname"]:
            game_result = "凶手失败"
        else:
            game_result = "凶手胜利"
    
    return {
        "result": game_result,
        "murderer": murderer_info,
        "voting_result": voting_info,
        "finished_at": room.finished_at.isoformat() if room.finished_at else None
    }
