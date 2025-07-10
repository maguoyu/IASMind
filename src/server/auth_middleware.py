# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
认证中间件模块
处理JWT令牌验证、权限检查和访问控制
"""

from typing import Optional, List, Callable, Any
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import wraps
import re

from .auth_service import auth_service
from .auth_request import TokenInfo, UserRole


class AuthMiddleware:
    """认证中间件类"""
    
    def __init__(self):
        self.security = HTTPBearer(auto_error=False)
        self.public_paths = [
            "/api/auth/login",
            "/api/auth/logout", 
            "/api/auth/refresh",
            "/api/auth/captcha",
            "/api/auth/oauth2/authorize",
            "/api/auth/oauth2/token",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/health"
        ]
    
    def IsPublicPath(self, path: str) -> bool:
        """检查是否是公共路径"""
        for public_path in self.public_paths:
            if path.startswith(public_path):
                return True
        return False
    
    async def __call__(self, request: Request, call_next):
        """中间件处理函数"""
        # 检查是否是公共路径
        if self.IsPublicPath(request.url.path):
            return await call_next(request)
        
        # 获取令牌
        credentials = await self.security(request)
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="未提供访问令牌",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 验证令牌
        token_info = auth_service.VerifyToken(credentials.credentials)
        if not token_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的访问令牌",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 将用户信息添加到请求中
        request.state.user = token_info
        
        return await call_next(request)


# 依赖注入函数
async def GetCurrentUser(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> TokenInfo:
    """获取当前用户信息"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供访问令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_info = auth_service.VerifyToken(credentials.credentials)
    if not token_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的访问令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_info


async def GetCurrentActiveUser(current_user: TokenInfo = Depends(GetCurrentUser)) -> TokenInfo:
    """获取当前活跃用户信息"""
    # 检查会话是否仍然有效
    session = auth_service.db.GetSession(current_user.session_id)
    if not session or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="会话已过期",
        )
    
    return current_user


async def GetCurrentAdminUser(current_user: TokenInfo = Depends(GetCurrentActiveUser)) -> TokenInfo:
    """获取当前管理员用户信息"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    
    return current_user


def RequirePermissions(permissions: List[str], require_all: bool = False):
    """权限检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从参数中获取用户信息
            current_user = None
            for arg in args:
                if isinstance(arg, TokenInfo):
                    current_user = arg
                    break
            
            if not current_user:
                for value in kwargs.values():
                    if isinstance(value, TokenInfo):
                        current_user = value
                        break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="未找到用户信息",
                )
            
            # 检查权限
            if not CheckPermissions(current_user, permissions, require_all):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="权限不足",
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def CheckPermissions(user: TokenInfo, required_permissions: List[str], require_all: bool = False) -> bool:
    """检查用户权限"""
    # 管理员拥有所有权限
    if user.role == UserRole.ADMIN:
        return True
    
    user_permissions = set(user.permissions)
    required_permissions_set = set(required_permissions)
    
    if require_all:
        # 需要所有权限
        return required_permissions_set.issubset(user_permissions)
    else:
        # 只需要任意一个权限
        return bool(required_permissions_set.intersection(user_permissions))


def RequireRole(role: UserRole):
    """角色检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从参数中获取用户信息
            current_user = None
            for arg in args:
                if isinstance(arg, TokenInfo):
                    current_user = arg
                    break
            
            if not current_user:
                for value in kwargs.values():
                    if isinstance(value, TokenInfo):
                        current_user = value
                        break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="未找到用户信息",
                )
            
            # 检查角色
            if not CheckRole(current_user, role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"需要{role.value}权限",
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def CheckRole(user: TokenInfo, required_role: UserRole) -> bool:
    """检查用户角色"""
    # 定义角色层级
    role_hierarchy = {
        UserRole.GUEST: 0,
        UserRole.USER: 1,
        UserRole.ADMIN: 2,
    }
    
    user_level = role_hierarchy.get(user.role, 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    return user_level >= required_level


def RequireResourcePermission(resource: str, action: str):
    """资源权限检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从参数中获取用户信息
            current_user = None
            for arg in args:
                if isinstance(arg, TokenInfo):
                    current_user = arg
                    break
            
            if not current_user:
                for value in kwargs.values():
                    if isinstance(value, TokenInfo):
                        current_user = value
                        break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="未找到用户信息",
                )
            
            # 检查资源权限
            if not auth_service.HasPermission(current_user, resource, action):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"缺少{resource}:{action}权限",
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class RateLimitMiddleware:
    """访问频率限制中间件"""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}
        self.last_reset_time = {}
    
    async def __call__(self, request: Request, call_next):
        """中间件处理函数"""
        client_ip = self.GetClientIp(request)
        current_time = int(time.time())
        
        # 重置计数器（每分钟重置一次）
        if client_ip not in self.last_reset_time or current_time - self.last_reset_time[client_ip] >= 60:
            self.request_counts[client_ip] = 0
            self.last_reset_time[client_ip] = current_time
        
        # 增加请求计数
        self.request_counts[client_ip] = self.request_counts.get(client_ip, 0) + 1
        
        # 检查是否超过限制
        if self.request_counts[client_ip] > self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="请求过于频繁，请稍后再试",
            )
        
        return await call_next(request)
    
    def GetClientIp(self, request: Request) -> str:
        """获取客户端IP地址"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host


# 可选的依赖注入
OptionalCurrentUser = Depends(lambda credentials: auth_service.VerifyToken(credentials.credentials) if credentials else None)


# 导入时间模块
import time


# 全局中间件实例
auth_middleware = AuthMiddleware()
rate_limit_middleware = RateLimitMiddleware() 