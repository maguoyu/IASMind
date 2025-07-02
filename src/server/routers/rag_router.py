from fastapi import APIRouter

router = APIRouter(
    prefix="/api/rag",
    tags=["rag"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)
