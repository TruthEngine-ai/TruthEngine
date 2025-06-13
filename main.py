from fastapi import FastAPI
from contextlib import asynccontextmanager
from conf.database import register_db
from api.room_api import router as room_router
from api.auth_api import router as auth_router
from api.scripts_api import router as scripts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动时的操作
    print("应用启动，初始化数据库连接...")
    yield
    # 应用关闭时的操作
    print("应用关闭，清理资源...")


# 创建FastAPI应用
app = FastAPI(
    title="TruthEngine API",
    description="剧本杀游戏引擎API",
    version="1.0.0",
    lifespan=lifespan
)
# 注册数据库
register_db(app)

# 注册路由
app.include_router(auth_router)
app.include_router(room_router)
app.include_router(scripts_router)

@app.get("/")
async def root():
    return {"message": "TruthEngine API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
