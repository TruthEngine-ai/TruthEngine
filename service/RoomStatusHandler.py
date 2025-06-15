from typing import Dict, Any, List, Optional
from model.entity.Scripts import GameRooms, ScriptClues, CharacterStageGoals,ScriptStages
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message

class RoomStatusHandler:
    """房间状态处理器"""
    
    async def send_room_status(self, room_code: str, user_id: int):
        """发送房间当前状态给指定用户"""
        try:
            room = await GameRooms.get(room_code=room_code).prefetch_related(
                'script', 'host_user', 'players__user', 'players__character', 'current_stage'
            )
            
            # 构建基础房间信息
            base_room_info = {
                "code": room.room_code,
                "status": room.status,
                "max_players": room.max_players,
                "host_user_id": room.host_user_id,
                "ai_dm_personality": room.ai_dm_personality,
                "game_settings": room.game_setting,
                "started_at": room.started_at.isoformat() if room.started_at else None,
                "finished_at": room.finished_at.isoformat() if room.finished_at else None
            }
            
            # 根据房间状态组装不同的数据
            room_status_data = await self._build_room_status_by_phase(room, base_room_info, user_id)

            await manager.send_personal_message(
                create_message(MessageType.ROOM_STATUS, room_status_data), 
                user_id
            )
            
        except Exception as e:
            print(f"获取房间状态失败: {str(e)}")
            await manager.send_personal_message(
                create_error_message(f"获取房间状态失败: {str(e)}"),
                user_id
            )
    
    async def broadcast_room_status(self, room_code: str):
        """向房间内所有用户广播房间状态"""
        try:
            connected_users = manager.get_room_users(room_code)
            for user_id in connected_users:
                await self.send_room_status(room_code, user_id)
        except Exception as e:
            print(f"广播房间状态失败: {str(e)}")
    
    async def _build_story_timeline_info(self, script, user_id: int, room: GameRooms) -> Dict[str, Any]:
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
    
    async def _build_room_status_by_phase(self, room: GameRooms, base_info: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        """根据房间阶段构建不同的状态数据"""
        status_data = {
            "room": base_info,
            "script":await self._build_script_info(room.script) if room.script else None
        }
        
        if room.status == "等待中":
            # 等待中阶段：返回基础房间信息和玩家信息
            status_data["players"] = await self._build_players_info(room)
            
        elif room.status == "生成剧本中":
            # 生成剧本中：返回基础房间信息和玩家信息
            status_data["players"] = await self._build_players_info(room)
            
        elif room.status == "选择角色":
            # 选择角色阶段：返回角色信息和玩家信息
            status_data["players"] = await self._build_players_info(room)
            status_data["characters"] = await self._build_characters_info(room)
            
        elif room.status == "进行中":
            # 进行中阶段：返回完整的游戏信息
            status_data["players"] = await self._build_players_info(room)
            status_data["story_timeline"] = await self._build_story_timeline_info(room.script, user_id, room)
            status_data["characters"] = await self._build_detailed_characters_info(room, user_id)
            status_data["current_stage"] = await self._build_stage_info(room, user_id)
            status_data["clues"] = await self._build_clues_info(room, user_id)
            
        elif room.status == "搜证中":
            # 搜证阶段：返回搜证相关信息
            status_data["players"] = await self._build_players_info(room)
            status_data["story_timeline"] = await self._build_story_timeline_info(room.script, user_id, room)
            status_data["characters"] = await self._build_detailed_characters_info(room, user_id)
            status_data["current_stage"] = await self._build_stage_info(room, user_id)
            status_data["search_info"] = await self._build_searchable_info(room, user_id)

        
        elif room.status == "投票中":
            # 投票阶段：返回投票相关信息
            status_data["players"] = await self._build_players_info(room)
            status_data["characters"] = await self._build_detailed_characters_info(room, user_id)
            status_data["story_timeline"] = await self._build_story_timeline_info(room.script, user_id, room)
            status_data["voting_info"] = await self._build_voting_info(room)
            
        elif room.status in ["已结束", "已解散"]:
            # 结束阶段：返回结果信息
            status_data["players"] = await self._build_players_info(room)
            status_data["characters"] = await self._build_detailed_characters_info(room, user_id)
            status_data["story_timeline"] = await self._build_story_timeline_info(room.script, user_id, room)
            status_data["game_result"] = await self._build_game_result(room)
        
        return status_data
    
    async def _build_script_info(self, script) -> Dict[str, Any]:
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
    
    
    async def _build_players_info(self, room: GameRooms) -> List[Dict[str, Any]]:
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
    
    async def _build_characters_info(self, room: GameRooms) -> List[Dict[str, Any]]:
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
    
    async def _build_detailed_characters_info(self, room: GameRooms, user_id: int) -> List[Dict[str, Any]]:
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
                    
                    # 获取当前阶段的个人任务
                    # if room.current_stage:
                    #     stage_goal = await CharacterStageGoals.filter(
                    #         character=player.character, 
                    #         stage=room.current_stage
                    #     ).first()
                    #     if stage_goal:
                    #         char_info["current_goal"] = stage_goal.goal_description
                    #         char_info["search_attempts"] = stage_goal.search_attempts
                
                characters_info.append(char_info)
        
        return characters_info
    
    async def _build_stage_info(self, room: GameRooms, user_id: int = None) -> Optional[Dict[str, Any]]:
        """构建当前阶段信息和历史阶段信息"""
        if not room.current_stage or not room.script:
            return None
        
        # 获取当前用户的角色
        current_character = None
        if user_id:
            for player in room.players:
                if player.user.id == user_id and player.character:
                    current_character = player.character
                    break
        
        # 获取当前阶段及之前的所有阶段
        stages = await room.script.stages.filter(
            stage_number__lte=room.current_stage.stage_number
        ).order_by('stage_number').all()
        
        # 构建阶段信息列表
        stages_info = []
        for stage in stages:
            stage_info = {
                "stage_number": stage.stage_number,
                "name": stage.name,
                "opening_narrative": stage.opening_narrative,
                "stage_goal": stage.stage_goal,
                "is_evidence": stage.is_evidence,
                "is_current": stage.id == room.current_stage.id
            }
            
            # 如果有当前角色，添加该角色在此阶段的任务
            if current_character:
                stage_goal = await CharacterStageGoals.filter(
                    character=current_character,
                    stage=stage
                ).first()
                
                if stage_goal:
                    stage_info["character_goal"] = {
                        "goal_description": stage_goal.goal_description,
                        "is_mandatory": stage_goal.is_mandatory,
                        "search_attempts": stage_goal.search_attempts
                    }
                else:
                    stage_info["character_goal"] = None
            
            stages_info.append(stage_info)
        
        # 构建当前阶段的详细信息
        current_stage_info = {
            "stage_number": room.current_stage.stage_number,
            "name": room.current_stage.name,
            "opening_narrative": room.current_stage.opening_narrative,
            "stage_goal": room.current_stage.stage_goal,
            "is_evidence": room.current_stage.is_evidence
        }
        
        # 为当前阶段添加角色任务
        if current_character:
            current_stage_goal = await CharacterStageGoals.filter(
                character=current_character,
                stage=room.current_stage
            ).first()
            
            if current_stage_goal:
                current_stage_info["character_goal"] = {
                    "goal_description": current_stage_goal.goal_description,
                    "is_mandatory": current_stage_goal.is_mandatory,
                    "search_attempts": current_stage_goal.search_attempts
                }
            else:
                current_stage_info["character_goal"] = None
        
        return {
            "current_stage": current_stage_info,
            "all_stages": stages_info
        }
    
    async def _build_clues_info(self, room: GameRooms, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
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
                        # "clue_goal_connection": action.clues_found.clue_goal_connection,
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
                # "clue_goal_connection": clue.clue_goal_connection,
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
                # "clue_goal_connection": clue.clue_goal_connection,
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
    
    async def _build_voting_info(self, room: GameRooms) -> Dict[str, Any]:
        """构建投票信息"""
        from model.entity.Scripts import GameVotes
        
        votes = await GameVotes.filter(room=room).prefetch_related(
            'voter_game_player__user', 'voted_game_player__user'
        ).all()
        
        vote_counts = {}
        vote_details = []
        
        for vote in votes:
            voted_user_id = vote.voted_game_player.user.id
            voter_nickname = vote.voter_game_player.user.nickname
            voted_nickname = vote.voted_game_player.user.nickname
            
            if voted_user_id not in vote_counts:
                vote_counts[voted_user_id] = {
                    "user_id": voted_user_id,
                    "nickname": voted_nickname,
                    "vote_count": 0
                }
            
            vote_counts[voted_user_id]["vote_count"] += 1
            vote_details.append({
                "voter_nickname": voter_nickname,
                "voted_nickname": voted_nickname,
                "timestamp": vote.timestamp.isoformat()
            })
        
        return {
            "vote_counts": list(vote_counts.values()),
            "vote_details": vote_details,
            "total_votes": len(votes)
        }
    
    async def _build_game_result(self, room: GameRooms) -> Dict[str, Any]:
        """构建游戏结果信息"""
        # 获取凶手角色
        murderer_info = None
        for player in room.players:
            if player.character and player.character.is_murderer:
                murderer_info = {
                    "player_nickname": player.user.nickname,
                    "character_name": player.character.name
                }
                break
        
        # 获取投票结果
        voting_info = await self._build_voting_info(room)
        
        # 判断游戏结果
        game_result = "未知"
        if voting_info["vote_counts"]:
            # 找到得票最多的玩家
            max_votes = max(voting_info["vote_counts"], key=lambda x: x["vote_count"])
            if murderer_info and max_votes["nickname"] == murderer_info["player_nickname"]:
                game_result = "平民胜利"
            else:
                game_result = "凶手胜利"
        
        return {
            "result": game_result,
            "murderer": murderer_info,
            "voting_result": voting_info,
            "finished_at": room.finished_at.isoformat() if room.finished_at else None
        }
    
    async def _build_searchable_info(self, room: GameRooms, user_id: int) -> Dict[str, Any]:
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
            if player.character and player.user.id != user_id :#and player.is_alive:
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

# 全局房间状态处理器实例
room_status_handler = RoomStatusHandler()
