from fastapi import APIRouter

router = APIRouter(
    prefix="/chatbot",
    tags=["chatbot"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)
