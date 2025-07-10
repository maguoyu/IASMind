"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  AlertCircle,
  User,
  Lock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

import type { LoginRequest } from '~/core/api/auth';
import { authApi } from '~/core/api/auth';
import { useAuthStore } from '~/core/store/auth-store';

interface CaptchaInfo {
  captcha_id: string;
  captcha_image: string;
  expires_in: number;
}

export default function LoginPage() {
  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 获取重定向参数
  const redirectUri = searchParams?.get('redirect_uri') ?? '/';
  const state = searchParams?.get('state');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    captcha: '',
    remember_me: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInfo, setCaptchaInfo] = useState<CaptchaInfo | null>(null);
  const [loginError, setLoginError] = useState<string>('');
  
  // 加载验证码
  const loadCaptcha = async () => {
    try {
      const data = await authApi.getCaptcha();
      setCaptchaInfo(data);
    } catch (error) {
      console.error('加载验证码失败:', error);
      toast.error('验证码加载失败');
    }
  };
  
  // 组件加载时获取验证码
  useEffect(() => {
    loadCaptcha();
  }, []);
  
  // 处理表单输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 清除错误信息
    if (loginError) {
      setLoginError('');
    }
  };
  
  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setLoginError('请填写用户名和密码');
      return;
    }
    
    try {
      const loginRequest: LoginRequest = {
        username: formData.username,
        password: formData.password,
        captcha: formData.captcha,
        remember_me: formData.remember_me
      };
      
      const success = await login(loginRequest);
      
      if (success) {
        // 登录成功，重定向
        if (state) {
          router.push(`${redirectUri}?state=${state}`);
        } else {
          router.push(redirectUri);
        }
      } else {
        setLoginError('登录失败，请重试');
        loadCaptcha(); // 重新加载验证码
      }
    } catch (error: any) {
      setLoginError(error.message || '登录失败，请重试');
      loadCaptcha(); // 重新加载验证码
    }
  };
  
  // 测试登录
  const handleTestLogin = async (username: string, password: string) => {
    setFormData({ ...formData, username, password });
    
    try {
      const loginRequest: LoginRequest = {
        username,
        password,
        captcha: formData.captcha,
        remember_me: formData.remember_me
      };
      
      const success = await login(loginRequest);
      
      if (success) {
        router.push(redirectUri);
      } else {
        setLoginError('登录失败，请重试');
      }
    } catch (error: any) {
      setLoginError(error.message || '登录失败，请重试');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 应用Logo和标题 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🧠 IAS_Mind
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            登录到您的账户
          </p>
        </div>

        {/* 登录表单 */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">登录</CardTitle>
            <CardDescription className="text-center">
              输入您的凭据以访问系统
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 错误信息 */}
            {(loginError || error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {loginError || error}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              {/* 用户名 */}
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
              
              {/* 密码 */}
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              {/* 验证码 */}
              {captchaInfo && (
                <div className="space-y-2">
                  <Label htmlFor="captcha">验证码</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="captcha"
                      name="captcha"
                      type="text"
                      placeholder="请输入验证码"
                      value={formData.captcha}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="h-11"
                    />
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      className="flex-shrink-0 border rounded-md overflow-hidden hover:opacity-80"
                    >
                      <img
                        src={captchaInfo.captcha_image}
                        alt="验证码"
                        className="w-24 h-11 object-cover"
                      />
                    </button>
                  </div>
                </div>
              )}
              
              {/* 记住我 */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember_me"
                  name="remember_me"
                  checked={formData.remember_me}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, remember_me: checked as boolean }))
                  }
                />
                <Label htmlFor="remember_me" className="text-sm">
                  记住我
                </Label>
              </div>
              
              {/* 登录按钮 */}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* 测试用户信息 */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              测试账户
            </CardTitle>
            <CardDescription>
              点击下方按钮使用测试账户快速登录
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm">admin / admin123</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestLogin('admin', 'admin123')}
                  disabled={isLoading}
                >
                  登录
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm">testuser / user123</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestLogin('testuser', 'user123')}
                  disabled={isLoading}
                >
                  登录
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm">guest / guest123</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestLogin('guest', 'guest123')}
                  disabled={isLoading}
                >
                  登录
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 页脚 */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 IAS_Mind. 采用国密加密技术保护您的数据安全</p>
        </div>
      </div>
    </div>
  );
} 