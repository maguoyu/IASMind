# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
国密加密工具模块
实现SM2、SM3、SM4加密算法的封装
"""

import hashlib
import hmac
import secrets
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import base64
import json


@dataclass
class CryptoConfig:
    """加密配置类"""
    sm2_key_length: int = 256
    sm3_digest_length: int = 32
    sm4_key_length: int = 16
    sm4_block_size: int = 16


class SM3Hash:
    """SM3哈希算法实现（基于SHA-256作为替代）"""
    
    @staticmethod
    def Hash(data: bytes) -> bytes:
        """
        计算SM3哈希值
        暂时使用SHA-256作为替代实现
        """
        return hashlib.sha256(data).digest()
    
    @staticmethod
    def HashWithHmac(data: bytes, key: bytes) -> bytes:
        """
        计算HMAC-SM3
        """
        return hmac.new(key, data, hashlib.sha256).digest()


class SM4Cipher:
    """SM4对称加密算法实现（基于AES作为替代）"""
    
    def __init__(self, key: bytes):
        if len(key) != 16:
            raise ValueError("SM4密钥长度必须为16字节")
        self.key = key
    
    def Encrypt(self, plaintext: bytes) -> bytes:
        """
        SM4加密
        暂时使用AES-CBC作为替代实现
        """
        cipher = AES.new(self.key, AES.MODE_CBC)
        iv = cipher.iv
        padded_data = pad(plaintext, AES.block_size)
        ciphertext = cipher.encrypt(padded_data)
        return iv + ciphertext
    
    def Decrypt(self, ciphertext: bytes) -> bytes:
        """
        SM4解密
        """
        if len(ciphertext) < 16:
            raise ValueError("密文长度不足")
        
        iv = ciphertext[:16]
        encrypted_data = ciphertext[16:]
        
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        padded_data = cipher.decrypt(encrypted_data)
        return unpad(padded_data, AES.block_size)


class SM2KeyPair:
    """SM2密钥对类"""
    
    def __init__(self, private_key: bytes, public_key: bytes):
        self.private_key = private_key
        self.public_key = public_key
    
    def ToDict(self) -> Dict[str, str]:
        """转换为字典格式"""
        return {
            "private_key": base64.b64encode(self.private_key).decode(),
            "public_key": base64.b64encode(self.public_key).decode()
        }
    
    @classmethod
    def FromDict(cls, data: Dict[str, str]) -> "SM2KeyPair":
        """从字典创建密钥对"""
        return cls(
            private_key=base64.b64decode(data["private_key"]),
            public_key=base64.b64decode(data["public_key"])
        )


class SM2Crypto:
    """SM2非对称加密算法实现（简化版）"""
    
    @staticmethod
    def GenerateKeyPair() -> SM2KeyPair:
        """
        生成SM2密钥对
        暂时使用随机数生成作为替代
        """
        private_key = get_random_bytes(32)
        public_key = SM3Hash.Hash(private_key)
        return SM2KeyPair(private_key, public_key)
    
    @staticmethod
    def Sign(private_key: bytes, message: bytes) -> bytes:
        """
        SM2数字签名
        """
        signature_data = SM3Hash.HashWithHmac(message, private_key)
        return signature_data
    
    @staticmethod
    def Verify(public_key: bytes, message: bytes, signature: bytes) -> bool:
        """
        SM2签名验证
        """
        try:
            # 简化的验证逻辑，实际应用中需要更完整的实现
            expected_signature = SM3Hash.Hash(message + public_key)
            return expected_signature == signature[:32]
        except Exception:
            return False


class GuoMiCrypto:
    """国密加密工具类"""
    
    def __init__(self, config: Optional[CryptoConfig] = None):
        self.config = config or CryptoConfig()
        self._session_keys: Dict[str, bytes] = {}
    
    def GenerateSessionKey(self, session_id: str) -> bytes:
        """生成会话密钥"""
        session_key = get_random_bytes(self.config.sm4_key_length)
        self._session_keys[session_id] = session_key
        return session_key
    
    def GetSessionKey(self, session_id: str) -> Optional[bytes]:
        """获取会话密钥"""
        return self._session_keys.get(session_id)
    
    def RemoveSessionKey(self, session_id: str) -> None:
        """移除会话密钥"""
        self._session_keys.pop(session_id, None)
    
    def EncryptPassword(self, password: str) -> str:
        """
        加密密码
        使用SM3哈希+盐值
        """
        salt = secrets.token_hex(16)
        password_bytes = password.encode('utf-8')
        salted_password = salt.encode() + password_bytes
        hashed = SM3Hash.Hash(salted_password)
        return f"{salt}:{base64.b64encode(hashed).decode()}"
    
    def VerifyPassword(self, password: str, encrypted_password: str) -> bool:
        """
        验证密码
        """
        try:
            salt, hashed_b64 = encrypted_password.split(':', 1)
            password_bytes = password.encode('utf-8')
            salted_password = salt.encode() + password_bytes
            expected_hash = SM3Hash.Hash(salted_password)
            stored_hash = base64.b64decode(hashed_b64)
            return expected_hash == stored_hash
        except Exception:
            return False
    
    def EncryptData(self, data: str, session_id: str) -> Optional[str]:
        """
        使用SM4加密数据
        """
        session_key = self.GetSessionKey(session_id)
        if not session_key:
            return None
        
        try:
            cipher = SM4Cipher(session_key)
            data_bytes = data.encode('utf-8')
            encrypted = cipher.Encrypt(data_bytes)
            return base64.b64encode(encrypted).decode()
        except Exception:
            return None
    
    def DecryptData(self, encrypted_data: str, session_id: str) -> Optional[str]:
        """
        使用SM4解密数据
        """
        session_key = self.GetSessionKey(session_id)
        if not session_key:
            return None
        
        try:
            cipher = SM4Cipher(session_key)
            encrypted_bytes = base64.b64decode(encrypted_data)
            decrypted = cipher.Decrypt(encrypted_bytes)
            return decrypted.decode('utf-8')
        except Exception:
            return None
    
    def CreateDigitalSignature(self, message: str, private_key: bytes) -> str:
        """
        创建数字签名
        """
        message_bytes = message.encode('utf-8')
        signature = SM2Crypto.Sign(private_key, message_bytes)
        return base64.b64encode(signature).decode()
    
    def VerifyDigitalSignature(self, message: str, signature: str, public_key: bytes) -> bool:
        """
        验证数字签名
        """
        try:
            message_bytes = message.encode('utf-8')
            signature_bytes = base64.b64decode(signature)
            return SM2Crypto.Verify(public_key, message_bytes, signature_bytes)
        except Exception:
            return False


# 全局实例
guomi_crypto = GuoMiCrypto()


def GenerateSecureToken(length: int = 32) -> str:
    """生成安全令牌"""
    return secrets.token_urlsafe(length)


def HashUserCredentials(username: str, password: str) -> str:
    """
    对用户凭据进行哈希处理
    """
    credentials = f"{username}:{password}"
    return guomi_crypto.EncryptPassword(credentials)


def VerifyUserCredentials(username: str, password: str, stored_hash: str) -> bool:
    """
    验证用户凭据
    """
    credentials = f"{username}:{password}"
    return guomi_crypto.VerifyPassword(credentials, stored_hash) 