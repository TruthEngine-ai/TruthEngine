from pydantic import BaseModel
from typing import TypeVar, Generic, Any, Optional, List
from datetime import datetime

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    code: int
    msg: str
    data: Optional[T] = None

# 常用的具体响应类型
class StringResponse(ApiResponse[str]):
    pass

class DictResponse(ApiResponse[dict]):
    pass

class ListResponse(ApiResponse[list]):
    pass
