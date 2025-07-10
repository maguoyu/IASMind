"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Users, 
  User, 
  Shield, 
  Database, 
  Bell,
  Palette,
  Globe,
  Info,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Separator } from '~/components/ui/separator';
import { Layout } from '~/components/layout';
import { useAuthStore } from '~/core/store/auth-store';
import { authApi } from '~/core/api/auth';
import { useSettingsStore, changeSettings, saveSettings } from '~/core/store';
import { GeneralTab } from '../settings/tabs/general-tab';
import { MCPTab } from '../settings/tabs/mcp-tab';
import { AboutTab } from '../settings/tabs/about-tab';

interface SystemModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}

export default function SystemManagementPage() {
  const { user, accessToken, logout, isAuthenticated } = useAuthStore();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const settings = useSettingsStore();
  const [settingsChanges, setSettingsChanges] = useState({});

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      if (accessToken) {
        await authApi.logout({ refresh_token: accessToken }, accessToken);
      }
      logout();
      toast.success('已成功登出');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      toast.success('已成功登出');
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsChange = useCallback((newChanges: any) => {
    setSettingsChanges((prev) => ({
      ...prev,
      ...newChanges,
    }));
  }, []);

  const handleSaveSettings = useCallback(() => {
    if (Object.keys(settingsChanges).length > 0) {
      const newSettings = {
        ...settings,
        ...settingsChanges,
      };
      changeSettings(newSettings);
      saveSettings();
      setSettingsChanges({});
      toast.success('设置已保存');
    }
  }, [settings, settingsChanges]);

  const systemModules: SystemModule[] = useMemo(() => [
    // 移除个人资料模块
    {
      id: 'users',
      title: '用户管理',
      description: '管理系统用户、角色权限、账户状态',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
      href: '/auth/users',
      disabled: user?.role !== 'admin',
      badge: user?.role === 'admin' ? '管理员' : undefined
    },
    {
      id: 'general',
      title: '通用设置',
      description: '主题、语言、通知等基础设置',
      icon: <Settings className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
      onClick: () => setActiveModule('general')
    },
    {
      id: 'mcp',
      title: 'MCP 配置',
      description: 'Model Context Protocol 服务器配置',
      icon: <Database className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      onClick: () => setActiveModule('mcp')
    },
    {
      id: 'about',
      title: '关于系统',
      description: '系统版本、许可证、更新信息',
      icon: <Info className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-gray-500 to-slate-600',
      onClick: () => setActiveModule('about')
    }
  ], [user?.role]);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getRoleText = (role: string) => {
    const roleMap = {
      'admin': '管理员',
      'user': '用户',
      'guest': '访客'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap = {
      'admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'user': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'guest': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          欢迎，{user.username}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          在这里管理您的个人设置和系统配置
        </p>
      </div>

      {/* System Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {systemModules.map((module) => (
          <Card 
            key={module.id}
            className={`h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm ${
              module.disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => {
              if (!module.disabled) {
                if (module.href) {
                  router.push(module.href);
                } else if (module.onClick) {
                  module.onClick();
                }
              }
            }}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center text-white`}>
                  {module.icon}
                </div>
                {module.badge && (
                  <Badge variant="outline" className="text-xs">
                    {module.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {module.title}
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                {module.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {module.disabled ? '权限不足' : '点击进入'}
                </span>
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings Panel */}
      {activeModule && (
        <Card className="border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">
                  {systemModules.find(m => m.id === activeModule)?.title}
                </CardTitle>
                <CardDescription>
                  {systemModules.find(m => m.id === activeModule)?.description}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveModule(null)}
                >
                  关闭
                </Button>
                {activeModule !== 'about' && (
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={Object.keys(settingsChanges).length === 0}
                  >
                    保存设置
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              {activeModule === 'general' && (
                <GeneralTab 
                  settings={{ ...settings, ...settingsChanges }}
                  onChange={handleSettingsChange}
                />
              )}
              {activeModule === 'mcp' && (
                <MCPTab 
                  settings={{ ...settings, ...settingsChanges }}
                  onChange={handleSettingsChange}
                />
              )}
              {activeModule === 'about' && (
                <AboutTab 
                  settings={{ ...settings, ...settingsChanges }}
                  onChange={handleSettingsChange}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
} 