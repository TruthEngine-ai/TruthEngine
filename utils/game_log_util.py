from typing import Optional, Dict, Any
from model.entity.Scripts import GameLogs, GameRooms, GamePlayers, ScriptClues

class GameLogUtil:
    """游戏日志工具类"""
    
    @staticmethod
    async def create_system_log(
        room: GameRooms, 
        content: str,
        player: Optional[GamePlayers] = None
    ) -> GameLogs:
        """创建系统消息日志"""
        return await GameLogs.create(
            room=room,
            sender_game_player=player,
            is_ai_sender=False,
            message_type="系统消息",
            content=content,
            send_id=player.user.id if player else None,
            send_nickname=player.user.nickname if player else "系统"
        )
    
    @staticmethod
    async def create_chat_log(
        room: GameRooms, 
        sender_player: GamePlayers, 
        content: str
    ) -> GameLogs:
        """创建公共聊天日志"""
        return await GameLogs.create(
            room=room,
            sender_game_player=sender_player,
            is_ai_sender=False,
            message_type="公共聊天",
            content=content,
            send_id=sender_player.user.id,
            send_nickname=sender_player.user.nickname
        )
    
    @staticmethod
    async def create_private_chat_log(
        room: GameRooms,
        sender_player: GamePlayers,
        recipient_player: GamePlayers,
        content: str
    ) -> GameLogs:
        """创建私聊日志"""
        return await GameLogs.create(
            room=room,
            sender_game_player=sender_player,
            recipient_game_player=recipient_player,
            is_ai_sender=False,
            message_type="私聊",
            content=content,
            send_id=sender_player.user.id,
            send_nickname=sender_player.user.nickname,
            recipient_id=recipient_player.user.id,
            recipient_nickname=recipient_player.user.nickname
        )
    
    @staticmethod
    async def create_action_log(
        room: GameRooms,
        player: GamePlayers,
        action_content: str
    ) -> GameLogs:
        """创建行动宣告日志"""
        return await GameLogs.create(
            room=room,
            sender_game_player=player,
            is_ai_sender=False,
            message_type="行动宣告",
            content=action_content,
            send_id=player.user.id,
            send_nickname=player.user.nickname
        )
    
    @staticmethod
    async def create_clue_log(
        room: GameRooms,
        player: GamePlayers,
        clue: ScriptClues,
        content: str
    ) -> GameLogs:
        """创建线索发布日志"""
        return await GameLogs.create(
            room=room,
            sender_game_player=player,
            is_ai_sender=False,
            message_type="线索发布",
            content=content,
            related_clue=clue,
            send_id=player.user.id,
            send_nickname=player.user.nickname
        )
    
    @staticmethod
    async def create_ai_narration_log(
        room: GameRooms,
        content: str
    ) -> GameLogs:
        """创建AI旁白日志"""
        return await GameLogs.create(
            room=room,
            sender_game_player=None,
            is_ai_sender=True,
            message_type="AI旁白",
            content=content,
            send_id=None,
            send_nickname="AI旁白"
        )
    
    async def create_clue_log(self, room, player, clue, content: str):
        """创建线索相关日志"""
        from model.entity.Scripts import GameLogs
        
        return await GameLogs.create(
            room=room,
            sender_game_player=player,
            is_ai_sender=False,
            message_type="线索搜索",
            content=content,
            related_clue=clue,
            send_id=player.user.id if player else None,
            send_nickname=player.user.nickname if player else None
        )

# 全局游戏日志工具实例
game_log_util = GameLogUtil()
