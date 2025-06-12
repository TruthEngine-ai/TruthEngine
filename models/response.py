from pydantic import BaseModel


class ApiResponse(BaseModel):
    code: int
    msg: str
    data: dict
