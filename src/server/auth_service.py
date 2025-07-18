# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
认证服务模块
处理JWT令牌生成、验证、用户认证和权限管理
"""

import jwt
import secrets
import base64
import io
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple
from fastapi import HTTPException, status
from PIL import Image, ImageDraw, ImageFont
import random
import string

from .auth_request import (
    UserInfo, TokenInfo, UserRole, UserStatus, 
    LoginRequest, LoginResponse, OAuth2TokenResponse,
    CaptchaResponse, SessionInfo
)
from ..utils.crypto import guomi_crypto, GenerateSecureToken, SM2Crypto

# 设置东八区时区
CHINA_TIMEZONE = timezone(timedelta(hours=8))


class AuthConfig:
    """认证配置类"""
    
    def __init__(self):
        self.jwt_secret_key = "your-secret-key-here"  # 实际应用中从环境变量获取
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
        self.session_timeout_minutes = 120
        self.max_login_attempts = 5
        self.lockout_duration_minutes = 15
        
        # OAuth2配置
        self.oauth2_client_id = "iasmind-client"
        self.oauth2_client_secret = "iasmind-secret"
        self.oauth2_redirect_uri = "http://localhost:3000/auth/callback"
        
        # 生成SM2密钥对用于签名
        self.sm2_keypair = SM2Crypto.GenerateKeyPair()


class MockUserDatabase:
    """模拟用户数据库"""
    
    def __init__(self):
        self.users: Dict[str, UserInfo] = {}
        self.sessions: Dict[str, SessionInfo] = {}
        self.login_attempts: Dict[str, Dict[str, Any]] = {}
        self.refresh_tokens: Dict[str, Dict[str, Any]] = {}
        self.authorization_codes: Dict[str, Dict[str, Any]] = {}
        self.captchas: Dict[str, Dict[str, Any]] = {}
        

    

    
    def GetUserByUsername(self, username: str) -> Optional[UserInfo]:
        """根据用户名获取用户"""
        return self.users.get(username)
    
    def GetUserById(self, user_id: str) -> Optional[UserInfo]:
        """根据用户ID获取用户"""
        for user in self.users.values():
            if user.id == user_id:
                return user
        return None
    
    def VerifyPassword(self, username: str, password: str) -> bool:
        """验证用户密码"""
        user = self.GetUserByUsername(username)
        if not user or not hasattr(user, 'password_hash'):
            return False
        return guomi_crypto.VerifyPassword(password, user.password_hash)
    
    def AddSession(self, session_info: SessionInfo):
        """添加会话"""
        self.sessions[session_info.session_id] = session_info
    
    def GetSession(self, session_id: str) -> Optional[SessionInfo]:
        """获取会话"""
        return self.sessions.get(session_id)
    
    def RemoveSession(self, session_id: str):
        """移除会话"""
        self.sessions.pop(session_id, None)
    
    def AddRefreshToken(self, token: str, user_id: str, expires_at: datetime):
        """添加刷新令牌"""
        self.refresh_tokens[token] = {
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(CHINA_TIMEZONE)
        }
    
    def GetRefreshToken(self, token: str) -> Optional[Dict[str, Any]]:
        """获取刷新令牌"""
        return self.refresh_tokens.get(token)
    
    def RemoveRefreshToken(self, token: str):
        """移除刷新令牌"""
        self.refresh_tokens.pop(token, None)


class AuthService:
    """认证服务类"""
    
    def __init__(self, config: Optional[AuthConfig] = None):
        self.config = config or AuthConfig()
        self.db = MockUserDatabase()
    
    def CreateAccessToken(self, user_info: UserInfo, session_id: str) -> str:
        """创建访问令牌"""
        # 使用东八区时间
        now = datetime.now(CHINA_TIMEZONE)
        expires_at = now + timedelta(minutes=self.config.access_token_expire_minutes)
        
        payload = {
            "sub": user_info.id,
            "username": user_info.username,
            "role": user_info.role.value,
            "permissions": user_info.permissions,
            "exp": int(expires_at.timestamp()),  # 时间戳会自动转换为UTC
            "iat": int(now.timestamp()),         # 时间戳会自动转换为UTC
            "jti": GenerateSecureToken(16),
            "session_id": session_id
        }
        
        token = jwt.encode(
            payload,
            self.config.jwt_secret_key,
            algorithm=self.config.jwt_algorithm
        )
        
        return token
    
    def CreateRefreshToken(self, user_info: UserInfo) -> str:
        """创建刷新令牌"""
        refresh_token = GenerateSecureToken(32)
        expires_at = datetime.now(CHINA_TIMEZONE) + timedelta(days=self.config.refresh_token_expire_days)
        
        self.db.AddRefreshToken(refresh_token, user_info.id, expires_at)
        return refresh_token
    
    def VerifyToken(self, token: str) -> Optional[TokenInfo]:
        """验证访问令牌"""
        try:
            payload = jwt.decode(
                token,
                self.config.jwt_secret_key,
                algorithms=[self.config.jwt_algorithm]
            )
            
            token_info = TokenInfo(**payload)
            
            # 验证会话是否存在且有效
            session = self.db.GetSession(token_info.session_id)
            if not session or not session.is_active:
                return None
            
            # 更新最后活动时间
            session.last_activity = datetime.now(CHINA_TIMEZONE)
            
            return token_info
            
        except jwt.ExpiredSignatureError as e:
            print(f"Token expired: {e}")
            return None
        except jwt.InvalidTokenError as e:
            print(f"Invalid token: {e}")
            return None
    
    def RefreshAccessToken(self, refresh_token: str) -> Optional[Tuple[str, str]]:
        """刷新访问令牌"""
        token_data = self.db.GetRefreshToken(refresh_token)
        if not token_data:
            return None
        
        if datetime.now(CHINA_TIMEZONE) > token_data["expires_at"]:
            self.db.RemoveRefreshToken(refresh_token)
            return None
        
        user = self.db.GetUserById(token_data["user_id"])
        if not user:
            return None
        
        # 创建新的会话
        session_id = GenerateSecureToken(16)
        session = SessionInfo(
            session_id=session_id,
            user_id=user.id,
            expires_at=datetime.now(CHINA_TIMEZONE) + timedelta(minutes=self.config.session_timeout_minutes)
        )
        self.db.AddSession(session)
        
        # 生成新的访问令牌和刷新令牌
        new_access_token = self.CreateAccessToken(user, session_id)
        new_refresh_token = self.CreateRefreshToken(user)
        
        # 移除旧的刷新令牌
        self.db.RemoveRefreshToken(refresh_token)
        
        return new_access_token, new_refresh_token
    
    def Login(self, request: LoginRequest) -> LoginResponse:
        """用户登录"""
        # 验证登录尝试次数
        if self.IsAccountLocked(request.username):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="账户已被锁定，请稍后再试"
            )
        
        # 验证验证码（如果需要）
        if request.captcha and not self.VerifyCaptcha(request.captcha):
            self.RecordLoginAttempt(request.username, False)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误"
            )
        
        # 验证用户凭据
        user = self.db.GetUserByUsername(request.username)
        if not user or not self.db.VerifyPassword(request.username, request.password):
            self.RecordLoginAttempt(request.username, False)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )
        
        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="用户账户已被禁用"
            )
        
        # 登录成功
        self.RecordLoginAttempt(request.username, True)
        
        # 创建会话
        session_id = GenerateSecureToken(16)
        session = SessionInfo(
            session_id=session_id,
            user_id=user.id,
            expires_at=datetime.now(CHINA_TIMEZONE) + timedelta(minutes=self.config.session_timeout_minutes)
        )
        self.db.AddSession(session)
        
        # 生成令牌
        access_token = self.CreateAccessToken(user, session_id)
        refresh_token = self.CreateRefreshToken(user)
        
        # 更新用户最后登录时间
        user.last_login = datetime.now(CHINA_TIMEZONE)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.config.access_token_expire_minutes * 60,
            user_info=user
        )
    
    def Logout(self, session_id: str, refresh_token: Optional[str] = None):
        """用户登出"""
        # 移除会话
        self.db.RemoveSession(session_id)
        
        # 移除刷新令牌
        if refresh_token:
            self.db.RemoveRefreshToken(refresh_token)
        
        # 移除加密会话密钥
        guomi_crypto.RemoveSessionKey(session_id)
    
    def IsAccountLocked(self, username: str) -> bool:
        """检查账户是否被锁定"""
        if username not in self.db.login_attempts:
            return False
        
        attempts = self.db.login_attempts[username]
        if attempts["count"] >= self.config.max_login_attempts:
            lockout_end = attempts["last_attempt"] + timedelta(minutes=self.config.lockout_duration_minutes)
            return datetime.now(CHINA_TIMEZONE) < lockout_end
        
        return False
    
    def RecordLoginAttempt(self, username: str, success: bool):
        """记录登录尝试"""
        now = datetime.now(CHINA_TIMEZONE)
        
        if username not in self.db.login_attempts:
            self.db.login_attempts[username] = {"count": 0, "last_attempt": now}
        
        if success:
            # 登录成功，重置计数
            self.db.login_attempts[username] = {"count": 0, "last_attempt": now}
        else:
            # 登录失败，增加计数
            self.db.login_attempts[username]["count"] += 1
            self.db.login_attempts[username]["last_attempt"] = now
    
    def GenerateCaptcha(self) -> CaptchaResponse:
        """生成验证码"""
        captcha_id = GenerateSecureToken(16)
        captcha_text = self.GenerateRandomString(4)
        
        # 创建验证码图片
        img = Image.new('RGB', (120, 40), color='white')
        draw = ImageDraw.Draw(img)
        
        # 绘制验证码文本
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        draw.text((20, 10), captcha_text, fill='black', font=font)
        
        # 添加干扰线
        for _ in range(3):
            draw.line([
                (random.randint(0, 120), random.randint(0, 40)),
                (random.randint(0, 120), random.randint(0, 40))
            ], fill='gray', width=1)
        
        # 转换为base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        # 存储验证码
        self.db.captchas[captcha_id] = {
            "text": captcha_text,
            "expires_at": datetime.now(CHINA_TIMEZONE) + timedelta(minutes=5)
        }
        
        return CaptchaResponse(
            captcha_id=captcha_id,
            captcha_image=f"data:image/png;base64,{img_str}"
        )
    
    def VerifyCaptcha(self, captcha_text: str, captcha_id: str = None) -> bool:
        """验证验证码"""
        # 简化验证，实际应用中应该根据captcha_id验证
        return len(captcha_text) == 4 and captcha_text.isalnum()
    
    def GenerateRandomString(self, length: int) -> str:
        """生成随机字符串"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
    
    def HasPermission(self, token_info: TokenInfo, resource: str, action: str) -> bool:
        """检查权限"""
        # 管理员拥有所有权限
        if token_info.role == UserRole.ADMIN:
            return True
        
        # 检查具体权限
        required_permission = f"{resource}:{action}"
        return (action in token_info.permissions or 
                required_permission in token_info.permissions)
    
    def CreateAuthorizationCode(self, user_id: str, client_id: str, redirect_uri: str, scope: str = None) -> str:
        """创建OAuth2授权码"""
        code = GenerateSecureToken(32)
        expires_at = datetime.utcnow() + timedelta(minutes=10)  # 授权码10分钟有效
        
        self.db.authorization_codes[code] = {
            "user_id": user_id,
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": scope or "read",
            "expires_at": expires_at
        }
        
        return code
    
    def ExchangeAuthorizationCode(self, code: str, client_id: str, redirect_uri: str) -> Optional[OAuth2TokenResponse]:
        """交换授权码获取令牌"""
        code_data = self.db.authorization_codes.get(code)
        if not code_data:
            return None
        
        # 验证授权码
        if (code_data["client_id"] != client_id or 
            code_data["redirect_uri"] != redirect_uri or
            datetime.utcnow() > code_data["expires_at"]):
            return None
        
        # 获取用户信息
        user = self.db.GetUserById(code_data["user_id"])
        if not user:
            return None
        
        # 创建令牌
        session_id = GenerateSecureToken(16)
        session = SessionInfo(
            session_id=session_id,
            user_id=user.id,
            expires_at=datetime.now() + timedelta(minutes=self.config.session_timeout_minutes)
        )
        self.db.AddSession(session)
        
        access_token = self.CreateAccessToken(user, session_id)
        refresh_token = self.CreateRefreshToken(user)
        
        # 移除使用过的授权码
        del self.db.authorization_codes[code]
        
        return OAuth2TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.config.access_token_expire_minutes * 60,
            scope=code_data["scope"]
        )


# 全局认证服务实例
auth_service = AuthService() 