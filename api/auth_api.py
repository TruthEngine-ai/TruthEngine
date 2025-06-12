from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from config import settings
from models.response import ApiResponse
from utils.auth_util import (
    UserCreate, verify_password, create_access_token,
    get_password_hash, oauth2_scheme, decode_token
)
from models.database import User as UserModel

router = APIRouter(prefix="/auth", tags=["认证"])


async def get_user(username: str):
    user = await UserModel.filter(username=username, is_active=True).first()
    return user


async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
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
        full_name=user_data.full_name,
        hashed_password=hashed_password,
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
    await UserModel.filter(id=user.id).update(last_login=user.created_at.__class__.now())

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
                "full_name": user.full_name,
                "disabled": not user.is_active
            }
        )
    except HTTPException as e:
        return ApiResponse(
            code=e.status_code,
            msg=e.detail,
            data=None
        )


@router.get("/me")
async def read_users_me(
        current_user: Annotated[UserModel, Depends(get_current_user)],
):
    return ApiResponse(
        code=200,
        msg="获取用户信息成功",
        data={
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "disabled": not current_user.is_active
        }
    )
