from datetime import timedelta
from typing import Annotated
import random

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from conf.config import settings
from model.dto.response import ApiResponse
from utils.auth_util import (
    UserCreate, verify_password, create_access_token,
    get_password_hash, oauth2_scheme, decode_token
)
from model.entity.Scripts import Users as UserModel, GamePlayers, GameRooms

router = APIRouter(prefix="/auth", tags=["认证"])


async def get_user(username: str):
    user = await UserModel.filter(username=username, is_active=True).first()
    return user


async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user


async def create_user(user_data: UserCreate):
    existing_user = await UserModel.filter(username=user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在")

    existing_email = await UserModel.filter(email=user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="邮箱已存在")

    hashed_password = get_password_hash(user_data.password)
    user = await UserModel.create(
        username=user_data.username,
        email=user_data.email,
        nickname=user_data.nickname,
        password_hash=hashed_password,
    )
    return user


async def create_guest_user(nickname: str):
    """创建游客用户"""
    # 生成唯一的游客用户名和邮箱
    while True:
        guest_id = random.randint(100000, 999999)
        username = f"guest_{guest_id}"
        email = f"guest_{guest_id}@temp.com"
        
        # 检查用户名是否已存在
        existing_user = await UserModel.filter(username=username).first()
        if not existing_user:
            break
    
    # 创建游客用户（无密码）
    user = await UserModel.create(
        username=username,
        email=email,
        nickname=nickname,
        password_hash="",  # 游客无密码
        is_visitor=True
    )
    return user


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data = decode_token(token)
    print(f"Decoded token data: {token_data}")
    if token_data is None:
        raise credentials_exception

    user = await get_user(token_data.username)
    if user is None:
        raise credentials_exception
    return user


@router.post("/token")
async def login_for_access_token(
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        return ApiResponse(
            code=401,
            msg="用户名或密码错误",
            data=None
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    # 更新最后登录时间
    await UserModel.filter(id=user.id).update(last_login_at=user.created_at.__class__.now())

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/register")
async def register_user(user_data: UserCreate):
    try:
        user = await create_user(user_data)
        return ApiResponse(
            code=200,
            msg="注册成功",
            data={
                "username": user.username,
                "email": user.email,
                "nickname": user.nickname,
                "disabled": not user.is_active
            }
        )
    except HTTPException as e:
        return ApiResponse(
            code=e.status_code,
            msg=e.detail,
            data=None
        )


@router.post("/guest-register")
async def register_guest_user(nickname: str):
    """游客快速注册"""
    try:
        # 创建游客用户
        user = await create_guest_user(nickname)
        
        # 生成访问令牌
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        # 更新最后登录时间
        await UserModel.filter(id=user.id).update(last_login_at=user.created_at.__class__.now())
        
        return ApiResponse(
            code=200,
            msg="游客注册成功",
            data={
                "access_token": access_token,
                "token_type": "bearer",
                "user_info": {
                    "id": user.id,
                    "username": user.username,
                    "nickname": user.nickname,
                    "is_visitor": user.is_visitor
                }
            }
        )
    except Exception as e:
        return ApiResponse(
            code=500,
            msg=f"游客注册失败: {str(e)}",
            data=None
        )


@router.get("/me")
async def read_users_me(
        current_user: Annotated[UserModel, Depends(get_current_user)],
):
    # 查询用户当前房间
    current_room = None
    try:
        # 查找用户当前参与的房间（状态不是已结束或已解散的房间）
        player = await GamePlayers.filter(
            user_id=current_user.id
        ).prefetch_related('room').order_by('-created_at').first()
        
        if player and player.room.status not in ['已解散']:
            current_room = {
                "room_code": player.room.room_code,
                "status": player.room.status,
                "is_host": player.room.host_user_id == current_user.id
            }
    except Exception as e:
        print(f"获取用户当前房间失败: {str(e)}")
        # 如果查询失败，current_room 保持为 None
    
    return ApiResponse(
        code=200,
        msg="获取用户信息成功",
        data={
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "nickname": current_user.nickname,
            "disabled": not current_user.is_active,
            "current_room": current_room
        }
    )
