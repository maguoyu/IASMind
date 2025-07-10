# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
认证路由模块
提供OAuth2登录、登出、刷新令牌等API接口
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request, Form
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..auth_service import auth_service
from ..auth_request import (
    LoginRequest, LoginResponse, RefreshTokenRequest, LogoutRequest,
    UserInfo, UserRegistrationRequest, UserUpdateRequest, PasswordChangeRequest,
    OAuth2AuthorizeRequest, OAuth2TokenRequest, OAuth2TokenResponse,
    AuthErrorResponse, PermissionRequest, PermissionResponse,
    CaptchaResponse, TokenInfo
)
from ..auth_middleware import (
    GetCurrentUser, GetCurrentActiveUser, GetCurrentAdminUser,
    RequirePermissions, RequireRole, RequireResourcePermission
)

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "Internal Server Error"

router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)

security = HTTPBearer()


@router.post("/login", response_model=LoginResponse)
async def Login(request: LoginRequest):
    """用户登录"""
    try:
        return auth_service.Login(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.post("/logout")
async def Logout(
    request: LogoutRequest,
    current_user: TokenInfo = Depends(GetCurrentUser)
):
    """用户登出"""
    try:
        auth_service.Logout(current_user.session_id, request.refresh_token)
        return {"message": "登出成功"}
    except Exception as e:
        logger.exception(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.post("/refresh", response_model=LoginResponse)
async def RefreshToken(request: RefreshTokenRequest):
    """刷新访问令牌"""
    try:
        result = auth_service.RefreshAccessToken(request.refresh_token)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的刷新令牌"
            )
        
        access_token, refresh_token = result
        
        # 获取用户信息
        token_info = auth_service.VerifyToken(access_token)
        if not token_info:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="令牌生成失败"
            )
        
        user = auth_service.db.GetUserById(token_info.sub)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=auth_service.config.access_token_expire_minutes * 60,
            user_info=user
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Refresh token error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.get("/me", response_model=UserInfo)
async def GetCurrentUserInfo(current_user: TokenInfo = Depends(GetCurrentActiveUser)):
    """获取当前用户信息"""
    try:
        user = auth_service.db.GetUserById(current_user.sub)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Get current user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.put("/me", response_model=UserInfo)
