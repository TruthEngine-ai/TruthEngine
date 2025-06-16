from typing import Dict, Any
from datetime import datetime
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class VoteHandler:
    async def handle_start_vote(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理开启投票"""
        try:
            room = await GameRooms.get(room_code=room_code)
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以开启投票"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status not in ["进行中", "搜证中"]:
                await manager.send_personal_message(
                    create_error_message("只能在游戏进行中或搜证阶段开启投票"), 
                    user_id
                )
                return
            
            # 将房间状态改为投票中
            room.status = "投票中"
            await room.save()
            
            # 清除之前的投票记录
            from model.entity.Scripts import GameVotes
            await GameVotes.filter(room=room).delete()
            
            # 通知所有玩家投票开始
            await manager.broadcast_to_room(room_code, create_message(MessageType.VOTE_STARTED,
                create_formatted_data(
                    message="投票阶段开始！请选择您认为的凶手。",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间不存在"), 
                user_id
            )

    async def handle_end_vote(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理结束投票"""
        try:
            room = await GameRooms.get(room_code=room_code)
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以结束投票"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status != "投票中":
                await manager.send_personal_message(
                    create_error_message("当前不在投票阶段"), 
                    user_id
                )
                return
            
            # 将房间状态改为已结束
            room.status = "已结束"
            room.finished_at = datetime.now()
            await room.save()
            
            # 统计投票结果
            from model.entity.Scripts import GameVotes
            votes = await GameVotes.filter(room=room).prefetch_related(
                'voter_game_player__user', 'voted_game_player__user', 'voted_game_player__character'
            ).all()
            
            # 计算得票数
            vote_counts = {}
            for vote in votes:
                voted_user_id = vote.voted_game_player.user.id
                if voted_user_id not in vote_counts:
                    vote_counts[voted_user_id] = {
                        "user_id": voted_user_id,
                        "nickname": vote.voted_game_player.user.nickname,
                        "character_name": vote.voted_game_player.character.name if vote.voted_game_player.character else "未知",
                        "vote_count": 0
                    }
                vote_counts[voted_user_id]["vote_count"] += 1
            
            # 找到得票最多的玩家
            result_message = "投票结束！"
            if vote_counts:
                max_voted = max(vote_counts.values(), key=lambda x: x["vote_count"])
                result_message += f" {max_voted['character_name']}({max_voted['nickname']}) 获得最多票数 {max_voted['vote_count']} 票。"
            else:
                result_message += " 没有人投票。"
            
            # 通知所有玩家投票结束
            await manager.broadcast_to_room(room_code, create_message(MessageType.VOTE_ENDED,
                create_formatted_data(
                    message=result_message,
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间不存在"), 
                user_id
            )

    async def handle_game_vote(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """处理游戏投票"""
        try:
            from model.entity.Scripts import GameVotes
            
            room = await GameRooms.get(room_code=room_code).prefetch_related('current_stage')
            voter_player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user', 'character')
            
            # ...existing validation code...
            if room.status != "投票中":
                await manager.send_personal_message(
                    create_error_message("当前不在投票阶段"), 
                    user_id
                )
                return
            
            if not voter_player.character:
                await manager.send_personal_message(
                    create_error_message("未选择角色，无法投票"), 
                    user_id
                )
                return
            
            if not voter_player.is_alive:
                await manager.send_personal_message(
                    create_error_message("已死亡，无法投票"), 
                    user_id
                )
                return
            
            voted_user_id = data.get("voted_user_id")
            if not voted_user_id:
                await manager.send_personal_message(
                    create_error_message("缺少被投票的用户ID"), 
                    user_id
                )
                return
            
            try:
                voted_player = await GamePlayers.get(room=room, user_id=voted_user_id).prefetch_related('user', 'character')
            except DoesNotExist:
                await manager.send_personal_message(
                    create_error_message("被投票的用户不在房间中"), 
                    user_id
                )
                return
            
            if user_id == voted_user_id:
                await manager.send_personal_message(
                    create_error_message("不能投票给自己"), 
                    user_id
                )
                return
            
            # 检查用户是否已经投过票
            existing_vote = await GameVotes.filter(
                room=room,
                voter_game_player=voter_player
            ).prefetch_related('voted_game_player').first()
            
            if existing_vote:
                if existing_vote.voted_game_player.user_id == voted_user_id:
                    await manager.send_personal_message(
                        create_error_message("您已经投票给该玩家"), 
                        user_id
                    )
                    return
                else:
                    existing_vote.voted_game_player = voted_player
                    existing_vote.timestamp = datetime.now()
                    await existing_vote.save()
                    
                    vote_message = f"{voter_player.character.name}({voter_player.user.nickname}) 更改投票给 {voted_player.character.name}({voted_player.user.nickname})"
            else:
                await GameVotes.create(
                    room=room,
                    stage=room.current_stage,
                    voter_game_player=voter_player,
                    voted_game_player=voted_player
                )
                
                vote_message = f"{voter_player.character.name}({voter_player.user.nickname}) 投票给 {voted_player.character.name}({voted_player.user.nickname})"
            
            # 广播投票信息给房间内所有用户
            await manager.broadcast_to_room(room_code, create_message(MessageType.VOTE_UPDATED,
                create_formatted_data(
                    message=vote_message,
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            if await GamePlayers.filter(room=room).count() ==  await GameVotes.filter(room=room).count():
                room.status = "已结束"
                await room.save()

                await manager.broadcast_to_room(room_code, create_message(MessageType.VOTE_ENDED,
                    create_formatted_data(
                        message="所有玩家已投票，投票阶段结束。",
                        send_id=None,
                        send_nickname="系统"
                    )
                ))
                
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )
        except Exception as e:
            await manager.send_personal_message(
                create_error_message(f"投票失败：{str(e)}"), 
                user_id
            )

# 全局投票处理器实例
vote_handler = VoteHandler()
