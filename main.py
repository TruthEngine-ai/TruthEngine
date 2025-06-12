from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from tortoise import Tortoise
from tortoise.contrib.fastapi import RegisterTortoise

from config import settings
from api.auth_api import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with RegisterTortoise(
            app,
            config={
                'connections': {
                    'default': settings.DATABASE_URL
                },
                'apps': {
                    'models': {
                        "models": ["models.database"],
                        'default_connection': 'default',
                    }
                },
                "use_tz": False,
                "timezone": "Asia/Shanghai",
            }
    ):
        await Tortoise.generate_schemas()
        yield

app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