async def UpdateCurrentUser(
    request: UserUpdateRequest,
    current_user: TokenInfo = Depends(GetCurrentActiveUser)
):
    """更新当前用户信息"""
    try:
        user = auth_service.db.GetUserById(current_user.sub)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        # 更新用户信息
        if request.email is not None:
            user.email = request.email
        if request.avatar is not None:
            user.avatar = request.avatar
        if request.profile is not None:
            user.profile.update(request.profile)
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Update user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.post("/change-password")
async def ChangePassword(
    request: PasswordChangeRequest,
    current_user: TokenInfo = Depends(GetCurrentActiveUser)
):
    """修改密码"""
    try:
        user = auth_service.db.GetUserById(current_user.sub)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        # 验证旧密码
        if not auth_service.db.VerifyPassword(user.username, request.old_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="原密码错误"
            )
        
        # 更新密码
        from ..auth_service import guomi_crypto
        user.password_hash = guomi_crypto.EncryptPassword(request.new_password)
        
        return {"message": "密码修改成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Change password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.get("/captcha", response_model=CaptchaResponse)
async def GetCaptcha():
    """获取验证码"""
    try:
        return auth_service.GenerateCaptcha()
    except Exception as e:
        logger.exception(f"Generate captcha error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.post("/check-permission", response_model=PermissionResponse)
async def CheckPermission(
    request: PermissionRequest,
    current_user: TokenInfo = Depends(GetCurrentActiveUser)
):
    """检查用户权限"""
    try:
        allowed = auth_service.HasPermission(current_user, request.resource, request.action)
        reason = None if allowed else "权限不足"
        
        return PermissionResponse(allowed=allowed, reason=reason)
    except Exception as e:
        logger.exception(f"Check permission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


# OAuth2 授权码流程
@router.get("/oauth2/authorize")
async def OAuth2Authorize(
    client_id: str,
    response_type: str,
    redirect_uri: str,
    scope: Optional[str] = None,
    state: Optional[str] = None,
    current_user: Optional[TokenInfo] = Depends(GetCurrentUser)
):
    """OAuth2授权页面"""
    try:
        # 验证客户端ID
        if client_id != auth_service.config.oauth2_client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的客户端ID"
            )
        
        # 验证响应类型
        if response_type != "code":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的响应类型"
            )
        
        # 如果用户未登录，重定向到登录页面
        if not current_user:
            login_url = f"/auth/login?redirect_uri={redirect_uri}&state={state}"
            return RedirectResponse(url=login_url, status_code=302)
        
        # 生成授权码
        authorization_code = auth_service.CreateAuthorizationCode(
            current_user.sub, client_id, redirect_uri, scope
        )
        
        # 重定向到客户端
        redirect_url = f"{redirect_uri}?code={authorization_code}"
        if state:
            redirect_url += f"&state={state}"
        
        return RedirectResponse(url=redirect_url, status_code=302)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"OAuth2 authorize error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.post("/oauth2/token", response_model=OAuth2TokenResponse)
async def OAuth2Token(
    grant_type: str = Form(...),
    code: Optional[str] = Form(None),
    redirect_uri: Optional[str] = Form(None),
    client_id: Optional[str] = Form(None),
    client_secret: Optional[str] = Form(None),
    refresh_token: Optional[str] = Form(None)
):
    """OAuth2令牌交换"""
    try:
        if grant_type == "authorization_code":
            # 验证必需参数
            if not all([code, redirect_uri, client_id]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="缺少必需参数"
                )
            
            # 验证客户端
            if client_id != auth_service.config.oauth2_client_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="无效的客户端凭据"
                )
            
            # 交换授权码
            result = auth_service.ExchangeAuthorizationCode(code, client_id, redirect_uri)
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="无效的授权码"
                )
            
            return result
        
        elif grant_type == "refresh_token":
            # 刷新令牌
            if not refresh_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="缺少刷新令牌"
                )
            
            result = auth_service.RefreshAccessToken(refresh_token)
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="无效的刷新令牌"
                )
            
            access_token, new_refresh_token = result
            
            return OAuth2TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                expires_in=auth_service.config.access_token_expire_minutes * 60
            )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的授权类型"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"OAuth2 token error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


# 管理员接口
@router.post("/admin/users", response_model=UserInfo)
async def CreateUser(
    request: UserRegistrationRequest,
    current_user: TokenInfo = Depends(GetCurrentAdminUser)
):
    """创建用户（管理员）"""
    try:
        # 检查用户名是否存在
        if auth_service.db.GetUserByUsername(request.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已存在"
            )
        
        # 创建用户
        from ..auth_service import guomi_crypto
        from ..auth_request import UserRole, UserStatus
        import uuid
        
        user_id = str(uuid.uuid4())
        password_hash = guomi_crypto.EncryptPassword(request.password)
        user = UserInfo(
            id=user_id,
            username=request.username,
            email=request.email,
            avatar=request.avatar,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            permissions=["read", "write"],
            password_hash=password_hash
        )
        
        # 保存用户
        auth_service.db.users[user.username] = user
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Create user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.get("/admin/users")
async def ListUsers(
    current_user: TokenInfo = Depends(GetCurrentAdminUser)
):
    """获取用户列表（管理员）"""
    try:
        users = []
        for user in auth_service.db.users.values():
            # 不返回密码哈希
            user_dict = user.dict()
            user_dict.pop("password_hash", None)
            users.append(user_dict)
        
        return {"users": users}
    except Exception as e:
        logger.exception(f"List users error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=INTERNAL_SERVER_ERROR_DETAIL
        )


@router.get("/health")
async def HealthCheck():
    """健康检查"""
    return {"status": "healthy", "service": "auth"}


@router.get("/test")
async def TestEndpoint():
    """测试端点"""
    return {
        "message": "认证服务正常运行",
        "test_users": {
            "admin": "admin123",
            "testuser": "user123", 
            "guest": "guest123"
        }
    } 