# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
认证相关的请求和响应模型
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """用户角色枚举"""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class LoginRequest(BaseModel):
    """登录请求模型"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    remember_me: bool = Field(default=False, description="记住我")
    captcha: Optional[str] = Field(None, description="验证码")


class LoginResponse(BaseModel):
    """登录响应模型"""
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="过期时间（秒）")
    user_info: "UserInfo" = Field(..., description="用户信息")


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求模型"""
    refresh_token: str = Field(..., description="刷新令牌")


class LogoutRequest(BaseModel):
    """登出请求模型"""
    refresh_token: Optional[str] = Field(None, description="刷新令牌")


class UserInfo(BaseModel):
    """用户信息模型"""
    id: str = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    email: Optional[str] = Field(None, description="邮箱")
    avatar: Optional[str] = Field(None, description="头像")
    role: UserRole = Field(default=UserRole.USER, description="用户角色")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="用户状态")
    permissions: List[str] = Field(default_factory=list, description="权限列表")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    last_login: Optional[datetime] = Field(None, description="最后登录时间")
    profile: Optional[Dict[str, Any]] = Field(default_factory=dict, description="用户配置")
    password_hash: Optional[str] = Field(None, description="密码哈希", exclude=True)

    model_config = {
        "extra": "allow",  # 允许额外字段
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class UserRegistrationRequest(BaseModel):
    """用户注册请求模型"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    email: Optional[str] = Field(None, description="邮箱")
    avatar: Optional[str] = Field(None, description="头像")
    captcha: Optional[str] = Field(None, description="验证码")


class UserUpdateRequest(BaseModel):
    """用户更新请求模型"""
    email: Optional[str] = Field(None, description="邮箱")
    avatar: Optional[str] = Field(None, description="头像")
    profile: Optional[Dict[str, Any]] = Field(None, description="用户配置")


class PasswordChangeRequest(BaseModel):
    """密码修改请求模型"""
    old_password: str = Field(..., description="原密码")
    new_password: str = Field(..., description="新密码")


class OAuth2AuthorizeRequest(BaseModel):
    """OAuth2授权请求模型"""
    client_id: str = Field(..., description="客户端ID")
    response_type: str = Field(..., description="响应类型")
    redirect_uri: str = Field(..., description="重定向URI")
    scope: Optional[str] = Field(None, description="权限范围")
    state: Optional[str] = Field(None, description="状态参数")


class OAuth2TokenRequest(BaseModel):
    """OAuth2令牌请求模型"""
    grant_type: str = Field(..., description="授权类型")
    code: Optional[str] = Field(None, description="授权码")
    redirect_uri: Optional[str] = Field(None, description="重定向URI")
    client_id: Optional[str] = Field(None, description="客户端ID")
    client_secret: Optional[str] = Field(None, description="客户端密钥")
    refresh_token: Optional[str] = Field(None, description="刷新令牌")


class OAuth2TokenResponse(BaseModel):
    """OAuth2令牌响应模型"""
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="过期时间（秒）")
    refresh_token: Optional[str] = Field(None, description="刷新令牌")
    scope: Optional[str] = Field(None, description="权限范围")


class TokenInfo(BaseModel):
    """令牌信息模型"""
    sub: str = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    role: UserRole = Field(..., description="用户角色")
    permissions: List[str] = Field(default_factory=list, description="权限列表")
    exp: int = Field(..., description="过期时间戳")
    iat: int = Field(..., description="签发时间戳")
    jti: str = Field(..., description="JWT ID")
    session_id: str = Field(..., description="会话ID")


class AuthErrorResponse(BaseModel):
    """认证错误响应模型"""
    error: str = Field(..., description="错误代码")
    error_description: Optional[str] = Field(None, description="错误描述")
    error_uri: Optional[str] = Field(None, description="错误详情URI")


class PermissionRequest(BaseModel):
    """权限请求模型"""
    resource: str = Field(..., description="资源名称")
    action: str = Field(..., description="操作名称")


class PermissionResponse(BaseModel):
    """权限响应模型"""
    allowed: bool = Field(..., description="是否允许")
    reason: Optional[str] = Field(None, description="拒绝原因")


class SessionInfo(BaseModel):
    """会话信息模型"""
    session_id: str = Field(..., description="会话ID")
    user_id: str = Field(..., description="用户ID")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    expires_at: datetime = Field(..., description="过期时间")
    last_activity: datetime = Field(default_factory=datetime.now, description="最后活动时间")
    ip_address: Optional[str] = Field(None, description="IP地址")
    user_agent: Optional[str] = Field(None, description="用户代理")
    is_active: bool = Field(default=True, description="是否活跃")


class CaptchaResponse(BaseModel):
    """验证码响应模型"""
    captcha_id: str = Field(..., description="验证码ID")
    captcha_image: str = Field(..., description="验证码图片（base64编码）")
    expires_in: int = Field(default=300, description="过期时间（秒）")


# 更新前向引用
LoginResponse.model_rebuild() 