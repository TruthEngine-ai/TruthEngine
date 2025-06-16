from typing import Dict, Any
import asyncio
from tortoise.exceptions import DoesNotExist

from model.entity.Scripts import GameRooms, GamePlayers
from websocket.connection_manager import manager
from model.ws.notification_types import MessageType, create_message, create_error_message, create_formatted_data

class ScriptGeneratorHandler:
    async def handle_generate_script(self, room_code: str, user_id: int, data: Dict[str, Any] = None):
        """处理剧本生成请求"""
        try:
            room = await GameRooms.get(room_code=room_code)
            player = await GamePlayers.get(room=room, user_id=user_id).prefetch_related('user')
            
            # 检查是否是房主
            if room.host_user_id != user_id:
                await manager.send_personal_message(
                    create_error_message("只有房主可以生成剧本"), 
                    user_id
                )
                return
            
            # 检查房间状态
            if room.status != '等待中':
                await manager.send_personal_message(
                    create_error_message("只能在等待中状态生成剧本"), 
                    user_id
                )
                return
            
            # 检查是否已有剧本
            if room.script_id:
                await manager.send_personal_message(
                    create_error_message("房间已有剧本，无法重复生成"), 
                    user_id
                )
                return
            
            game_setting = room.game_setting 
            if not game_setting:
                await manager.send_personal_message(
                    create_error_message("房间未设置游戏参数，请先设置游戏参数"), 
                    user_id
                )
                return
                
            # 验证数据
            required_fields = ['theme', 'difficulty', 'ai_dm_personality', 'duration_mins','special_rules']
            for field in required_fields:
                if field not in game_setting:
                    await manager.send_personal_message(
                        create_error_message(f"缺少必要参数: {field}"), 
                        user_id
                    )
                    return
                
            room.status = "生成剧本中"
            await room.save()
            
            # 通知房间内所有用户剧本生成开始
            await manager.broadcast_to_room(room_code, create_message(MessageType.SCRIPT_GENERATION_STARTED,
                create_formatted_data(
                    message=f"{player.user.nickname} 开始生成剧本...",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            from websocket.websocket_routes import broadcast_room_status
            await broadcast_room_status(room_code)
            
            # 异步调用剧本生成API
            asyncio.create_task(self._generate_script_async(room_code, user_id, room.game_setting))
            
        except DoesNotExist:
            await manager.send_personal_message(
                create_error_message("房间或用户不存在"), 
                user_id
            )

    async def _generate_script_async(self, room_code: str, user_id: int, data: Dict[str, Any]):
        """异步生成剧本"""
        try:
            # 导入剧本生成相关模块
            from utils.scripts_util import call_ai_api, parse_and_save_script, create_user_prompt
            
            # 获取房间信息
            room = await GameRooms.get(room_code=room_code)
            
            # 创建用户提示词
            user_prompt = create_user_prompt(
                data["theme"],
                room.max_players,
                data["difficulty"],
                data["ai_dm_personality"],
                data["duration_mins"]
            )
            
            # 调用 AI 接口生成剧本
            ai_response = await call_ai_api(user_prompt)
            
            # 从文件读取AI响应用于测试
            try:
                with open("test.json", "r", encoding="utf-8") as f:
                    ai_response = f.read()
            except FileNotFoundError:
                raise Exception("test.json文件不存在")
            except Exception as e:
                raise Exception(f"读取test.json文件失败: {str(e)}")
                
            # 解析并保存到数据库
            script_id = await parse_and_save_script(ai_response, user_id, room.max_players, data["duration_mins"])
            
            # 将剧本关联到房间
            room.script_id = script_id
            room.status = "选择角色"
            await room.save()
            
            # 获取生成的剧本信息
            from model.entity.Scripts import Scripts
            script = await Scripts.get(id=script_id).prefetch_related('characters')
            
            # 通知房间内所有用户剧本生成完成
            await manager.broadcast_to_room(room_code, create_message(MessageType.SCRIPT_GENERATION_COMPLETED,
                create_formatted_data(
                    message=f"剧本生成完成：{script.title}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)
            
        except Exception as e:
            # 剧本生成失败时恢复房间状态
            print(f"剧本生成失败: {str(e)}")
            try:
                room = await GameRooms.get(room_code=room_code)
                room.status = "等待中"
                await room.save()
            except:
                pass
                
            # 通知房间内所有用户剧本生成失败
            await manager.broadcast_to_room(room_code, create_message(MessageType.SCRIPT_GENERATION_FAILED,
                create_formatted_data(
                    message=f"剧本生成失败：{str(e)}",
                    send_id=None,
                    send_nickname="系统"
                )
            ))
            
            # 广播房间状态更新
            from ..RoomStatusHandler import room_status_handler
            await room_status_handler.broadcast_room_status(room_code)

# 全局剧本生成处理器实例
script_generator_handler = ScriptGeneratorHandler()
