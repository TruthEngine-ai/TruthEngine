from fastapi import FastAPI
from contextlib import asynccontextmanager
from conf.database import register_db
from api.room_api import router as room_router
from api.auth_api import router as auth_router
from api.npc_api import router as npc_router
from utils.scripts_util import router as scripts_router
from websocket.websocket_routes import router as websocket_router
from fastapi.middleware.cors import CORSMiddleware

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
app.include_router(npc_router)
# 添加WebSocket路由
app.include_router(websocket_router)

origins = [
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "TruthEngine API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
