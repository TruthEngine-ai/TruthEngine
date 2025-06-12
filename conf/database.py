from tortoise import Tortoise
from tortoise.contrib.fastapi import register_tortoise
import os

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite://./truth_engine.db")

TORTOISE_ORM = {
    "connections": {"default": DATABASE_URL},
    "apps": {
        "models": {
            "models": ["model.entity.Scripts"],  # 你的模型模块路径
            "default_connection": "default",
        },
    },
}

async def init_db():
    """初始化数据库连接"""
    await Tortoise.init(TORTOISE_ORM)
    await Tortoise.generate_schemas()

async def close_db():
    """关闭数据库连接"""
    await Tortoise.close_connections()

def register_db(app):
    """注册数据库到FastAPI应用"""
    register_tortoise(
        app,
        config=TORTOISE_ORM,
        generate_schemas=True,
        add_exception_handlers=True,
    )
