from fastapi import APIRouter

router = APIRouter(
    prefix="/api/mcp",
    tags=["mcp"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)
