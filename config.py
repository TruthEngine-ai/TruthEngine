import os
from pathlib import Path
from typing import Optional


def load_env_file(env_path: str = ".env"):
    env_file = Path(env_path)
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip())


class Settings:
    """应用程序配置设置"""

    def __init__(self):
        # 加载 .env 文件
        load_env_file()

        # JWT配置
        self.SECRET_KEY: str = os.getenv(
            "SECRET_KEY",
            "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
        )
        self.ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "3600")
        )

        # 数据库配置
        self.DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

        # 调试模式
        self.DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

        # 应用配置
        self.APP_NAME: str = os.getenv("APP_NAME", "TruthEngine")
        self.APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")

    def is_development(self) -> bool:
        """检查是否为开发环境"""
        return self.DEBUG

    def get_database_url(self) -> str:
        """获取数据库URL，开发环境使用默认值"""
        return self.DATABASE_URL or "sqlite:///./app.db"


# 创建全局配置实例
settings = Settings()
